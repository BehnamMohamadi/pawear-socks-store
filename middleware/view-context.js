const crypto = require('node:crypto');
const User = require('../models/user-model');
const Cart = require('../models/shopping-models/cart-model');
const { verifyAccessToken } = require('../utils/jwt');
exports.viewContext = async (req, res, next) => {
  try {
    res.locals.user = null;
    res.locals.cartCount = 0;
    res.locals.wishlistIds = [];
    res.locals.designPreview = require('../services/storefront/design-preview');
    res.locals.money = n => Number(n || 0).toLocaleString('fa-IR') + ' تومان';
    res.locals.date = d => d ? new Date(d).toLocaleString('fa-IR') : '—';
    res.locals.statusLabel = require('../utils/status-labels');
    res.locals.siteUrl = (process.env.SITE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
    res.locals.seo = { description: 'خرید جوراب فری‌سایز تکی و باکس‌های آماده از فروشگاه فارسی پاور.', canonical: res.locals.siteUrl + req.path, noindex: true, jsonld: null };
    res.locals.shippingAmount = Number(process.env.SHIPPING_AMOUNT_TOMAN || 0);
    if (req.cookies?.accessToken) {
      let payload;
      try { payload = verifyAccessToken(req.cookies.accessToken); } catch { /* anonymous */ }
      if (payload) {
        const user = await User.findById(payload.sub).select('+tokenVersion');
        if (user?.accountStatus.status === 'active' && payload.ver === (user.tokenVersion || 0)) {
          req.user = user; req.auth = payload; res.locals.user = user;
          const wishlist = await require('../models/shopping-models/wishlist-model').findOne({user:user._id}).select('items.product').lean();
          res.locals.wishlistIds = (wishlist?.items||[]).map(i=>String(i.product));
          const cart = await Cart.findOne({ user: user._id }).select('items.quantity').lean();
          res.locals.cartCount = cart?.items.reduce((n, i) => n + i.quantity, 0) || 0;
        }
      }
    }
    res.set('Cache-Control', 'private, no-store');
    next();
  } catch (error) { next(error); }
};
exports.nonce = (req, res, next) => { res.locals.nonce = crypto.randomBytes(18).toString('base64'); next(); };
exports.requireViewUser = (req, res, next) => req.user ? next() : res.redirect('/login?next=' + encodeURIComponent(req.originalUrl));
