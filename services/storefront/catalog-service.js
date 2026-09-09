const Product = require('../../models/product-models/product-model');
const Box = require('../../models/product-models/box-model');
const { getSellable } = require('../shopping-services/catalog-service');
const present = (p, type = 'Product', sellable = {}) => ({ ...p, id: String(p._id), title: p.name, image: p.coverImage, type: type === 'Box' ? 'box' : 'single', itemType: type, price: sellable.price ?? p.price, stock: sellable.stock ?? p.stock, count: sellable.pairCount || 1, meta: type === 'Box' ? `${sellable.pairCount} جفت جوراب` : sellable.size ? 'سایز '+(sellable.size==='free-size'?'فری‌سایز':sellable.size) : p.sizes?.length ? p.sizes.filter(v=>v.isActive).map(v=>v.label).join(' · ') : 'فری‌سایز', badge: p.isFeatured ? 'منتخب پاور' : '', components: sellable.components || [], url: (type === 'Box' ? '/box/' : '/product/') + encodeURIComponent(p.slug) });
async function boxes(filter = {}) {
  const rows = await Box.find({ ...filter, isActive: true }).sort('-createdAt').lean();
  const result = [];
  for (const row of rows) {
    try { result.push(present(row, 'Box', await getSellable('Box', row._id))); }
    catch (e) { if (!e.isOperational) throw e; }
  }
  return result;
}
module.exports = { present, boxes, Product, Box };
