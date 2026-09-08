const router = require('express').Router();
const Product = require('../../models/product-models/product-model');
const { boxes } = require('../../services/storefront/catalog-service');
const xml = s => String(s).replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]);
router.get('/robots.txt', (req, res) => {
  const site = (process.env.SITE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
  res.type('text/plain').send(process.env.NODE_ENV !== 'production' ? 'User-agent: *\nDisallow: /\n' : `User-agent: *\nDisallow: /api/\nDisallow: /admin\nDisallow: /cart\nDisallow: /checkout\nDisallow: /account\nDisallow: /orders/\nDisallow: /wishlist\nSitemap: ${site}/sitemap.xml\n`);
});
router.get('/sitemap.xml', async (req, res) => {
  const site = (process.env.SITE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
  const products = await Product.find({ isActive: true }).select('slug updatedAt').lean();
  const items = ['/', '/shop', '/boxes', '/about', '/size-guide'].map(url => ({ url }));
  items.push(...products.map(p => ({ url: '/product/' + encodeURIComponent(p.slug), updatedAt: p.updatedAt })), ...(await boxes()).map(b => ({ url: b.url, updatedAt: b.updatedAt })));
  res.type('application/xml').send('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + items.map(i => `<url><loc>${xml(site + i.url)}</loc>${i.updatedAt ? '<lastmod>' + new Date(i.updatedAt).toISOString() + '</lastmod>' : ''}</url>`).join('') + '</urlset>');
});
module.exports = router;
