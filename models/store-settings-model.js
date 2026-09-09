const {Schema,model}=require('mongoose');
module.exports=model('StoreSettings',new Schema({
 _id:{type:String,default:'shipping'},
 sockAmount:{type:Number,required:true,min:0,max:1000000000,validate:Number.isSafeInteger},
 boxAmount:{type:Number,required:true,min:0,max:1000000000,validate:Number.isSafeInteger},
 updatedBy:{type:Schema.Types.ObjectId,ref:'User'}
},{timestamps:true}));
