const User=require('../models/user-model');
const {verifyAccessToken}=require('../utils/jwt');
const {AppError}=require('../utils/app-error');
const {catchAsync}=require('../utils/catch-async');
const protect=catchAsync(async(req,res,next)=>{
 const authorization=req.get('authorization');const token=req.cookies?.accessToken||(authorization?.startsWith('Bearer ')?authorization.slice(7):null);
 if(!token)throw new AppError(401,'ابتدا وارد حساب خود شوید.');
 let payload;try{payload=verifyAccessToken(token);}catch{throw new AppError(401,'نشست معتبر نیست؛ دوباره وارد شوید.');}
 const user=await User.findById(payload.sub).select('+tokenVersion');
 if(!user||payload.ver!==(user.tokenVersion||0))throw new AppError(401,'نشست منقضی شده است.');
 if(user.accountStatus.status!=='active')throw new AppError(403,'حساب غیرفعال است.');
 req.user=user;req.auth=payload;next();
});
const preventIfAuthenticated=(req,res,next)=>next();
const restrictTo=(...roles)=>(req,res,next)=>{if(!req.user||!roles.includes(req.user.role))return next(new AppError(403,'دسترسی مجاز نیست.'));next();};
module.exports={protect,restrictTo,preventIfAuthenticated};
