const path=require('node:path');
require('dotenv').config({path:path.join(__dirname,'../.env'),quiet:true});
(async()=>{
 if(process.env.NODE_ENV==='production')throw new Error('This smoke check is local only.');
 const base='http://127.0.0.1:'+Number(process.env.PORT||3000);
 const login=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phonenumber:process.env.ADMIN_PHONENUMBER,password:process.env.ADMIN_PASSWORD})});
 const result=await login.json();
 if(login.status!==200||result.data?.user?.role!=='admin')throw new Error('Configured admin login failed.');
 const cookie=login.headers.get('set-cookie').split(';')[0];
 for(const route of ['/','/admin','/admin/products','/admin/boxes','/admin/categories','/admin/subcategories','/admin/orders','/admin/payments','/admin/users','/admin/carts']){
  const response=await fetch(base+route,{headers:{Cookie:cookie,Accept:'text/html'}});
  if(response.status!==200)throw new Error('Page failed: '+route);
 }
 console.log('Local admin password and all management pages verified. No catalog data changed.');
})().catch(e=>{console.error(e.message);process.exitCode=1;});
