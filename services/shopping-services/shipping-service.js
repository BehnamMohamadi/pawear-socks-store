const Settings=require('../../models/store-settings-model');
const {AppError}=require('../../utils/app-error');
async function getShippingSettings(session){
 let query=Settings.findById('shipping').lean();if(session)query=query.session(session);
 const saved=await query;if(saved)return saved;
 const amount=Number(process.env.SHIPPING_AMOUNT_TOMAN||0);
 if(!Number.isSafeInteger(amount)||amount<0)throw new AppError(503,'تنظیمات هزینه ارسال معتبر نیست.');
 return {sockAmount:amount,boxAmount:amount};
}
async function quoteShipping(items,session){
 const rates=await getShippingSettings(session);
 return {shippingAmount:Math.max(0,...items.map(i=>i.itemType==='Box'?rates.boxAmount:rates.sockAmount)),
 shippingPolicy:{sockAmount:rates.sockAmount,boxAmount:rates.boxAmount,mixedRule:'maximum'}};
}
module.exports={getShippingSettings,quoteShipping};
