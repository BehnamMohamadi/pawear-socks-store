const Joi = require('joi');
const { normalizePhone } = require('../utils/phone');
const phone = Joi.string().custom((v, h) => { const p = normalizePhone(v); return /^09\d{9}$/.test(p) ? p : h.error('any.invalid'); }).required();
const name = Joi.string().trim().min(2).max(40);
const password = Joi.string().min(8).max(72).custom((v, h) => Buffer.byteLength(v, 'utf8') <= 72 ? v : h.error('any.invalid'));
module.exports = {
    registerSchema: Joi.object({
        firstname: name.required(), lastname: name.required(), phonenumber: phone, email: Joi.string().trim().lowercase().email(), password: password.required()
    }).unknown(false), loginSchema: Joi.object({ phonenumber: phone, password: password.required() }).unknown(false), otpRequestSchema: Joi.object({ phonenumber: phone }).unknown(false), otpVerifySchema: Joi.object({
        phonenumber: phone, code: Joi.string().pattern(/^\d{6}$/).required(), firstname: name, lastname: name
    }).unknown(false), setPasswordSchema: Joi.object({ password: password.required() }).unknown(false)
};
