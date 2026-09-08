const path=require('node:path');
const fs=require('node:fs/promises');
const {randomUUID}=require('node:crypto');
const sharp=require('sharp');
const Product=require('../../models/product-models/product-model');
const Box=require('../../models/product-models/box-model');
const {catchAsync}=require('../../utils/catch-async');
const {AppError}=require('../../utils/app-error');
const uploadCatalogImages=type=>catchAsync(async(req,res)=>{
 const Model=type==='Box'?Box:Product;
 const record=await Model.findById(req.params.boxId||req.params.productId);
 if(!record)throw new AppError(404,'کالا پیدا نشد.');
 if(!req.files?.length)throw new AppError(400,'حداقل یک تصویر ارسال کنید.');
 if(record.images.length+req.files.length>10)throw new AppError(400,'حداکثر ۱۰ تصویر مجاز است.');
 const dir=path.join(__dirname,'../../public/images/catalog');await fs.mkdir(dir,{recursive:true});const files=[];
 try{
  for(const file of req.files){
   const filename=randomUUID()+'.webp';
   try{await sharp(file.buffer,{limitInputPixels:40000000}).rotate().resize(1200,1200,{fit:'inside',withoutEnlargement:true}).webp({quality:85}).toFile(path.join(dir,filename));}
   catch(error){if(error.code&&['EACCES','ENOSPC','ENOENT'].includes(error.code))throw error;throw new AppError(400,'فایل تصویر معتبر نیست.');}
   files.push(filename);
  }
  record.images.push(...files.map(f=>'/images/catalog/'+f));if(record.coverImage==='/images/product-placeholder.svg')record.coverImage=record.images[0];await record.save();
 }catch(e){await Promise.all(files.map(f=>fs.unlink(path.join(dir,f)).catch(()=>{})));throw e;}
 res.json({status:'success',data:{record}});
});
const editCatalogImages=type=>catchAsync(async(req,res)=>{
 const Model=type==='Box'?Box:Product;const record=await Model.findById(req.params.boxId||req.params.productId);
 if(!record)throw new AppError(404,'کالا پیدا نشد.');
 const images=req.body.images;
 if(images.some(image=>!record.images.includes(image)))throw new AppError(400,'فقط تصاویر قبلاً آپلودشده همین کالا مجاز است.');
 if(req.body.coverImage&&!images.includes(req.body.coverImage))throw new AppError(400,'تصویر جلد باید در گالری باشد.');
 // Retain removed physical files for existing order snapshots; background cleanup can be added later.
 record.images=images;record.coverImage=req.body.coverImage||images[0]||'/images/product-placeholder.svg';await record.save();
 res.json({status:'success',data:{record}});
});
module.exports={uploadCatalogImages,editCatalogImages};
