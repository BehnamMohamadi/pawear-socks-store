const field = (name, label, type = 'text', extra = {}) => ({ name, label, type, ...extra });
const common = [field('name','نام','text',{required:true}), field('slug','آدرس صفحه (slug؛ پس از انتشار ثابت نگه دارید)'), field('isActive','فعال','checkbox')];
const resources = {
  products: { title:'جوراب‌ها', model:require('../../models/product-models/product-model'), api:'/api/products', fields:[...common,field('sku','کد کالا'),field('category','دسته‌بندی','category',{required:true}),field('subCategory','زیردسته','subcategory',{required:true}),field('gender','مناسب برای','select',{options:{unisex:'مشترک',male:'مردانه',female:'زنانه',kids:'بچگانه'}}),field('brand','برند'),field('price','قیمت هر جفت (تومان)','number',{required:true,min:1,max:1000000000}),field('stock','موجودی قابل فروش، بدون رزروها','number',{required:true,min:0,max:1000000}),field('description','توضیحات محصول','textarea'),field('isFeatured','نمایش در انتخاب‌های پاور','checkbox')] },
  boxes: {title:'باکس‌های آماده',model:require('../../models/product-models/box-model'),api:'/api/boxes',fields:[...common,field('sku','کد باکس'),field('discount','درصد تخفیف از مجموع جوراب‌ها','number',{min:0,max:99}),field('description','توضیحات باکس','textarea'),field('isFeatured','منتخب پاور','checkbox')]},
  categories:{title:'دسته‌بندی‌ها',model:require('../../models/product-models/category-model'),api:'/api/categories',fields:[...common,field('sortOrder','ترتیب نمایش','number',{min:0})]},
  subcategories:{title:'زیردسته‌ها',model:require('../../models/product-models/subCategory-model'),api:'/api/subCategories',fields:[...common,field('category','دسته‌بندی','category',{required:true}),field('sortOrder','ترتیب نمایش','number',{min:0})]},
  users:{title:'کاربران',model:require('../../models/user-model'),api:'/api/users',fields:[field('firstname','نام','text',{required:true}),field('lastname','نام خانوادگی','text',{required:true}),field('phonenumber','شماره موبایل','text',{required:true}),field('email','ایمیل','email'),field('role','نقش','select',{options:{user:'مشتری',admin:'مدیر'}})]},
  orders:{title:'سفارش‌ها',model:require('../../models/shopping-models/order-model'),api:'/api/orders/admin',readonly:true},
  payments:{title:'پرداخت‌ها',model:require('../../models/shopping-models/payment-model'),api:'/api/payments/admin',readonly:true},
  carts:{title:'سبدهای خرید',model:require('../../models/shopping-models/cart-model'),api:'/api/cart',readonly:true},
};
module.exports = resources;
