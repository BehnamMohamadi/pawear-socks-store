const Joi=require('joi');
const Settings=require('../../models/store-settings-model');
const {getShippingSettings}=require('../../services/shopping-services/shipping-service');
const {AppError}=require('../../utils/app-error');
exports.page=async(req,res)=>res.render('admin/pawear/settings',{title:'تنظیمات ارسال',adminUser:req.user,settings:await getShippingSettings()});
exports.read=async(req,res)=>res.json({status:'success',data:{settings:await getShippingSettings()}});
exports.save=async(req,res)=>{
 const {error,value}=Joi.object({sockAmount:Joi.number().integer().min(0).max(1000000000).required(),boxAmount:Joi.number().integer().min(0).max(1000000000).required()}).unknown(false).validate(req.body);
 if(error)throw new AppError(400,'هر دو هزینه را به تومان و عدد صحیح صفر یا بیشتر وارد کنید.');
 const settings=await Settings.findByIdAndUpdate('shipping',{$set:{...value,updatedBy:req.user._id}},{upsert:true,returnDocument:'after',runValidators:true});
 res.json({status:'success',data:{settings}});
};
