const mongoose = require('mongoose');
const Cart = require('../../models/shopping-models/cart-model');
const { getSellable, buildCartSnapshot } = require('../../services/shopping-services/catalog-service');
const { AppError } = require('../../utils/app-error');
const { catchAsync } = require('../../utils/catch-async');
const present = async (cart) => { const data = cart ? cart.toObject() : { items: [], revision: 0 }; for (const i of data.items) {
    try {
        const s = await getSellable(i.itemType, i.item);
        i.product = {
            ...s.record.toObject(), price: s.price, stock: s.stock, pairCount: s.pairCount
        };
        i.unitPrice = s.price;
        i.totalPrice = s.price * i.quantity;
        i.available = s.stock >= i.quantity;
    }
    catch (e) {
        if (!e.isOperational)
            throw e;
        i.available = false;
        i.product = null;
    }
} return data; };
const mutate = async (userId, fn) => mongoose.connection.transaction(async (session) => { let cart = await Cart.findOne({ user: userId }).session(session); if (!cart)
    cart = new Cart({ user: userId }); await fn(cart, session); cart.revision += 1; await cart.save({ session }); return cart; });
const getCart = catchAsync(async (req, res) => res.json({ status: 'success', data: { cart: await present(await Cart.findOne({ user: req.user._id })) } }));
const addCartItem = catchAsync(async (req, res) => { const cart = await mutate(req.user._id, async (cart, session) => { const { itemType, item, quantity } = req.body; const old = cart.items.find(i => i.itemType === itemType && String(i.item).toLowerCase() === item.toLowerCase()); if (old) {
    old.quantity += quantity;
}
else {
    if (cart.items.length >= 100)
        throw new AppError(400, 'حداکثر ۱۰۰ ردیف در سبد مجاز است.');
    cart.items.push({
        itemType, item, quantity
    });
} await buildCartSnapshot(cart, session); }); res.json({ status: 'success', data: { cart: await present(cart) } }); });
const updateCartItem = catchAsync(async (req, res) => { const cart = await mutate(req.user._id, async (cart, session) => { const i = cart.items.id(req.params.itemId); if (!i)
    throw new AppError(404, 'ردیف سبد پیدا نشد.'); i.quantity = req.body.quantity; await buildCartSnapshot(cart, session); }); res.json({ status: 'success', data: { cart: await present(cart) } }); });
const deleteCartItem = catchAsync(async (req, res) => { const cart = await mutate(req.user._id, cart => { const i = cart.items.id(req.params.itemId); if (!i)
    throw new AppError(404, 'ردیف سبد پیدا نشد.'); i.deleteOne(); }); res.json({ status: 'success', data: { cart: await present(cart) } }); });
const clearCart = catchAsync(async (req, res) => { const cart = await mutate(req.user._id, cart => { cart.items = []; }); res.json({ status: 'success', data: { cart: await present(cart) } }); });
const getAllCarts = catchAsync(async (req, res) => { const page = Math.max(1, Number(req.query.page) || 1); const carts = await Cart.find().populate('user', 'firstname lastname phonenumber').sort('-updatedAt').skip((page - 1) * 20).limit(20); res.json({
    status: 'success', data: { carts }, page
}); });
module.exports = {
    getCart, addCartItem, updateCartItem, deleteCartItem, clearCart, getAllCarts
};
