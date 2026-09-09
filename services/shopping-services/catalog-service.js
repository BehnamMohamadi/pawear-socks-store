const Product = require('../../models/product-models/product-model');
const {selectSize}=require('./size-service');
const {quoteShipping}=require('./shipping-service');
const Box = require('../../models/product-models/box-model');
const { AppError } = require('../../utils/app-error');
const querySession = (query, session) => session ? query.session(session) : query;
const getSellable = async (type, id, session = null, size = null) => {
    if (type === 'Product') {
        const p = await querySession(Product.findById(id), session);
        if (!p || !p.isActive)
            throw new AppError(400, 'محصول موجود یا فعال نیست.', null, 'PRODUCT_UNAVAILABLE');
        const selected=selectSize(p,size);
        return {
            ...selected, record: p, pairCount: 1, components: [{
                    product: p._id, size:selected.size, quantity: 1, name: p.name, sku: p.sku, unitPrice: selected.price
                }], discount: 0
        };
    }
    if (type !== 'Box')
        throw new AppError(400, 'نوع کالا معتبر نیست.');
    const box = await querySession(Box.findById(id), session);
    if (!box || !box.isActive)
        throw new AppError(400, 'باکس موجود یا فعال نیست.', null, 'BOX_UNAVAILABLE');
    const products = await querySession(Product.find({ _id: { $in: box.products.map(i => i.product) } }), session);
    let total = 0, stock = Infinity, pairs = 0;
    const components = [];
    for (const i of box.products) {
        const p = products.find(p => String(p._id) === String(i.product));
        if (!p || !p.isActive)
            throw new AppError(400, 'یکی از محصولات باکس در دسترس نیست.', null, 'BOX_COMPONENT_UNAVAILABLE');
        const selected=selectSize(p,i.size);
        total += selected.price * i.quantity;
        pairs += i.quantity;
        stock = Math.min(stock, Math.floor(selected.stock / i.quantity));
        components.push({
            product: p._id, size:selected.size, quantity: i.quantity, name: p.name, sku: p.sku, unitPrice: selected.price
        });
    }
    if (pairs < 2)
        throw new AppError(400, 'باکس باید حداقل دو جفت داشته باشد.');
    return {
        record: box, price: Math.max(1, Math.round(total * (100 - box.discount) / 100)), stock, pairCount: pairs, components, discount: box.discount, totalPrice: total
    };
};
const buildCartSnapshot = async (cart, session = null) => {
    if (!cart || !cart.items.length)
        throw new AppError(400, 'سبد خرید خالی است.', null, 'EMPTY_CART');
    const items = [], inventoryMap = new Map();
    let subtotal = 0, totalItems = 0, totalPairs = 0;
    for (const i of cart.items) {
        const s = await getSellable(i.itemType, i.item, session, i.size);
        const totalPrice = s.price * i.quantity;
        subtotal += totalPrice;
        totalItems += i.quantity;
        totalPairs += s.pairCount * i.quantity;
        items.push({
            itemType: i.itemType, item: i.item, productSnapshot: {
                size:s.size, name: s.record.name, slug: s.record.slug, sku: s.record.sku, coverImage: s.record.coverImage
            }, quantity: i.quantity, unitPrice: s.price, totalPrice, discount: s.discount, components: s.components
        });
        for (const c of s.components) {
            const key = String(c.product)+'|'+c.size;
            const previous = inventoryMap.get(key);
            inventoryMap.set(key, { product: c.product, size:c.size, quantity: (previous?.quantity || 0) + c.quantity * i.quantity });
        }
    }
    const inventory = [...inventoryMap.values()];
    for (const i of inventory) {
        const p = await querySession(Product.findById(i.product).select('stock name isActive sizes price'), session);
        const available=p?selectSize(p,i.size).stock:0;
        if (!p?.isActive || available < i.quantity)
            throw new AppError(409, 'موجودی مجموع جوراب‌های تکی و داخل باکس کافی نیست.', {
                productName: p?.name, availableStock: available, requestedQuantity: i.quantity
            }, 'INSUFFICIENT_STOCK');
    }
    const {shippingAmount,shippingPolicy}=await quoteShipping(items,session);
    return {
        items, inventory, subtotal, shippingAmount, shippingPolicy, totalAmount: subtotal + shippingAmount, totalItems, totalPairs, cartRevision: cart.revision, priceExpiresAt: new Date(Date.now() + 15 * 60 * 1000)
    };
};
module.exports = { getSellable, buildCartSnapshot };
