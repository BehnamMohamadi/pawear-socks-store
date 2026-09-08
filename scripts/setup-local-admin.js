const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });
const mongoose = require('mongoose');
const User = require('../models/user-model');
(async () => {
  if (process.env.NODE_ENV === 'production') throw new Error('Local setup is disabled in production.');
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  const phone = process.env.ADMIN_PHONENUMBER || '09000000000';
  const existing = await User.findOne({ phonenumber: phone });
  if (existing) {
    if (existing.role !== 'admin') throw new Error('This phone belongs to a customer; choose a different admin phone.');
    console.log('Admin already exists; credentials preserved.');
    return;
  }
  const password = process.env.ADMIN_PASSWORD || crypto.randomBytes(18).toString('base64url');
  const values = { ADMIN_FIRSTNAME: process.env.ADMIN_FIRSTNAME || 'مدیر', ADMIN_LASTNAME: process.env.ADMIN_LASTNAME || 'پاور', ADMIN_PHONENUMBER: phone, ADMIN_PASSWORD: password };
  await User.create({ firstname: values.ADMIN_FIRSTNAME, lastname: values.ADMIN_LASTNAME, phonenumber: phone, password, role: 'admin' });
  const envPath = path.join(__dirname, '../.env');
  let env = fs.readFileSync(envPath, 'utf8');
  for (const [key, value] of Object.entries(values)) {
    const line = `${key}=${value}`;
    const regex = new RegExp(`^${key}=.*$`, 'm');
    env = regex.test(env) ? env.replace(regex, line) : `${env}\n${line}\n`;
  }
  fs.writeFileSync(envPath, env);
  fs.mkdirSync(path.join(__dirname, '../artifacts'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, '../artifacts/local-admin.txt'), `Local PAWEAR admin\nhttp://127.0.0.1:3000/admin/login\nPhone: ${phone}\nPassword: ${password}\n`);
  console.log('Local admin created. Credentials saved in artifacts/local-admin.txt and .env.');
})().catch(e => { console.error(e.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());
