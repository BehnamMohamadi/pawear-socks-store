const Joi=require('joi');
const id=Joi.string().hex().length(24).required();
const fields={name:Joi.string().trim().min(2).max(80),slug:Joi.string().trim().min(1).max(120),logo:Joi.string().trim().max(500).allow(''),description:Joi.string().trim().max(2000).allow(''),isActive:Joi.boolean()};
module.exports={brandIdSchema:id,createBrandSchema:Joi.object({...fields,name:fields.name.required()}).unknown(false),editBrandSchema:Joi.object(fields).min(1).unknown(false)};
