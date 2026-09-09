const mongoose=require('mongoose');
const {connectToDatabase}=require('./database/database-connection');
const {startPaymentExpirationWorker,stopPaymentExpirationWorker}=require('./services/shopping-services/payment-service');
const validateConfig=()=>{
 if(!process.env.JWT_SECRET||process.env.JWT_SECRET.length<32||process.env.JWT_SECRET.startsWith('replace-'))throw new Error('JWT_SECRET must be a random secret of at least 32 characters');
 if(process.env.NODE_ENV==='production'){
  if(!process.env.SITE_URL?.startsWith('https://'))throw new Error('Configure HTTPS SITE_URL for canonical URLs and sitemap');
  if(process.env.PAYMENT_GATEWAY!=='zarinpal'||!process.env.ZARINPAL_MERCHANT_ID||process.env.ZARINPAL_SANDBOX!=='false')throw new Error('Configure the live payment gateway before production');
  if(!process.env.PAYMENT_CALLBACK_URL?.startsWith('https://'))throw new Error('HTTPS PAYMENT_CALLBACK_URL is required');
  if(process.env.SHIPPING_AMOUNT_TOMAN===undefined)throw new Error('Configure SHIPPING_AMOUNT_TOMAN explicitly');
 }
};
const start=async()=>{
 try{
  validateConfig();
  if(process.env.NODE_ENV==='development'){
   const target=new URL(process.env.MONGODB_URI);
   if(target.hostname==='127.0.0.1'&&target.port==='27028'&&target.searchParams.get('replicaSet')==='pawearDev'){
    await require('./scripts/start-local-db').startLocalDatabase();
   }
  }
  await connectToDatabase();
  const hello=await mongoose.connection.db.admin().command({hello:1});
  if(!hello.setName&&hello.msg!=='isdbgrid')throw new Error('PAWEAR requires MongoDB replica set transactions (even on one local node).');
  await Promise.all(Object.values(mongoose.models).map(model => model.init()));
  startPaymentExpirationWorker();
  const server=require('./app').listen(Number(process.env.PORT||3000),process.env.HOST||'127.0.0.1',()=>console.log('PAWEAR backend http://'+(process.env.HOST||'127.0.0.1')+':'+(process.env.PORT||3000)));
  const shutdown=()=>{stopPaymentExpirationWorker();server.close(async()=>{await mongoose.disconnect();process.exit(0);});};
  process.once('SIGINT',shutdown);process.once('SIGTERM',shutdown);
  return server;
 }catch(e){console.error(e.message);await mongoose.disconnect();process.exitCode=1;}
};
module.exports={start,validateConfig};
