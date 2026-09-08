const User = require('../models/user-model');
const { AppError } = require('../utils/app-error');
const { catchAsync } = require('../utils/catch-async');
const { signAccessToken } = require('../utils/jwt');
const { issueOtp, verifyOtp } = require('../services/auth-services/otp-service');
const cookieOptions = () => ({
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 7 * 24 * 60 * 60 * 1000
});
const respond = (res, user, method = 'password', status = 200) => { res.cookie('accessToken', signAccessToken(user, method), cookieOptions()); res.status(status).json({ status: 'success', data: { user } }); };
const register = catchAsync(async (req, res) => { const user = await User.create({ ...req.body, role: 'user' }); respond(res, user, 'password', 201); });
const login = catchAsync(async (req, res) => {
    const user = await User.findOne({ phonenumber: req.body.phonenumber }).select('+password +tokenVersion');
    if (!user || user.accountStatus.status !== 'active' || !(await user.comparePassword(req.body.password)))
        throw new AppError(401, 'شماره یا رمز عبور درست نیست.');
    respond(res, user);
});
const logout = catchAsync(async (req, res) => { await User.updateOne({ _id: req.user._id }, { $inc: { tokenVersion: 1 } }); res.clearCookie('accessToken', { ...cookieOptions(), maxAge: undefined }); res.json({ status: 'success', message: 'از همه نشست‌ها خارج شدید.' }); });
const requestOtp = catchAsync(async (req, res) => res.json({ status: 'success', data: await issueOtp(req.body.phonenumber) }));
const verifyOtpCode = catchAsync(async (req, res) => respond(res, await verifyOtp(req.body), 'otp'));
const setPassword = catchAsync(async (req, res) => {
    const user = await User.findById(req.user._id).select('+password +tokenVersion');
    const recentOtp = req.auth.method === 'otp' && Date.now() / 1000 - req.auth.authTime < 600;
    if (!recentOtp)
        throw new AppError(403, 'برای تنظیم رمز جدید، از بخش فراموشی رمز با کد یک‌بارمصرف وارد شوید.', null, 'REAUTH_REQUIRED');
    user.password = req.body.password;
    user.tokenVersion += 1;
    await user.save();
    respond(res, user, 'password');
});
module.exports = {
    register, login, logout, requestOtp, verifyOtpCode, setPassword
};
