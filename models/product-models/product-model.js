const { Schema, model } = require('mongoose');
const { randomUUID } = require('node:crypto');
const { createSlug } = require('../../utils/slugify');
const variantSchema=new Schema({
 size:{type:String,required:true,trim:true,maxlength:30,default:'free-size'},
 color:{type:String,trim:true,maxlength:60,default:''},
 colorCode:{type:String,trim:true,maxlength:20,default:''},
 sku:{type:String,trim:true,uppercase:true,maxlength:100,default:''},
 price:{type:Number,required:true,min:1,max:1000000000,validate:Number.isSafeInteger},
 stock:{type:Number,required:true,min:0,max:1000000,validate:Number.isSafeInteger},
 isActive:{type:Boolean,default:true}
});
const productSchema = new Schema({
 name:{type:String,required:true,trim:true,minlength:2,maxlength:100},
 slug:{type:String,unique:true,required:true,trim:true,lowercase:true},
 sku:{type:String,unique:true,required:true,trim:true,uppercase:true},
 category:{type:Schema.Types.ObjectId,ref:'Category',required:true},
 subCategory:{type:Schema.Types.ObjectId,ref:'SubCategory',required:true},
 brandId:{type:Schema.Types.ObjectId,ref:'Brand',default:null,index:true},
 brand:{type:String,trim:true,maxlength:80,default:''},
 gender:{type:String,enum:['female','male','kids','unisex'],default:'unisex'},
 size:{type:String,enum:['free-size'],default:'free-size'},
 sizes:{type:[{label:{type:String,required:true,maxlength:30},price:{type:Number,required:true,min:1,max:1000000000,validate:Number.isSafeInteger},stock:{type:Number,required:true,min:0,max:1000000,validate:Number.isSafeInteger},isActive:{type:Boolean,default:true},_id:false}],default:[]},
 variants:{type:[variantSchema],default:[]},
 defaultVariantId:{type:Schema.Types.ObjectId,default:null},
 price:{type:Number,required:true,min:1,validate:Number.isSafeInteger},
 stock:{type:Number,default:0,min:0,validate:Number.isSafeInteger},
 coverImage:{type:String,default:'/images/product-placeholder.svg'},images:{type:[String],default:[]},description:{type:String,trim:true,maxlength:5000,default:''},
 details:[{title:{type:String,required:true,trim:true},value:{type:String,required:true,trim:true},_id:false}],
 isActive:{type:Boolean,default:true},isFeatured:{type:Boolean,default:false}
},{timestamps:true,optimisticConcurrency:true});
productSchema.pre('validate',function(){
 const {normalizeSize,normalizeColor}=require('../../services/shopping-services/variant-service');
 if(this.variants?.length){
  this.variants.forEach(v=>{v.size=normalizeSize(v.size);v.color=normalizeColor(v.color);if(!v.sku)v.sku=(this.sku||'PA')+'-'+String(v._id).slice(-6).toUpperCase();});
  const keys=this.variants.map(v=>v.size+'|'+v.color.toLowerCase());if(new Set(keys).size!==keys.length)this.invalidate('variants','ترکیب رنگ و سایز تکراری مجاز نیست.');
  const active=this.variants.filter(v=>v.isActive);this.stock=active.reduce((n,v)=>n+v.stock,0);this.price=Math.min(...(active.length?active:this.variants).map(v=>v.price));
  const validDefault=this.defaultVariantId&&this.variants.some(v=>String(v._id)===String(this.defaultVariantId)&&v.isActive);if(!validDefault)this.defaultVariantId=(active.find(v=>v.stock>0)||active[0]||this.variants[0])?._id||null;
 } else if(this.sizes?.length){
  const {normalizeSize}=require('../../services/shopping-services/variant-service');this.sizes.forEach(v=>{v.label=normalizeSize(v.label);});if(new Set(this.sizes.map(v=>v.label)).size!==this.sizes.length)this.invalidate('sizes','سایز تکراری مجاز نیست.');const active=this.sizes.filter(v=>v.isActive);this.stock=active.reduce((n,v)=>n+v.stock,0);this.price=Math.min(...(active.length?active:this.sizes).map(v=>v.price));
 }
 if(!this.slug&&this.name)this.slug=createSlug(this.name);if(!this.sku)this.sku='PA-'+randomUUID().replaceAll('-','').slice(0,16).toUpperCase();
});
productSchema.index({isActive:1,createdAt:-1});productSchema.index({category:1,subCategory:1});productSchema.index({brandId:1,isActive:1});
module.exports=model('Product',productSchema);
