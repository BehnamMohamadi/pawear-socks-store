const { Schema, model } = require('mongoose');
const schema = new Schema({
    phonenumber: {
        type: String, required: true, unique: true
    }, challenge: { type: String, required: true }, digest: {
        type: String, required: true, select: false
    }, attempts: { type: Number, default: 0 }, consumed: { type: Boolean, default: false }, expiresAt: { type: Date, required: true }, nextSendAt: { type: Date, required: true }, delivery: {
        type: String, enum: ['pending', 'sent', 'failed'], default: 'pending'
    }
}, { timestamps: true });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
module.exports = model('Otp', schema);
