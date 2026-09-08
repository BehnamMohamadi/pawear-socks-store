process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-only-secret-PAWEAR-abcdefghijklmnopqrstuvwxyz';
process.env.SMS_PROVIDER = 'test';
process.env.PAYMENT_GATEWAY = 'mock';
process.env.PAYMENT_AMOUNT_MULTIPLIER = '10';
process.env.SHIPPING_AMOUNT_TOMAN = '30000';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { randomUUID } = require('node:crypto');
const app = require('../app');
const User = require('../models/user-model');
const Product = require('../models/product-models/product-model');
const Box = require('../models/product-models/box-model');
const Cart = require('../models/shopping-models/cart-model');
const Order = require('../models/shopping-models/order-model');
const Payment = require('../models/shopping-models/payment-model');
const Otp = require('../models/otp-model');
const Category = require('../models/product-models/category-model');
const SubCategory = require('../models/product-models/subCategory-model');
const Address = require('../models/address-model');
const { testOutbox } = require('../services/auth-services/sms-service');
const { authRateLimit } = require('../middleware/auth-rate-limit');
const { expireStalePayments } = require('../services/shopping-services/payment-service');
test('PAWEAR backend integration with isolated replica-set database', async (t) => {
    const dbName = 'pawear_test_' + randomUUID().replaceAll('-', '');
    const uri = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27028/?replicaSet=pawearDev';
    await mongoose.connect(uri, { dbName, serverSelectionTimeoutMS: 5000 });
    await Promise.all([User, Product, Box, Cart, Order, Payment, Otp, Category, SubCategory, Address].map(m => m.init()));
    const server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    const base = 'http://127.0.0.1:' + server.address().port;
    t.after(async () => { await new Promise(resolve => server.close(resolve)); if (mongoose.connection.name === dbName && dbName.startsWith('pawear_test_'))
        await mongoose.connection.dropDatabase(); await mongoose.disconnect(); });
    const request = async (path, method = 'GET', body, cookie, extra = {}) => { const r = await fetch(base + path, {
        method, headers: {
            'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...extra
        }, ...(body ? { body: JSON.stringify(body) } : {})
    }); return {
        status: r.status, data: r.status === 204 ? null : await r.json(), cookie: r.headers.get('set-cookie')?.split(';')[0]
    }; };
    const resetLimit = () => { authRateLimit.resetKey('127.0.0.1'); authRateLimit.resetKey('::ffff:127.0.0.1'); };
    let adminCookie, userCookie, secondCookie, userId, product, other, box, address, category, sub;
    await t.test('password registration, hashed response exclusion, role protection', async () => {
        const a = await request('/api/auth/register', 'POST', {
            firstname: 'بهنام', lastname: 'محمدی', phonenumber: '09120000001', password: 'Strong-test-pass'
        });
        assert.equal(a.status, 201);
        assert.equal(a.data.data.user.password, undefined);
        assert.equal(a.data.data.user.tokenVersion, undefined);
        adminCookie = a.cookie;
        await User.updateOne({ _id: a.data.data.user._id }, { $set: { role: 'admin' } });
        const u = await request('/api/auth/register', 'POST', {
            firstname: 'کاربر', lastname: 'آزمایشی', phonenumber: '09120000002', password: 'Strong-test-pass'
        });
        assert.equal(u.status, 201);
        userCookie = u.cookie;
        userId = u.data.data.user._id;
        const v = await request('/api/auth/register', 'POST', {
            firstname: 'مشتری', lastname: 'دومین', phonenumber: '09120000003', password: 'Strong-test-pass'
        });
        secondCookie = v.cookie;
        assert.equal((await request('/api/users', 'GET', null, userCookie)).status, 403);
        const injection = await request('/api/auth/register', 'POST', {
            firstname: 'کاربر', lastname: 'دیگری', phonenumber: '09120000009', password: 'Strong-test-pass', role: 'admin'
        });
        assert.equal(injection.status, 400);
    });
    await t.test('catalog, free size, admin-only boxes, prices and inactive filters', async () => {
        category = await Category.create({ name: 'جوراب', slug: 'socks' });
        sub = await SubCategory.create({
            name: 'روزمره', slug: 'daily', category: category._id
        });
        const create = async (name, price, stock) => request('/api/products', 'POST', {
            name, category: String(category._id), subCategory: String(sub._id), price, stock
        }, adminCookie);
        const a = await create('جوراب آبی', 100000, 20);
        assert.equal(a.status, 201);
        product = a.data.data.product;
        assert.equal(product.size, 'free-size');
        other = (await create('جوراب سفید', 150000, 30)).data.data.product;
        assert.equal((await request('/api/products', 'POST', {
            name: 'تست', category: String(category._id), subCategory: String(sub._id), price: -1
        }, adminCookie)).status, 400);
        const b = await request('/api/boxes', 'POST', {
            name: 'باکس سه جفتی', products: [{ product: product._id, quantity: 2 }, { product: other._id, quantity: 1 }], discount: 10
        }, adminCookie);
        assert.equal(b.status, 201);
        box = b.data.data.box;
        assert.equal(box.finalPrice, 315000);
        assert.equal(box.stock, 10);
        assert.equal(box.pairCount, 3);
        assert.equal((await request('/api/boxes', 'POST', { name: 'غیرمجاز', products: [{ product: product._id, quantity: 2 }] }, userCookie)).status, 403);
        assert.equal((await request('/api/boxes', 'POST', { name: 'یک جفت', products: [{ product: product._id, quantity: 1 }] }, adminCookie)).status, 400);
        const inactive = await Product.create({
            name: 'غیرفعال', category: category._id, subCategory: sub._id, price: 100000, isActive: false
        });
        const list = await request('/api/products?isActive=false');
        assert.equal(list.status, 200);
        assert.ok(list.data.data.products.every(p => p.isActive));
        assert.ok(!list.data.data.products.some(p => p._id === String(inactive._id)));
    });
    await t.test('mixed cart aggregates single and box consumption and rejects overselling', async () => {
        let r = await request('/api/cart', 'POST', {
            itemType: 'Product', item: product._id, quantity: 1
        }, userCookie);
        assert.equal(r.status, 200);
        r = await request('/api/cart', 'POST', {
            itemType: 'Box', item: box._id, quantity: 10
        }, userCookie);
        assert.equal(r.status, 409);
        r = await request('/api/cart', 'POST', {
            itemType: 'Box', item: box._id, quantity: 2
        }, userCookie);
        assert.equal(r.status, 200);
        const checkout = await request('/api/checkout', 'POST', {}, userCookie);
        assert.equal(checkout.data.data.checkout.totalAmount, 760000);
        assert.equal(checkout.data.data.checkout.totalPairs, 7);
        const removed = r.data.data.cart.items[0]._id;
        assert.equal((await request('/api/cart/' + removed, 'PATCH', { quantity: 2 }, secondCookie)).status, 404);
    });
    await t.test('order snapshots, ownership, reservation and duplicate payment', async () => {
        address = (await request('/api/addresses', 'POST', {
            title: 'خانه', recipientName: 'کاربر آزمایشی', recipientPhone: '09120000002', province: 'تهران', city: 'تهران', addressLine: 'خیابان آزمایشی، پلاک ۱', postalCode: '1234567890'
        }, userCookie)).data.data.address;
        const r = await request('/api/orders', 'POST', { addressId: address._id }, userCookie);
        assert.equal(r.status, 201);
        const order = r.data.data.order;
        assert.equal(order.totalAmount, 760000);
        assert.equal(order.items[1].components.length, 2);
        assert.equal((await request('/api/orders/' + order._id, 'GET', null, secondCookie)).status, 404);
        const pay = await request('/api/payments/order/' + order._id, 'POST', {}, userCookie);
        assert.equal(pay.status, 201);
        assert.equal((await Product.findById(product._id)).stock, 15);
        assert.equal((await Product.findById(other._id)).stock, 28);
        assert.equal((await request('/api/payments/order/' + order._id, 'POST', {}, userCookie)).status, 409);
        const path = pay.data.data.mockVerifyPath;
        const results = await Promise.all([request(path, 'POST', {}, userCookie), request(path, 'POST', {}, userCookie)]);
        for (const v of results)
            assert.equal(v.status, 200);
        assert.equal((await Product.findById(product._id)).stock, 15);
        assert.equal((await Order.findById(order._id)).status, 'confirmed');
        assert.equal((await request('/api/orders/'+order._id+'/received','POST',{},userCookie)).status,409);
        assert.equal((await request('/api/orders/admin/' + order._id, 'PATCH', { status: 'confirmed' }, adminCookie)).status, 400);
        assert.equal((await request('/api/orders/admin/' + order._id, 'PATCH', { status: 'delivered' }, adminCookie)).status, 409);
        assert.equal((await request('/api/orders/admin/' + order._id, 'PATCH', { status: 'shipped', trackingCode: 'TEST-TRACK' }, adminCookie)).status, 200);
        assert.equal((await request('/api/orders/admin/' + order._id, 'PATCH', { status: 'delivered' }, adminCookie)).status, 200);
        assert.equal((await request('/api/orders/'+order._id+'/received','POST',{},secondCookie)).status,409);
        const received=await request('/api/orders/'+order._id+'/received','POST',{},userCookie);
        assert.equal(received.status,200);
        assert.ok(received.data.data.order.shippedAt);
        assert.ok(received.data.data.order.deliveredAt);
        assert.ok(received.data.data.order.customerReceivedAt);
        const duplicate=await request('/api/orders/'+order._id+'/received','POST',{},userCookie);
        assert.equal(duplicate.data.data.order.customerReceivedAt,received.data.data.order.customerReceivedAt);
    });
    await t.test('cart edits and price changes require preparing a fresh order', async () => {
        await request('/api/cart', 'POST', {
            itemType: 'Product', item: product._id, quantity: 1
        }, userCookie);
        const order = (await request('/api/orders', 'POST', { addressId: address._id }, userCookie)).data.data.order;
        await Product.updateOne({ _id: product._id }, { $set: { price: 110000 } });
        assert.equal((await request('/api/payments/order/' + order._id, 'POST', {}, userCookie)).status, 409);
        await request('/api/orders', 'POST', { addressId: address._id }, userCookie);
        await request('/api/cart', 'POST', {
            itemType: 'Product', item: other._id, quantity: 1
        }, userCookie);
        assert.equal((await request('/api/payments/order/' + order._id, 'POST', {}, userCookie)).status, 409);
    });
    await t.test('expiration restores reservation exactly once and late payment requires review', async () => {
        const order = (await request('/api/orders', 'POST', { addressId: address._id }, userCookie)).data.data.order;
        const before = (await Product.findById(product._id)).stock;
        const pay = (await request('/api/payments/order/' + order._id, 'POST', {}, userCookie)).data.data;
        await Payment.updateOne({ _id: pay.payment._id }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
        await Promise.all([expireStalePayments(), expireStalePayments()]);
        assert.equal((await Product.findById(product._id)).stock, before);
        assert.equal((await Order.findById(order._id)).status, 'expired');
        assert.equal((await request(pay.mockVerifyPath, 'POST', {}, userCookie)).status, 200);
        assert.equal((await Order.findById(order._id)).status, 'review');
        assert.equal((await Product.findById(product._id)).stock, before);
        const path = '/api/payments/admin/' + pay.payment._id + '/review';
        const resolutions = await Promise.all([request(path, 'PATCH', { resolution: 'stock_supplied' }, adminCookie), request(path, 'PATCH', { resolution: 'stock_supplied' }, adminCookie)]);
        for (const r of resolutions)
            assert.equal(r.status, 200);
        assert.equal((await Product.findById(product._id)).stock, before - 1);
        assert.equal((await request(path, 'PATCH', { resolution: 'refunded', refundReference: 'MANUAL-TEST' }, adminCookie)).status, 409);
    });
    await t.test('OTP cooldown, wrong attempts, one-use verification, password setup and logout revocation', async () => {
        resetLimit();
        const phone = '09120000004';
        let r = await request('/api/auth/otp/request', 'POST', { phonenumber: phone });
        assert.equal(r.status, 200);
        assert.equal(r.data.data.code, undefined);
        assert.equal((await request('/api/auth/otp/request', 'POST', { phonenumber: phone })).status, 429);
        const code = testOutbox.get(phone);
        assert.ok(code);
        assert.equal((await request('/api/auth/otp/verify', 'POST', { phonenumber: phone, code: '000000' })).status, 400);
        r = await request('/api/auth/otp/verify', 'POST', {
            phonenumber: phone, code, firstname: 'کاربر', lastname: 'پیامکی'
        });
        assert.equal(r.status, 200);
        const cookie = r.cookie;
        const setupPage=await fetch(base+'/login/password',{headers:{Cookie:cookie},redirect:'manual'});
        assert.equal(setupPage.status,200);
        assert.ok(!(await setupPage.text()).includes('currentPassword'));
        assert.equal((await request('/api/auth/otp/verify', 'POST', { phonenumber: phone, code })).status, 400);
        r = await request('/api/auth/password', 'PUT', { password: 'New-password-123' }, cookie);
        assert.equal(r.status, 200);
        const newCookie = r.cookie;
        assert.equal((await request('/api/auth/password','PUT',{password:'Another-password-123'},newCookie)).status,403);
        assert.equal((await request('/api/account', 'GET', null, cookie)).status, 401);
        const login = await request('/api/auth/login', 'POST', { phonenumber: phone, password: 'New-password-123' });
        assert.equal(login.status, 200);
        assert.equal(login.data.data.user.password, undefined);
        await request('/api/auth/logout', 'POST', {}, newCookie);
        assert.equal((await request('/api/account', 'GET', null, login.cookie)).status, 401);
    });
    await t.test('OTP five-guess lockout and expiration enforced without TTL cleanup', async () => {
        resetLimit();
        const phone = '09120000005';
        await request('/api/auth/otp/request', 'POST', { phonenumber: phone });
        const code = testOutbox.get(phone);
        for (let i = 0; i < 5; i++)
            assert.equal((await request('/api/auth/otp/verify', 'POST', { phonenumber: phone, code: '000000' })).status, 400);
        assert.equal((await request('/api/auth/otp/verify', 'POST', {
            phonenumber: phone, code, firstname: 'کاربر', lastname: 'قفل‌شده'
        })).status, 400);
        resetLimit();
        const phone2 = '09120000006';
        await request('/api/auth/otp/request', 'POST', { phonenumber: phone2 });
        await Otp.updateOne({ phonenumber: phone2 }, { $set: { expiresAt: new Date(Date.now() - 1) } });
        assert.equal((await request('/api/auth/otp/verify', 'POST', {
            phonenumber: phone2, code: testOutbox.get(phone2), firstname: 'کاربر', lastname: 'منقضی'
        })).status, 400);
    });
    await t.test('last-unit concurrent buyers cannot both reserve stock', async () => {
        const limited = await Product.create({
            name: 'آخرین جفت', category: category._id, subCategory: sub._id, price: 90000, stock: 1
        });
        const address2 = await Address.create({
            user: (await User.findOne({ phonenumber: '09120000003' }))._id, title: 'خانه', recipientName: 'مشتری دومین', recipientPhone: '09120000003', province: 'تهران', city: 'تهران', addressLine: 'خیابان تست پلاک دو', postalCode: '1234567890', isDefault: true
        });
        await request('/api/cart', 'DELETE', null, userCookie);
        await request('/api/cart', 'DELETE', null, secondCookie);
        for (const cookie of [userCookie, secondCookie])
            assert.equal((await request('/api/cart', 'POST', {
                itemType: 'Product', item: String(limited._id), quantity: 1
            }, cookie)).status, 200);
        const one = (await request('/api/orders', 'POST', { addressId: address._id }, userCookie)).data.data.order;
        const two = (await request('/api/orders', 'POST', { addressId: String(address2._id) }, secondCookie)).data.data.order;
        const results = await Promise.all([request('/api/payments/order/' + one._id, 'POST', {}, userCookie), request('/api/payments/order/' + two._id, 'POST', {}, secondCookie)]);
        assert.deepEqual(results.map(r => r.status).sort(), [201, 409]);
        assert.equal((await Product.findById(limited._id)).stock, 0);
    });
    await t.test('box gallery uploads, retained-image validation and soft product deletion', async () => {
        const bytes = await require('sharp')({ create: {
                width: 16, height: 16, channels: 3, background: '#1745ff'
            } }).png().toBuffer();
        const body = new FormData();
        body.append('images', new Blob([bytes], { type: 'image/png' }), 'test.png');
        const r = await fetch(base + '/api/boxes/' + box._id + '/images', {
            method: 'POST', headers: { Cookie: adminCookie }, body
        });
        assert.equal(r.status, 200);
        const data = await r.json();
        const image = data.data.record.images[0];
        assert.ok(image.startsWith('/images/catalog/'));
        assert.equal((await request('/api/boxes/' + box._id + '/images', 'PUT', { images: ['/etc/passwd'] }, adminCookie)).status, 400);
        assert.equal((await request('/api/boxes/' + box._id + '/images', 'PUT', { images: [image], coverImage: image }, adminCookie)).status, 200);
        const pngName = require('node:path').basename(image);
        await require('node:fs/promises').unlink(require('node:path').join(__dirname, '../public/images/catalog', pngName));
        const unused = await Product.create({
            name: 'قابل حذف', category: category._id, subCategory: sub._id, price: 1000, stock: 1
        });
        assert.equal((await request('/api/products/' + unused._id, 'DELETE', null, adminCookie)).status, 204);
        assert.equal((await Product.findById(unused._id)).isActive, false);
    });
    await t.test('OTP concurrent replay grants one session only', async () => {
        resetLimit();
        const phonenumber = '09120000007';
        await request('/api/auth/otp/request', 'POST', { phonenumber });
        const body = {
            phonenumber, code: testOutbox.get(phonenumber), firstname: 'کاربر', lastname: 'همزمان'
        };
        const responses = await Promise.all([request('/api/auth/otp/verify', 'POST', body), request('/api/auth/otp/verify', 'POST', body)]);
        assert.deepEqual(responses.map(r => r.status).sort(), [200, 400]);
    });
    await t.test('parallel address changes preserve one default and do not promote unrelated addresses', async () => {
        const body = { title: 'جدید', recipientName: 'کاربر آزمایشی', recipientPhone: '09120000002', province: 'تهران', city: 'تهران', addressLine: 'نشانی آزمایشی دیگر', postalCode: '1234567890' };
        const created = await Promise.all([request('/api/addresses', 'POST', body, userCookie), request('/api/addresses', 'POST', body, userCookie)]);
        created.forEach(r => assert.equal(r.status, 201));
        let addresses = await Address.find({ user: userId });
        assert.equal(addresses.filter(a => a.isDefault).length, 1);
        assert.equal(String(addresses.find(a => a.isDefault)._id), address._id);
        const nonDefault = created[0].data.data.address._id;
        assert.equal((await request('/api/addresses/' + nonDefault, 'PATCH', { isDefault: false }, userCookie)).status, 200);
        addresses = await Address.find({ user: userId });
        assert.equal(addresses.filter(a => a.isDefault).length, 1);
        await Promise.all(created.map(r => request('/api/addresses/' + r.data.data.address._id + '/default', 'PATCH', {}, userCookie)));
        addresses = await Address.find({ user: userId });
        assert.equal(addresses.filter(a => a.isDefault).length, 1);
    });
    await t.test('SSR storefront, admin authorization and real catalog stay synchronized', async () => {
        const html = async (path, cookie) => { const response = await fetch(base + path, { headers: { Accept: 'text/html', ...(cookie ? { Cookie: cookie } : {}) }, redirect: 'manual' }); return { response, text: await response.text() }; };
        const publicPages = ['/', '/shop', '/boxes', '/about', '/contact', '/size-guide', '/shipping', '/terms', '/privacy', '/login', '/signup', '/admin/login'];
        for (const path of publicPages) {
            const r = await html(path); assert.equal(r.response.status, 200, path + ': ' + r.text.slice(0, 200));
            assert.match(r.text, /<html lang="fa" dir="rtl">/);
            assert.match(r.text, /rel="canonical"/);
            if (['/login','/signup','/admin/login'].includes(path)) {
                assert.ok(!r.text.includes('class="site-header"'));
                assert.ok(!r.text.includes('class="site-footer"'));
                assert.match(r.text,/id="authTabPassword"/);
                assert.match(r.text,/id="authTabOtp"/);
                assert.match(r.text,/autocomplete="one-time-code"/);
            }
        }
        assert.equal((await html('/admin')).response.status, 302);
        assert.equal((await html('/admin', userCookie)).response.status, 403);
        assert.equal((await html('/checkout')).response.status, 302);
        for (const path of ['/admin', ...['products','boxes','categories','subcategories','users','orders','payments','carts'].map(k=>'/admin/'+k), ...['products','boxes','categories','subcategories','users'].map(k=>'/admin/'+k+'/new'), '/admin/products/'+product._id+'/edit', '/admin/boxes/'+box._id+'/edit']) {
            const r = await html(path, adminCookie); assert.equal(r.response.status, 200, path + ': ' + r.text.slice(0, 300)); assert.match(r.text, /noindex/);
        }
        for (const path of ['/cart','/checkout','/account','/wishlist']) assert.equal((await html(path,userCookie)).response.status,200,path);
        assert.ok(!(await html('/account',userCookie)).text.includes('passwordForm'));
        assert.match((await html('/admin/orders',adminCookie)).text,/data-live-filter/);
        assert.match((await html('/admin/payments',adminCookie)).text,/ops-record/);
        const mine=await Order.findOne({user:userId});
        assert.equal((await html('/orders/'+mine._id,userCookie)).response.status,200);
        assert.equal((await html('/orders/'+mine._id,secondCookie)).response.status,404);
        const pay=await Payment.findOne();
        assert.equal((await html('/admin/orders/'+mine._id,adminCookie)).response.status,200);
        assert.equal((await html('/admin/payments/'+pay._id,adminCookie)).response.status,200);
        const cart=await Cart.findOne();
        assert.equal((await html('/admin/carts/'+cart._id,adminCookie)).response.status,200);
        const changed=await request('/api/products/'+product._id,'PATCH',{name:'جوراب هماهنگ پاور',price:123456,description:'توضیح واقعی محصول <script>alert(1)</script>'},adminCookie);
        assert.equal(changed.status,200);
        const slug=changed.data.data.product.slug;
        const p=await html('/product/'+encodeURIComponent(slug));
        assert.equal(p.response.status,200);assert.match(p.text,/جوراب هماهنگ پاور/);
        const match=p.text.match(/<script type="application\/ld\+json" nonce="([^"]+)">([\s\S]*?)<\/script>/);
        assert.ok(match);assert.ok(p.response.headers.get('content-security-policy').includes('nonce-'+match[1]));
        const ld=JSON.parse(match[2]);assert.equal(ld.offers.price,1234560);assert.equal(ld.offers.priceCurrency,'IRR');assert.ok(!match[2].includes('<script>'));
        assert.match(p.text,/&lt;script&gt;/);
        assert.equal((await html('/product/does-not-exist')).response.status,404);
        assert.equal((await html('/shop?page=9999')).response.status,404);
        assert.equal((await html('/missing-page')).response.status,404);
        const filtered=await html('/shop?q='+encodeURIComponent('جوراب هماهنگ'));
        assert.match(filtered.text,/جوراب هماهنگ پاور/);assert.match(filtered.text,/noindex,follow/);
        const sitemap=await html('/sitemap.xml');assert.equal(sitemap.response.status,200);assert.ok(sitemap.text.includes(encodeURIComponent(slug)));assert.ok(!sitemap.text.includes('/admin'));
        assert.match((await html('/robots.txt')).text,/Disallow: \//);
        for(const asset of ['/javascript/shared/api/api.js','/js/admin/pawear.js','/stylesheet/shared/integration/integration.css','/images/brand/logo-main.png']) assert.equal((await fetch(base+asset)).status,200,asset);
    });
    await t.test('checkout page JavaScript prepares the real order and starts its payment', async () => {
        await request('/api/cart','DELETE',null,userCookie);
        const fresh = await Product.create({name:'جوراب جریان فرانت',category:category._id,subCategory:sub._id,price:88000,stock:20});
        assert.equal((await request('/api/cart','POST',{itemType:'Product',item:String(fresh._id),quantity:2},userCookie)).status,200);
        const nodes = new Map();
        for (const id of ['#addressForm','#checkoutForm','#orderPreview','#orderSummary','#payOrder']) nodes.set(id,{hidden:true,handlers:{},addEventListener(event,handler){this.handlers[event]=handler;}});
        let started;
        const context = { document:{querySelector:id=>nodes.get(id)}, location:{reload(){}}, Pawear:{
            run:fn=>fn, formData:()=>({addressId:address._id}),
            request:async(path,method,body)=>{const r=await request(path,method,body,userCookie);assert.ok(r.status<300,JSON.stringify(r.data));return r.data;},
            startPayment:async id=>{const r=await request('/api/payments/order/'+id,'POST',{},userCookie);assert.equal(r.status,201);started=r.data.data.payment;}
        }};
        require('node:vm').runInNewContext(require('node:fs').readFileSync(require('node:path').join(__dirname,'../public/javascript/pages/checkout/checkout.js'),'utf8'),context);
        await nodes.get('#checkoutForm').handlers.submit({currentTarget:nodes.get('#checkoutForm')});
        assert.equal(nodes.get('#orderPreview').hidden,false);
        assert.match(nodes.get('#orderSummary').textContent,/تومان/);
        await nodes.get('#payOrder').handlers.click({});
        assert.ok(started?._id);
        assert.equal((await Product.findById(fresh._id)).stock,18);
        assert.equal((await request('/api/payments/mock/'+started._id+'/success','POST',{},userCookie)).status,200);
        const order=await Order.findById(started.order);assert.equal(order.status,'confirmed');assert.equal(order.totalAmount,206000);
    });
    await t.test('production disables mock completion and development SMS driver', async () => {
        const prior = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';
        try {
            await assert.rejects(() => require('../services/auth-services/sms-service').sendOtp('09120000008', '123456'), e => e.statusCode === 503);
            await assert.rejects(() => require('../services/shopping-services/payment-service').completeMockPayment({ paymentId: new mongoose.Types.ObjectId(), userId }), e => e.statusCode === 404);
        } finally { process.env.NODE_ENV = prior; }
    });
    await t.test('security: cross-origin writes, malformed JSON, password projection and last-admin account', async () => {
        assert.equal((await request('/api/cart', 'POST', {
            itemType: 'Product', item: product._id, quantity: 1
        }, userCookie, { Origin: 'https://untrusted.invalid' })).status, 403);
        const r = await fetch(base + '/api/auth/login', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{broken'
        });
        assert.equal(r.status, 400);
        assert.equal((await request('/api/users?fields=%2Bpassword', 'GET', null, adminCookie)).status, 400);
        assert.equal((await request('/api/account', 'DELETE', null, adminCookie)).status, 403);
    });
});
