const {Schema,model}=require('mongoose');
const sizeOptionSchema=new Schema({label:{type:String,required:true,unique:true,trim:true,uppercase:true,maxlength:30},sortOrder:{type:Number,default:0,min:0},isActive:{type:Boolean,default:true}},{timestamps:true});
module.exports=model('SizeOption',sizeOptionSchema);
