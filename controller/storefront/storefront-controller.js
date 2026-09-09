const { Product, Box, present, boxes } = require('../../services/storefront/catalog-service');
const { getSellable } = require('../../services/shopping-services/catalog-service');
const Cart = require('../../models/shopping-models/cart-model');
const Wishlist = require('../../models/shopping-models/wishlist-model');
const Address = require('../../models/address-model');
const Order = require('../../models/shopping-models/order-model');
const Payment = require('../../models/shopping-models/payment-model');
const Category = require('../../models/product-models/category-model');
const { AppError } = require('../../utils/app-error');
const escapeRegex = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const seo = (res, path, description, noindex = false, jsonld = null) => { res.locals.seo = { canonical: res.locals.siteUrl + path, description, noindex: noindex || process.env.NODE_ENV !== 'production', jsonld }; };
exports.home = async (req, res) => {
  const products = (await Product.find({ isActive: true }).sort('-isFeatured -createdAt').limit(6).lean()).map(p => present(p));
  seo(res, '/', 'پاور؛ فروشگاه جوراب فری‌سایز و باکس‌های آماده جوراب. قدرت در قدم‌های کوچک است.');
  res.render('pages/home/home', { title: 'خرید جوراب و باکس جوراب | پاور PAWEAR', products });
};
exports.shop = async (req, res) => {
  const page = Math.min(100000, Math.max(1, parseInt(req.query.page, 10) || 1));
  const filter = { isActive: true };
  const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';
  if (q) filter.name = { $regex: escapeRegex(q), $options: 'i' };
  const genders = [req.query.gender].flat().filter(g => ['male', 'female', 'kids', 'unisex'].includes(g));
  if (genders.length) filter.gender = { $in: genders };
  if (/^[a-f0-9]{24}$/i.test(req.query.category || '')) filter.category = req.query.category;
  const sort = { newest: '-createdAt', cheap: 'price', expensive: '-price' }[req.query.sort] || '-createdAt';
  const [rows, total, categories] = await Promise.all([Product.find(filter).sort(sort).skip((page - 1) * 24).limit(24).lean(), Product.countDocuments(filter), Category.find({ isActive: true }).sort('sortOrder').lean()]);
  if (page > 1 && !rows.length) throw new AppError(404, 'صفحه پیدا نشد.');
  seo(res, '/shop' + (page > 1 ? '?page=' + page : ''), 'خرید جوراب تکی فری‌سایز از پاور؛ قیمت و موجودی به‌روز.', Object.keys(req.query).some(k => k !== 'page'));
  const pageUrl = n => '/shop?' + new URLSearchParams({ ...Object.fromEntries(Object.entries(req.query).filter(([, v]) => typeof v === 'string')), page: n }).toString();
  res.render('pages/shop/shop', { title: 'فروشگاه جوراب' + (page > 1 ? ' ـ صفحه ' + page : '') + ' | پاور', products: rows.map(p => present(p)), total, page, totalPages: Math.ceil(total / 24), categories, q, filters: req.query, pageUrl });
};
exports.boxes = async (req, res) => { seo(res, '/boxes', 'باکس‌های آماده دو جفتی و چندجفتی جوراب پاور؛ مشاهده ترکیب و قیمت.'); res.render('pages/box/box', { title: 'باکس‌های جوراب | پاور', boxes: await boxes() }); };
exports.product = type => async (req, res) => {
  const model = type === 'Box' ? Box : Product;
  const record = await model.findOne({ slug: req.params.slug, isActive: true }).lean();
  if (!record) throw new AppError(404, 'این کالا پیدا نشد.');
  let sellable;
  try { sellable = await getSellable(type, record._id); }
  catch (e) { if (!e.isOperational) throw e; throw new AppError(404, 'این کالا فعلاً عرضه نمی‌شود.'); }
  const product = present(record, type, sellable);
  const description = record.description || `${record.name}، ${product.meta} از فروشگاه پاور.`;
  const jsonld = { '@context': 'https://schema.org', '@type': 'Product', name: record.name, sku: record.sku, description, image: new URL(record.coverImage, res.locals.siteUrl).href, brand: { '@type': 'Brand', name: record.brand || 'PAWEAR' }, offers: { '@type': 'Offer', url: res.locals.siteUrl + product.url, priceCurrency: 'IRR', price: product.price * 10, availability: 'https://schema.org/' + (product.stock > 0 ? 'InStock' : 'OutOfStock'), itemCondition: 'https://schema.org/NewCondition' } };
  seo(res, product.url, description.slice(0, 170), false, jsonld);
  res.render('pages/product/product', { title: record.name + ' | پاور', product });
};
exports.cart = async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id }).lean();
  const cartItems = [];
  for (const i of cart?.items || []) {
    try { const s = await getSellable(i.itemType, i.item); cartItems.push({ ...present(s.record.toObject(), i.itemType, s), rowId: i._id, qty: i.quantity, available: s.stock >= i.quantity }); }
    catch (e) { if (!e.isOperational) throw e; cartItems.push({ rowId: i._id, title: 'کالای غیرفعال؛ لطفاً حذف کنید', image: '/images/product-placeholder.svg', qty: i.quantity, price: 0, meta: '', available: false }); }
  }
  res.render('pages/cart/cart', { title: 'سبد خرید | پاور', cartItems, subtotal: cartItems.reduce((n, i) => n + i.qty * i.price, 0) });
};
exports.wishlist = async (req, res) => {
  const wishlist = await Wishlist.findOne({ user: req.user._id }).populate('items.product').lean();
  res.render('pages/wishlist/wishlist', { title: 'علاقه‌مندی‌ها | پاور', products: (wishlist?.items || []).map(i=>i.product).filter(p => p?.isActive).map(p => present(p)) });
};
exports.checkout = async (req, res) => res.render('pages/checkout/checkout', { title: 'تکمیل سفارش | پاور', addresses: await Address.find({ user: req.user._id }).sort('-isDefault').lean() });
exports.account = async (req, res) => res.render('pages/account/account', { title: 'حساب من | پاور', orders: await Order.find({ user: req.user._id }).sort('-createdAt').limit(50).lean() });
exports.order = async (req, res) => {
  if (!/^[a-f0-9]{24}$/i.test(req.params.id)) throw new AppError(404, 'سفارش پیدا نشد.');
  const order = await Order.findOne({ _id: req.params.id, user: req.user._id }).lean();
  if (!order) throw new AppError(404, 'سفارش پیدا نشد.');
  const payment = await Payment.findOne({ order: order._id }).sort('-createdAt').lean();
  res.render('pages/order/order', { title: 'سفارش ' + order.orderNumber, order, payment, mock: process.env.NODE_ENV !== 'production' && payment?.gateway === 'mock' });
};
exports.auth = mode => (req, res) => { if (req.user && req.path !== '/admin/login' && req.query.method !== 'otp') return res.redirect('/account'); res.render('pages/auth/login', { title: mode === 'signup' ? 'ثبت‌نام | پاور' : 'ورود | پاور', mode }); };
exports.info = (title, content) => (req, res) => { seo(res, req.path, content.slice(0, 170), ['shipping', 'terms', 'privacy'].some(s => req.path.endsWith(s))); res.render(req.path === '/about' ? 'pages/about/about' : req.path === '/contact' ? 'pages/contact/contact' : 'pages/info/info', { title: title + ' | پاور', heading: title, content }); };
