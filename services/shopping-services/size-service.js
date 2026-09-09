const {AppError}=require('../../utils/app-error');
const normalizeSize=value=>String(value||'').trim().replace(/[۰-۹]/g,c=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c))).replace(/[٠-٩]/g,c=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(c))).replace(/[–—]/g,'-').replace(/\s*-\s*/g,'-').toUpperCase();
function selectSize(product,size){
 if(!product.sizes?.length){
  if(size&&size!=='free-size')throw new AppError(400,'این محصول فقط فری‌سایز است.',null,'SIZE_INVALID');
  return {size:'free-size',price:product.price,stock:product.stock};
 }
 const selected=product.sizes.find(v=>v.label===normalizeSize(size));
 if(!selected||!selected.isActive)throw new AppError(400,'سایز معتبر و فعال را انتخاب کنید.',null,'SIZE_REQUIRED');
 return {size:selected.label,price:selected.price,stock:selected.stock};
}
module.exports={normalizeSize,selectSize};
