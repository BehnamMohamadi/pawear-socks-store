// Plug a chosen SMS provider in here. Never enable the console driver in production.
const testOutbox=new Map();
const sendOtp=async(phonenumber,code)=>{
 const provider=process.env.SMS_PROVIDER||'console';
 if(provider==='test'&&process.env.NODE_ENV==='test'){testOutbox.set(phonenumber,code);return;}
 if(provider==='console'&&process.env.NODE_ENV!=='production'){console.info('[PAWEAR development OTP]',phonenumber,code);return;}
 const {AppError}=require('../../utils/app-error');
 throw new AppError(503,'ارسال پیامک هنوز فعال نشده است؛ با رمز ثابت وارد شوید.',null,'SMS_UNAVAILABLE');
};
module.exports={sendOtp,...(process.env.NODE_ENV==='test'?{testOutbox}:{})};
