const resources = require('../../services/admin/resources');
const { AppError } = require('../../utils/app-error');
const Payment = resources.payments.model;
const Order = resources.orders.model;
const { expireStalePayments } = require('../../services/shopping-services/payment-service');
exports.dashboard = async (req,res) => {
  await expireStalePayments();
  const [users,products,boxes,orders,reviews,sales,lowStock,recent] = await Promise.all([
    resources.users.model.countDocuments(), resources.products.model.countDocuments({isActive:true}), resources.boxes.model.countDocuments({isActive:true}), Order.countDocuments(), Payment.countDocuments({requiresReview:true,reviewStatus:{$ne:'resolved'}}), Order.aggregate([{$match:{paymentStatus:'paid'}},{$group:{_id:null,total:{$sum:'$totalAmount'}}}]), resources.products.model.find({isActive:true,stock:{$lte:5}}).sort('stock').limit(10).lean(),Order.find().sort('-createdAt').limit(10).populate('user','firstname lastname').lean()
  ]);
  res.render('admin/pawear/dashboard',{title:'داشبورد مدیریت',adminUser:req.user,metrics:{'فروش پرداخت‌شده (تومان)':sales[0]?.total||0,'سفارش‌ها':orders,'جوراب‌های فعال':products,'باکس‌های فعال':boxes,'کاربران':users,'پرداخت نیازمند بررسی':reviews},lowStock,recent});
};
exports.list = async (req,res) => {
  const key=req.params.resource, config=resources[key];
  if(!config)throw new AppError(404,'بخش پیدا نشد.');
  if(['payments','orders'].includes(key)) await expireStalePayments();
  const page=Math.max(1,Math.min(100000,parseInt(req.query.page,10)||1));
  const q=typeof req.query.q==='string'?req.query.q.trim().slice(0,100):'';
  const filter={};
  if(q){const pattern={$regex:q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),$options:'i'};filter[key==='users'?'phonenumber':key==='orders'?'orderNumber':'name']=pattern;}
  if(['products','boxes','categories','subcategories'].includes(key)&&['true','false'].includes(req.query.active))filter.isActive=req.query.active==='true';
  if(['orders','payments'].includes(key)&&typeof req.query.status==='string'&&req.query.status)filter.status=req.query.status.slice(0,40);
  if(key==='payments'&&req.query.review==='true')filter.requiresReview=true;
  let query=config.model.find(filter).sort('-createdAt').skip((page-1)*25).limit(25);
  if(['orders','payments','carts'].includes(key))query=query.populate('user','firstname lastname phonenumber');
  const [rows,total]=await Promise.all([query.lean(),config.model.countDocuments(filter)]);
  const pageUrl=n=>'/admin/'+key+'?'+new URLSearchParams({...Object.fromEntries(Object.entries(req.query).filter(([,v])=>typeof v==='string')),page:n});
  res.render(['orders','payments'].includes(key)?'admin/pawear/operations':'admin/pawear/list',{title:config.title,adminUser:req.user,key,config,rows,page,total,q,filters:req.query,pageUrl});
};
exports.form = async (req,res) => {
  const key=req.params.resource,config=resources[key];
  if(!config||config.readonly)throw new AppError(404,'فرم پیدا نشد.');
  let record={isActive:true,stock:0,price:1,discount:0,sortOrder:0,brand:'PAWEAR',gender:'unisex',role:'user'};
  if(req.params.id){if(!/^[a-f0-9]{24}$/i.test(req.params.id))throw new AppError(404,'رکورد پیدا نشد.');record=await config.model.findById(req.params.id).lean();if(!record)throw new AppError(404,'رکورد پیدا نشد.');}
  const [categories,subcategories,products]=await Promise.all([resources.categories.model.find().sort('sortOrder').lean(),resources.subcategories.model.find().sort('sortOrder').lean(),key==='boxes'?resources.products.model.find().select('name sku price stock isActive').sort('name').lean():[]]);
  res.render('admin/pawear/form',{title:(record._id?'ویرایش ':'افزودن ')+config.title,adminUser:req.user,key,config,record,categories,subcategories,products});
};
exports.detail = async (req,res) => {
  const key=req.params.resource,config=resources[key];
  if(!config?.readonly||!/^[a-f0-9]{24}$/i.test(req.params.id))throw new AppError(404,'رکورد پیدا نشد.');
  await expireStalePayments();
  const record=await config.model.findById(req.params.id).populate('user','firstname lastname phonenumber email').lean();
  if(!record)throw new AppError(404,'رکورد پیدا نشد.');
  const payments=key==='orders'?await Payment.find({order:record._id}).sort('-createdAt').lean():[];
  res.render('admin/pawear/detail',{title:'جزئیات '+config.title,adminUser:req.user,key,config,record,payments});
};
