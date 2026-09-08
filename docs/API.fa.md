# راهنمای API پاور

آدرس پایه توسعه: `http://127.0.0.1:3000/api`. بدنه درخواست‌ها JSON است، مگر آپلود تصویر که multipart/form-data است. در Postman ذخیره Cookie را روشن نگه دار؛ در مرورگر `credentials: "include"` لازم است.

پاسخ معمول: `{ "status": "success", "data": {...} }`. خطا شامل status، message و در موارد کسب‌وکار code است. وضعیت 400 ورودی نامعتبر، 401 نیاز به ورود، 403 عدم دسترسی، 404 نبود منبع، 409 تعارض موجودی/وضعیت، 429 محدودیت درخواست و 503 سرویس پیکربندی‌نشده است.

## احراز هویت

| روش | مسیر | بدنه / کاربرد |
|---|---|---|
| POST | /auth/register | firstname, lastname, phonenumber, password و email اختیاری؛ ثبت‌نام با رمز |
| POST | /auth/login | phonenumber, password |
| POST | /auth/otp/request | phonenumber |
| POST | /auth/otp/verify | phonenumber, code؛ برای کاربر تازه firstname و lastname هم لازم است |
| PUT | /auth/password | فقط password جدید؛ ورود با OTP در ۱۰ دقیقه اخیر الزامی است. رمز قبلی دریافت نمی‌شود. |
| POST | /auth/logout | خروج از همه نشست‌ها؛ نیاز به ورود |
| GET | /account | حساب فعلی |
| PATCH | /account | firstname, lastname, email؛ شماره از این مسیر تغییر نمی‌کند |
| DELETE | /account | غیرفعال‌سازی حساب مشتری؛ برای ادمین مسدود است |

نمونه درخواست کد:

```json
{"phonenumber":"09121234567"}
```

پاسخ فقط زمان‌ها را برمی‌گرداند: expiresIn=120 و retryAfter=60. در محیط توسعه کد را از ترمینال بخوان.

تأیید و ثبت‌نام کاربر تازه:

```json
{"phonenumber":"09121234567","code":"کد شش‌رقمی ترمینال","firstname":"بهنام","lastname":"محمدی"}
```

code باید دقیقاً شش رقم انگلیسی باشد. شماره با ارقام فارسی یا پیش‌شماره +98 نیز هنگام احراز هویت عادی‌سازی می‌شود. اگر کد درست باشد اما نام کاربر تازه نیامده باشد، code=PROFILE_REQUIRED می‌گیری و می‌توانی همان کد را همراه مشخصات دوباره بفرستی؛ هر ارسال یک تلاش حساب می‌شود.

پس از ورود با OTP:

```json
{"password":"a-strong-private-password"}
```

این بدنه را به PUT /auth/password بفرست. سپس حتی بدون پیامک با شماره و رمز وارد می‌شوی. تغییر رمز، Cookie تازه می‌دهد؛ Cookie قبلی دیگر معتبر نیست.

کد OTP خام در MongoDB ذخیره نمی‌شود؛ digest با HMAC و challenge تصادفی ذخیره می‌شود. مصرف کد اتمیک است. محدودیت مشترک مسیرهای ورود: ۱۰ درخواست در ۱۵ دقیقه برای هر IP.

## محصول

خواندن عمومی:
- GET /products، GET /products/id/:productId، GET /products/slug/:slug
- GET /categories و /categories/id/:categoryId و /categories/slug/:slug
- GET /subCategories و /subCategories/id/:subCategoryId

عملیات مدیر:
- GET /products/all و GET /products/admin/:productId
- POST /products، PATCH /products/:productId، DELETE /products/:productId
- دسته و زیردسته: POST روی مسیر اصلی، PATCH/DELETE روی /:id و GET /all برای فهرست مدیریتی.

ساخت محصول:

```json
{
  "name":"جوراب روزمره آبی",
  "category":"شناسه دسته",
  "subCategory":"شناسه زیردسته همان دسته",
  "gender":"unisex",
  "brand":"PAWEAR",
  "price":120000,
  "stock":40,
  "description":"توضیح واقعی محصول",
  "details":[{"title":"جنس","value":"ترکیب واقعی الیاف"}],
  "isActive":true
}
```

sku و slug اختیاری‌اند. size همیشه free-size است. price و stock عدد صحیح‌اند. stock موجودی **قابل‌فروش** است و رزروهای فعال قبلاً از آن کم شده‌اند؛ هنگام اصلاح موجودی در پنل، همین معنا را حفظ کن.

تصویر محصول: PATCH /products/edit-cover/:id با فیلد coverImage؛ DELETE /products/delete-cover/:id برای بازگشت به پیش‌فرض؛ POST /products/images/upload/:id با images؛ PUT /products/images/:id برای جایگزینی کامل گالری. حداکثر ۱۰ تصویر و هر فایل حداکثر ۵ مگابایت.

## باکس ثابت

| روش | مسیر | دسترسی |
|---|---|---|
| GET | /boxes، /boxes/id/:boxId، /boxes/slug/:slug | عمومی |
| GET | /boxes/all، /boxes/admin/:boxId | مدیر |
| POST | /boxes | مدیر |
| PATCH / DELETE | /boxes/:boxId | مدیر |
| POST | /boxes/:boxId/images | مدیر؛ multipart با images |
| PUT | /boxes/:boxId/images | مدیر؛ مرتب‌سازی/حذف منطقی گالری و انتخاب جلد |

```json
{
 "name":"باکس سه جفتی",
 "products":[
  {"product":"شناسه جوراب آبی","quantity":2},
  {"product":"شناسه جوراب سفید","quantity":1}
 ],
 "discount":10,
 "isActive":true
}
```

Box خروجی finalPrice، totalPrice، stock و pairCount دارد؛ این مقادیر محاسبه می‌شوند و قابل ارسال از طرف مشتری نیستند. اگر جزئی از باکس غیرفعال شود، باکس stock=0 و قیمت ناموجود می‌دهد.

برای گالری فقط آدرس‌های متعلق به تصاویر قبلاً آپلودشده همان باکس مجازند:

```json
{"images":["/images/catalog/نام-فایل.webp"],"coverImage":"/images/catalog/نام-فایل.webp"}
```

images خالی گالری و جلد را به پیش‌فرض برمی‌گرداند. فایل‌های حذف‌شده منطقی فعلاً برای حفظ snapshot نگه داشته می‌شوند.

## سبد و خرید

| روش | مسیر | کاربرد |
|---|---|---|
| GET | /cart | سبد فعلی؛ خواندن سبد خالی آن را در DB ایجاد نمی‌کند |
| POST | /cart | افزودن یا افزایش تعداد |
| PATCH | /cart/:itemId | تنظیم quantity |
| DELETE | /cart/:itemId | حذف ردیف |
| DELETE | /cart | خالی‌کردن |
| POST | /checkout | قیمت روز و بررسی مجموع موجودی |
| POST | /orders | آماده‌سازی سفارش با addressId |
| GET | /orders، /orders/history، /orders/:id | فقط سفارش‌های خود کاربر |
| DELETE | /orders/:id | فقط سفارش pending و unpaid |

افزودن یک جفت:
```json
{"itemType":"Product","item":"شناسه محصول","quantity":1}
```

افزودن دو باکس:
```json
{"itemType":"Box","item":"شناسه باکس","quantity":2}
```

itemId در مسیر ویرایش/حذف، شناسه **ردیف داخل سبد** است؛ با شناسه محصول فرق دارد.

قیمت نهایی هیچ‌وقت از ورودی مشتری گرفته نمی‌شود. Checkout و شروع پرداخت مجموع مصرف تک‌فروشی و باکس را دوباره بررسی می‌کنند. Order شامل items، inventory تجمیعی، subtotal، shippingAmount، totalAmount، totalPairs و snapshot آدرس است.

## آدرس

GET/POST /addresses؛ GET/PATCH/DELETE /addresses/:addressId؛ PATCH /addresses/:addressId/default.

```json
{
 "title":"خانه",
 "recipientName":"بهنام محمدی",
 "recipientPhone":"09121234567",
 "province":"تهران",
 "city":"تهران",
 "addressLine":"نشانی کامل گیرنده",
 "postalCode":"1234567890",
 "buildingNumber":"۱۲",
 "unit":"۳",
 "isDefault":true
}
```

سپس POST /orders با `{"addressId":"شناسه آدرس"}`. در نبود addressId از آدرس پیش‌فرض استفاده می‌شود؛ نبود هر دو خطاست.

## پرداخت و مدیریت سفارش

1. POST /payments/order/:orderId؛ مبلغ از snapshot سفارش می‌آید. پاسخ payment و redirectUrl دارد.
2. در محیط mock، redirectUrl تهی است و mockVerifyPath برمی‌گردد. POST به همان مسیر، پرداخت آزمایشی موفق را شبیه‌سازی می‌کند؛ فقط صاحب پرداخت و فقط خارج production.
3. در زرین‌پال کاربر به redirectUrl می‌رود. GET /payments/zarinpal/callback با Authority و Status، تأیید سمت سرور را انجام می‌دهد.
4. GET /payments و /payments/:paymentId فقط پرداخت‌های کاربر را نشان می‌دهد.
5. خطای شبکه هنگام verify پرداخت را بی‌دلیل failed نمی‌کند؛ تأیید قابل تکرار می‌ماند.

مدیر:
- GET /orders/all، GET /orders/admin/:orderId
- PATCH /orders/admin/:orderId با `{"status":"shipped","trackingCode":"کد رهگیری"}`، سپس `{"status":"delivered"}`
- GET /payments/all، GET /payments/admin/order/:orderId
- PATCH /payments/admin/:paymentId/review با `{"resolution":"stock_supplied"}`
- یا پس از بازپرداخت واقعی خارج API: `{"resolution":"refunded","refundReference":"شناسه پیگیری بازپرداخت"}`
- GET /admin/dashboard
- GET /cart/all؛ صفحه‌بندی ۲۰تایی.

ادمین نمی‌تواند با PATCH وضعیت سفارشِ پرداخت‌نشده را confirmed کند. confirmed فقط از پرداخت موفق یا تأمین موجودیِ پرداخت review ایجاد می‌شود.

## سایر مسیرهای حفظ‌شده

- مدیریت کاربران: GET/POST /users، GET/PATCH/DELETE /users/:userId؛ فقط مدیر.
- آدرس‌های مشتری برای مدیر: GET /addresses/admin/user/:userId.
- علاقه‌مندی محصول: GET/POST/DELETE /wishlists و DELETE /wishlists/:productId. POST با `{"productId":"شناسه محصول"}`.
- /goldPricing از API جدید حذف شده است.

فهرست‌ها معمولاً page، limit تا ۱۰۰، sort و فیلترهای مشخص را می‌پذیرند. مثال: /products?page=1&limit=20&sort=-price&gender=unisex. فیلترهای محافظت‌شده مثل isActive در خواندن عمومی یا user در سفارش‌های شخصی با query قابل تغییر نیستند. عملگر دلخواه MongoDB و انتخاب +password پذیرفته نمی‌شود.

## گالری یکپارچه پنل پاور

POST /products/:productId/gallery با multipart و فیلد images، و PUT /products/:productId/gallery با JSON شامل images و coverImage اضافه شده‌اند. قرارداد و محدودیت‌ها مثل گالری باکس است. پنل جدید از این مسیرها استفاده می‌کند؛ مسیرهای قدیمی محصول برای سازگاری باقی‌اند.

صفحات فروشگاه از /، /shop، /product/:slug و /box/:slug ارائه می‌شوند. پنل /admin و ورود آن /admin/login است. HTML و API از یک Cookie نشست استفاده می‌کنند.

Callback زرین‌پال برای درخواست مرورگر با Accept: text/html به صفحه سفارش هدایت می‌کند؛ درخواست API همچنان پاسخ JSON می‌گیرد.


POST /orders/:orderId/received: مشتری مالک سفارش پرداخت‌شده و ارسال‌شده دریافت بسته را تأیید می‌کند. تکرار درخواست تاریخ اولیه را تغییر نمی‌دهد. shippedAt و deliveredAt ثبت فروشگاه و customerReceivedAt تأیید مستقل مشتری است.
