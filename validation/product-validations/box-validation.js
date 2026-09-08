const Joi = require('joi');
const fields = {
    name: Joi.string().trim().min(2).max(100), slug: Joi.string().trim().min(1).max(150), sku: Joi.string().trim().max(80), description: Joi.string().trim().max(5000).allow(''), products: Joi.array().min(1).max(50).unique('product').items(Joi.object({ product: Joi.string().hex().length(24).required(), quantity: Joi.number().integer().min(1).max(100).required() })).custom((v, h) => v.reduce((n, i) => n + i.quantity, 0) >= 2 ? v : h.error('any.invalid')), discount: Joi.number().integer().min(0).max(99), isActive: Joi.boolean(), isFeatured: Joi.boolean()
};
module.exports = { createBoxSchema: Joi.object({
        ...fields, name: fields.name.required(), products: fields.products.required()
    }).unknown(false), editBoxSchema: Joi.object(fields).min(1).unknown(false) };
