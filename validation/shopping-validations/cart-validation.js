const Joi = require('joi');
const id = Joi.string().hex().length(24).required();
module.exports = {
    addCartItemSchema: Joi.object({
        itemType: Joi.string().valid('Product', 'Box').required(), item: id, quantity: Joi.number().integer().min(1).max(100).default(1)
    }).unknown(false), updateCartItemSchema: Joi.object({ quantity: Joi.number().integer().min(1).max(100).required() }).unknown(false), cartItemIdSchema: id
};
