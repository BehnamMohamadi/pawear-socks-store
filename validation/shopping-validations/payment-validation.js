const Joi = require('joi');
module.exports = { paymentIdSchema: Joi.string().hex().length(24).required(), adminResolvePaymentSchema: Joi.object({ resolution: Joi.string().valid('stock_supplied', 'refunded').required(), refundReference: Joi.when('resolution', {
            is: 'refunded', then: Joi.string().trim().min(3).max(150).required(), otherwise: Joi.forbidden()
        }) }).unknown(false) };
