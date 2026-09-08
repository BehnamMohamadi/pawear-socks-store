const Joi = require('joi');
module.exports = {
    orderIdSchema: Joi.string().hex().length(24).required(), prepareOrderSchema: Joi.object({ addressId: Joi.string().hex().length(24).optional() }).unknown(false), adminUpdateOrderSchema: Joi.object({ status: Joi.string().valid('shipped', 'delivered').required(), trackingCode: Joi.when('status', {
            is: 'shipped', then: Joi.string().trim().min(1).max(100).required(), otherwise: Joi.forbidden()
        }) }).unknown(false)
};
