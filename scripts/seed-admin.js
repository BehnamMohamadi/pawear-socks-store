const path=require('node:path');
require('dotenv').config({path:path.join(__dirname,'../.env'),quiet:true});
const mongoose=require('mongoose');
const User=require('../models/user-model');
(async()=>{
 const {ADMIN_FIRSTNAME:firstname,ADMIN_LASTNAME:lastname,ADMIN_PHONENUMBER:phonenumber,ADMIN_PASSWORD:password,ADMIN_EMAIL:email}=process.env;
 if(!firstname||!lastname||!phonenumber||!password)throw new Error('Configure ADMIN_FIRSTNAME, ADMIN_LASTNAME, ADMIN_PHONENUMBER and ADMIN_PASSWORD in .env.');
 await mongoose.connect(process.env.MONGODB_URI);
 const existing=await User.findOne({phonenumber}).select('+tokenVersion');
 if(existing){if(existing.role!=='admin')throw new Error('Phone belongs to a customer. Choose another admin phone.');if(!process.argv.includes('--reset-password')){console.log('Admin exists; account and password preserved.');return;}existing.password=password;existing.tokenVersion+=1;await existing.save();console.log('Admin password reset; previous sessions revoked.');}
 else{await User.create({firstname,lastname,phonenumber,password,email:email||undefined,role:'admin'});console.log('Admin created.');}
})().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>mongoose.disconnect());
