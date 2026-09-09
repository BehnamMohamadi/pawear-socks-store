const Box = require('../../models/product-models/box-model');
const Product = require('../../models/product-models/product-model');
const { getSellable } = require('../../services/shopping-services/catalog-service');
const { catchAsync } = require('../../utils/catch-async');
const { AppError } = require('../../utils/app-error');
const { ApiFeatures } = require('../../utils/api-features');
const validateProducts = async (items) => { const found = await Product.countDocuments({ _id: { $in: items.map(i => i.product) }, isActive: true }); if (found !== new Set(items.map(i=>String(i.product))).size)
    throw new AppError(400, 'محصولات باکس باید موجود و فعال باشند.'); for(const i of items){const s=await getSellable('Product',i.product,null,i.size);i.size=s.size;} };
const present = async (box) => { try {
    const s = await getSellable('Box', box._id);
    return {
        ...box.toObject(), totalPrice: s.totalPrice, finalPrice: s.price, stock: s.stock, pairCount: s.pairCount
    };
}
catch (e) {
    if (!e.isOperational)
        throw e;
    return {
        ...box.toObject(), totalPrice: null, finalPrice: null, stock: 0, unavailableReason: e.errorCode
    };
} };
const list = admin => catchAsync(async (req, res) => { const base = admin ? {} : { isActive: true }; const f = new ApiFeatures(Box.find(base), req.query).filter().sort().paginate(); const boxes = await f.query; res.json({
    status: 'success', data: { boxes: await Promise.all(boxes.map(present)) }, pagination: {
        page: f.page, limit: f.limit, total: await Box.countDocuments({ ...f.filterObject, ...base })
    }
}); });
const get = admin => catchAsync(async (req, res) => { const box = await Box.findOne({ ...(!admin ? { isActive: true } : {}), ...(req.params.slug ? { slug: req.params.slug } : { _id: req.params.boxId }) }); if (!box)
    throw new AppError(404, 'باکس پیدا نشد.'); res.json({ status: 'success', data: { box: await present(box) } }); });
const create = catchAsync(async (req, res) => { await validateProducts(req.body.products); const box = await Box.create(req.body); res.status(201).json({ status: 'success', data: { box: await present(box) } }); });
const edit = catchAsync(async (req, res) => { const box = await Box.findById(req.params.boxId); if (!box)
    throw new AppError(404, 'باکس پیدا نشد.'); if (req.body.products)
    await validateProducts(req.body.products); Object.assign(box, req.body); await box.save(); res.json({ status: 'success', data: { box: await present(box) } }); });
const remove = catchAsync(async (req, res) => { const box = await Box.findByIdAndUpdate(req.params.boxId, { $set: { isActive: false } }, { returnDocument: 'after' }); if (!box)
    throw new AppError(404, 'باکس پیدا نشد.'); res.status(204).send(); });
module.exports = {
    list, get, create, edit, remove
};
