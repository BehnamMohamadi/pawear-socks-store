const crypto = require('node:crypto');
const mongoose = require('mongoose');
const Otp = require('../../models/otp-model');
const User = require('../../models/user-model');
const { sendOtp } = require('./sms-service');
const { AppError } = require('../../utils/app-error');
const digest = (phone, challenge, code) => crypto.createHmac('sha256', process.env.JWT_SECRET).update(phone + ':' + challenge + ':' + code).digest('hex');
const issueOtp = async (phonenumber) => {
    const now = new Date();
    const challenge = crypto.randomUUID();
    const code = String(crypto.randomInt(100000, 1000000));
    let otp;
    try {
        otp = await Otp.findOneAndUpdate({ phonenumber, nextSendAt: { $lte: now } }, { $set: {
                challenge, digest: digest(phonenumber, challenge, code), attempts: 0, consumed: false, delivery: 'pending', expiresAt: new Date(Date.now() + 120000), nextSendAt: new Date(Date.now() + 60000)
            } }, {
            upsert: true, returnDocument: 'after', runValidators: true
        });
    }
    catch (e) {
        if (e.code === 11000)
            throw new AppError(429, 'برای درخواست مجدد یک دقیقه صبر کنید.', null, 'OTP_COOLDOWN');
        throw e;
    }
    try {
        await sendOtp(phonenumber, code);
        await Otp.updateOne({ _id: otp._id, challenge }, { $set: { delivery: 'sent' } });
    }
    catch (e) {
        await Otp.updateOne({ _id: otp._id, challenge }, { $set: { delivery: 'failed', consumed: true } });
        throw e;
    }
    return { expiresIn: 120, retryAfter: 60 };
};
const verifyOtp = async ({ phonenumber, code, firstname, lastname }) => {
    // Every attempt, including wrong codes, is counted atomically and never rolled back.
    const otp = await Otp.findOneAndUpdate({
        phonenumber, consumed: false, delivery: 'sent', expiresAt: { $gt: new Date() }, attempts: { $lt: 5 }
    }, { $inc: { attempts: 1 } }, { returnDocument: 'after' }).select('+digest');
    if (!otp)
        throw new AppError(400, 'کد نامعتبر، منقضی یا مسدود شده است.', null, 'OTP_INVALID');
    const actual = Buffer.from(digest(phonenumber, otp.challenge, code), 'hex');
    const expected = Buffer.from(otp.digest, 'hex');
    if (expected.length !== actual.length || !crypto.timingSafeEqual(actual, expected))
        throw new AppError(400, 'کد نامعتبر است.', null, 'OTP_INVALID');
    return mongoose.connection.transaction(async (session) => {
        let user = await User.findOne({ phonenumber }).select('+tokenVersion').session(session);
        if (user && user.accountStatus.status !== 'active')
            throw new AppError(403, 'حساب غیرفعال است.');
        if (!user && (!firstname || !lastname))
            throw new AppError(400, 'برای تکمیل ثبت‌نام نام و نام خانوادگی را وارد کنید.', null, 'PROFILE_REQUIRED');
        const consumed = await Otp.updateOne({
            _id: otp._id, challenge: otp.challenge, consumed: false, delivery: 'sent', expiresAt: { $gt: new Date() }, attempts: { $lte: 5 }
        }, { $set: { consumed: true } }, { session });
        if (consumed.modifiedCount !== 1)
            throw new AppError(400, 'این کد قبلاً استفاده شده است.', null, 'OTP_INVALID');
        if (!user) {
            [user] = await User.create([{
                    phonenumber, firstname, lastname, role: 'user'
                }], { session });
        }
        return user;
    });
};
module.exports = { issueOtp, verifyOtp };
