const User = require('../models/user-model');
const Product = require('../models/product-models/product-model');
const Box = require('../models/product-models/box-model');
const Order = require('../models/shopping-models/order-model');
const Payment = require('../models/shopping-models/payment-model');
const { catchAsync } = require('../utils/catch-async');
const getAdminDashboard = catchAsync(async (req, res) => {
    const [users, products, boxes, orders, reviews, sales, lowStock] = await Promise.all([User.countDocuments(), Product.countDocuments(), Box.countDocuments(), Order.countDocuments(), Payment.countDocuments({ requiresReview: true, reviewStatus: 'pending' }), Order.aggregate([{ $match: { paymentStatus: 'paid', status: { $in: ['confirmed', 'shipped', 'delivered'] } } }, { $group: { _id: null, total: { $sum: '$totalAmount' } } }]), Product.find({ isActive: true, stock: { $lte: 3 } }).select('name sku stock').limit(10)]);
    res.json({ status: 'success', data: { dashboard: {
                users, products, boxes, orders, paymentReviews: reviews, salesToman: sales[0]?.total || 0, lowStock
            } } });
});
module.exports = { getAdminDashboard };
