const { AppError } = require('../../utils/app-error');
const normalizeSize=value=>String(value||'free-size').trim().replace(/[۰-۹]/g,c=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c))).replace(/[٠-٩]/g,c=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(c))).replace(/[–—]/g,'-').replace(/\s*-\s*/g,'-').toUpperCase();
const normalizeColor=value=>String(value||'').trim().replace(/\s+/g,' ');

function selectVariant(product,{variantId,size,color}={}){
  if(product.variants?.length){
    const active=product.variants.filter(v=>v.isActive);
    let selected=null;
    if(variantId)selected=product.variants.id?product.variants.id(variantId):product.variants.find(v=>String(v._id)===String(variantId));
    if(!selected&&(size||color))selected=product.variants.find(v=>normalizeSize(v.size)===normalizeSize(size)&&normalizeColor(v.color).toLowerCase()===normalizeColor(color).toLowerCase());
    if(!selected&&product.defaultVariantId)selected=product.variants.id?product.variants.id(product.defaultVariantId):product.variants.find(v=>String(v._id)===String(product.defaultVariantId));
    if(!selected)selected=active.find(v=>v.stock>0)||active[0];
    if(!selected||!selected.isActive)throw new AppError(400,'این تنوع محصول فعال نیست.',null,'VARIANT_UNAVAILABLE');
    return {variantId:String(selected._id),size:normalizeSize(selected.size),color:normalizeColor(selected.color),colorCode:selected.colorCode||'',sku:selected.sku||product.sku,price:selected.price,stock:selected.stock};
  }
  if(product.sizes?.length){
    const requested=size?normalizeSize(size):null;
    const selected=(requested&&product.sizes.find(v=>v.label===requested&&v.isActive))||product.sizes.find(v=>v.isActive&&v.stock>0)||product.sizes.find(v=>v.isActive);
    if(!selected)throw new AppError(400,'سایز فعال برای این محصول وجود ندارد.',null,'SIZE_REQUIRED');
    return {variantId:null,size:selected.label,color:'',colorCode:'',sku:product.sku,price:selected.price,stock:selected.stock};
  }
  return {variantId:null,size:'free-size',color:'',colorCode:'',sku:product.sku,price:product.price,stock:product.stock};
}
module.exports={normalizeSize,normalizeColor,selectVariant};
