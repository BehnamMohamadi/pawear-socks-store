const Joi = require('joi');
const productIdSchema = Joi.string().hex().length(24).required();
const fields = {
    name: Joi.string().trim().min(2).max(100), slug: Joi.string().trim().min(1).max(150), sku: Joi.string().trim().min(1).max(80), category: Joi.string().hex().length(24), subCategory: Joi.string().hex().length(24), gender: Joi.string().valid('female', 'male', 'kids', 'unisex'), size: Joi.string().valid('free-size'), brand: Joi.string().trim().max(80), price: Joi.number().integer().min(1).max(1000000000), stock: Joi.number().integer().min(0).max(1000000), description: Joi.string().trim().max(5000).allow(''), details: Joi.array().max(30).items(Joi.object({ title: Joi.string().trim().max(100).required(), value: Joi.string().trim().max(500).required() })), isActive: Joi.boolean(), isFeatured: Joi.boolean()
};
module.exports = {
    productIdSchema, createProductSchema: Joi.object({
        ...fields, name: fields.name.required(), category: fields.category.required(), subCategory: fields.subCategory.required(), price: fields.price.required()
    }).unknown(false), editProductSchema: Joi.object(fields).min(1).unknown(false)
};
