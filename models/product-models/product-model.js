const { Schema, model } = require('mongoose');
const { randomUUID } = require('node:crypto');
const { createSlug } = require('../../utils/slugify');
const productSchema = new Schema({
 name:{type:String,required:true,trim:true,minlength:2,maxlength:100},
 slug:{type:String,unique:true,required:true,trim:true,lowercase:true},
 sku:{type:String,unique:true,required:true,trim:true,uppercase:true},
 category:{type:Schema.Types.ObjectId,ref:'Category',required:true},
 subCategory:{type:Schema.Types.ObjectId,ref:'SubCategory',required:true},
 gender:{type:String,enum:['female','male','kids','unisex'],default:'unisex'},
 size:{type:String,enum:['free-size'],default:'free-size'},
 sizes:{type:[{label:{type:String,required:true,maxlength:30},price:{type:Number,required:true,min:1,max:1000000000,validate:Number.isSafeInteger},stock:{type:Number,required:true,min:0,max:1000000,validate:Number.isSafeInteger},isActive:{type:Boolean,default:true},_id:false}],default:[]},
 brand:{type:String,trim:true,maxlength:80,default:'PAWEAR'},
 price:{type:Number,required:true,min:1,validate:Number.isSafeInteger},
 stock:{type:Number,default:0,min:0,validate:Number.isSafeInteger},
 coverImage:{type:String,default:'/images/product-placeholder.svg'},
 images:{type:[String],default:[]},
 description:{type:String,trim:true,maxlength:5000,default:''},
 details:[{title:{type:String,required:true,trim:true},value:{type:String,required:true,trim:true},_id:false}],
 isActive:{type:Boolean,default:true},isFeatured:{type:Boolean,default:false}
},{timestamps:true,optimisticConcurrency:true});
productSchema.pre('validate',function(){
 if(this.sizes.length){
  const {normalizeSize}=require('../../services/shopping-services/size-service');
  this.sizes.forEach(v=>{v.label=normalizeSize(v.label);});
  if(new Set(this.sizes.map(v=>v.label)).size!==this.sizes.length)this.invalidate('sizes','سایز تکراری مجاز نیست.');
  const active=this.sizes.filter(v=>v.isActive);this.stock=active.reduce((n,v)=>n+v.stock,0);this.price=Math.min(...(active.length?active:this.sizes).map(v=>v.price));
 }
 if(!this.slug&&this.name)this.slug=createSlug(this.name);
 if(!this.sku)this.sku='PA-'+randomUUID().replaceAll('-','').slice(0,16).toUpperCase();
});
productSchema.index({isActive:1,createdAt:-1});
productSchema.index({category:1,subCategory:1});
module.exports=model('Product',productSchema);
