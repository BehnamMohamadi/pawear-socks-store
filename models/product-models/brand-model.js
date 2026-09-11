const { Schema, model } = require('mongoose');
const { createSlug } = require('../../utils/slugify');

const brandSchema = new Schema({
  name:{type:String,required:true,unique:true,trim:true,minlength:2,maxlength:80},
  slug:{type:String,required:true,unique:true,trim:true,lowercase:true,index:true},
  logo:{type:String,default:''},
  description:{type:String,trim:true,maxlength:2000,default:''},
  isActive:{type:Boolean,default:true}
},{timestamps:true});

brandSchema.pre('validate',function(){ if(!this.slug&&this.name)this.slug=createSlug(this.name); });
module.exports=model('Brand',brandSchema);
