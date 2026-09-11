const Joi = require("joi");
const { normalizeDigits } = require("../utils/iran-locations");

const addressIdSchema = Joi.string().hex().length(24).required();

const normalizedDigits = (pattern, message) => Joi.string().trim().custom((value, helpers) => {
  const normalized = normalizeDigits(value);
  if (!pattern.test(normalized)) return helpers.message(message);
  return normalized;
});

const recipientPhoneSchema = normalizedDigits(/^09\d{9}$/, "شماره موبایل باید با 09 شروع شود و دقیقاً 11 رقم باشد.");
const postalCodeSchema = normalizedDigits(/^\d{10}$/, "کد پستی باید دقیقاً 10 رقم باشد.");
const buildingNumberSchema = normalizedDigits(/^\d{1,10}$/, "پلاک باید فقط عدد باشد.");
const unitSchema = normalizedDigits(/^\d{1,6}$/, "واحد باید فقط عدد باشد.").allow("");

const createAddressSchema = Joi.object({
  title: Joi.string().trim().min(1).max(40).required(),
  recipientName: Joi.string().trim().min(2).max(80).required(),
  recipientPhone: recipientPhoneSchema.required(),
  province: Joi.string().trim().min(2).max(60).required(),
  city: Joi.string().trim().min(2).max(60).required(),
  addressLine: Joi.string().trim().min(10).max(500).required(),
  postalCode: postalCodeSchema.required(),
  buildingNumber: buildingNumberSchema.required(),
  unit: unitSchema.optional(),
  isDefault: Joi.boolean().optional(),
}).unknown(false);

const editAddressSchema = Joi.object({
  title: Joi.string().trim().min(1).max(40).optional(),
  recipientName: Joi.string().trim().min(2).max(80).optional(),
  recipientPhone: recipientPhoneSchema.optional(),
  province: Joi.string().trim().min(2).max(60).optional(),
  city: Joi.string().trim().min(2).max(60).optional(),
  addressLine: Joi.string().trim().min(10).max(500).optional(),
  postalCode: postalCodeSchema.optional(),
  buildingNumber: buildingNumberSchema.optional(),
  unit: unitSchema.optional(),
  isDefault: Joi.boolean().optional(),
})
  .min(1)
  .unknown(false);

module.exports = {
  addressIdSchema,
  createAddressSchema,
  editAddressSchema,
};
