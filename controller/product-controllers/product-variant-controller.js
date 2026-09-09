const Product=require('../../models/product-models/product-model');
const Category=require('../../models/product-models/category-model');
const SubCategory=require('../../models/product-models/subCategory-model');
const Brand=require('../../models/product-models/brand-model');
const Order=require('../../models/shopping-models/order-model');
const {createSlug}=require('../../utils/slugify');
const {AppError}=require('../../utils/app-error');
const {catchAsync}=require('../../utils/catch-async');

async function validateRelations(categoryId,subCategoryId,brandId){
 const [category,sub,brand]=await Promise.all([Category.findOne({_id:categoryId,isActive:true}),SubCategory.findOne({_id:subCategoryId,category:categoryId,isActive:true}),Brand.findOne({_id:brandId,isActive:true})]);
 if(!category)throw new AppError(400,'دسته‌بندی معتبر و فعال نیست.');
 if(!sub)throw new AppError(400,'زیردسته به دسته انتخاب‌شده تعلق ندارد یا غیرفعال است.');
 if(!brand)throw new AppError(400,'برند معتبر و فعال نیست.');
 return brand;
}
function applyDefault(product,index,id){
 if(id)product.defaultVariantId=id;
 else if(Number.isInteger(index)&&product.variants[index])product.defaultVariantId=product.variants[index]._id;
}
const addProduct=catchAsync(async(req,res)=>{
 const brand=await validateRelations(req.body.category,req.body.subCategory,req.body.brandId);
 const data={...req.body,brand:brand.name};delete data.defaultVariantIndex;if(data.slug)data.slug=createSlug(data.slug);
 const product=new Product(data);applyDefault(product,req.body.defaultVariantIndex,req.body.defaultVariantId);await product.save();
 res.status(201).json({status:'success',data:{product}});
});
const editProductById=catchAsync(async(req,res,next)=>{
 const product=await Product.findById(req.params.productId);if(!product)return next(new AppError(404,'محصول پیدا نشد.'));
 const categoryId=req.body.category||product.category,subCategoryId=req.body.subCategory||product.subCategory,brandId=req.body.brandId||product.brandId;
 if(!brandId)throw new AppError(400,'برای محصول یک برند انتخاب کنید.');
 const brand=await validateRelations(categoryId,subCategoryId,brandId);
 if(req.body.variants!==undefined&&await Order.exists({'inventory.product':product._id,$or:[{stockState:'reserved'},{status:'review'}]}))throw new AppError(409,'این محصول در سفارش در حال پرداخت/بررسی است؛ بعد از تعیین تکلیف سفارش، تنوع‌ها را ویرایش کنید.');
 const allowed=['name','sku','category','subCategory','brandId','gender','price','variants','details','stock','description','isActive','isFeatured'];
 for(const field of allowed)if(req.body[field]!==undefined)product[field]=req.body[field];
 product.brand=brand.name;if(req.body.slug!==undefined)product.slug=createSlug(req.body.slug);
 applyDefault(product,req.body.defaultVariantIndex,req.body.defaultVariantId);await product.save();
 res.json({status:'success',data:{product}});
});
module.exports={addProduct,editProductById};
