const {Schema,model}=require('mongoose');
const colorOptionSchema=new Schema({name:{type:String,required:true,unique:true,trim:true,maxlength:60},code:{type:String,trim:true,maxlength:20,default:''},sortOrder:{type:Number,default:0,min:0},isActive:{type:Boolean,default:true}},{timestamps:true});
module.exports=model('ColorOption',colorOptionSchema);
