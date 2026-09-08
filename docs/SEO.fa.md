# سئوی فنی پاور

## آنچه پیاده شده

- محتوای محصول، نام، قیمت، موجودی، تصویر، شرح و ترکیب باکس داخل HTML پاسخ سرور است.
- عنوان و توضیح مخصوص کالا، canonical با SITE_URL قابل‌اعتماد، Open Graph و JSON-LD محصول.
- قیمت schema.org بر حسب ریال IRR است و برابر تومان نمایش‌داده‌شده ×۱۰؛ availability از موجودی واقعی می‌آید.
- داده JSON-LD با escape کاراکتر < و nonce در CSP قرار می‌گیرد.
- sitemap فقط کالاهای فعال قابل عرضه و صفحات عمومی انتخاب‌شده را شامل می‌شود.
- جستجو و فیلتر noindex، صفحه‌بندی با لینک عادی و canonical همان شماره صفحه.
- صفحه گم‌شده، کالای غیرفعال و صفحه‌بندی خارج از محدوده HTTP 404 دارند.
- صفحات کاربری و پنل noindex و پاسخ‌های وابسته به نشست private/no-store هستند.
- توسعه با robots Disallow: / و noindex از ایندکس‌شدن نمونه محلی جلوگیری می‌کند.
- بنرهای WebP، بارگذاری تنبل تصاویر فرعی، اولویت بالای تصویر اول و یک H1 اصلی خانه.

## تنظیم دامنه

SITE_URL را به دامنه HTTPS اصلی بدون اسلش پایانی تنظیم کن. CLIENT_ORIGIN و PAYMENT_CALLBACK_URL نیز باید با دامنه واقعی هم‌خوان باشند. دامنه www یا بدون www را در reverse proxy به یک دامنه واحد 301 کن. Host ارسالی بازدیدکننده منبع canonical نیست.

اسم کالا را می‌توان تغییر داد و slug قبلی می‌ماند. پنل برای محافظت از URL منتشرشده slug را در ویرایش قفل می‌کند. اگر از API عمداً slug را تغییر دادی، برای URL قبلی 301 در reverse proxy یا لایه مسیرها تعریف کن؛ انتقال URL خودکار در این نسخه وجود ندارد.

## کنترل روی محیط نهایی

پس از راه‌اندازی، sitemap را در Search Console معرفی کن؛ نمونه محصول را با Rich Results Test و URL Inspection بررسی کن. زمان پاسخ و Core Web Vitals به سرور، CDN، تصاویر محصولات واقعی و تعداد کالاها وابسته است. آزمون محلی جای آزمون سرویس منتشرشده را نمی‌گیرد. sitemap فعلی مناسب کاتالوگ کوچک/متوسط است؛ برای رشد به بیش از ۵۰ هزار URL باید sitemap index اضافه شود.

منابع رسمی:
- [مبانی JavaScript و SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
- [canonical و URLهای تکراری](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)
- [تولید داده ساختاریافته](https://developers.google.com/search/docs/appearance/structured-data/generate-structured-data-with-javascript)
