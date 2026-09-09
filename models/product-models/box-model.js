const { Schema, model } = require('mongoose');
const { randomUUID } = require('node:crypto');
const { createSlug } = require('../../utils/slugify');
const boxSchema = new Schema({
    name: {
        type: String, required: true, trim: true, minlength: 2, maxlength: 100
    },
    slug: {
        type: String, required: true, unique: true, lowercase: true, trim: true
    },
    sku: {
        type: String, required: true, unique: true, uppercase: true, trim: true
    },
    description: {
        type: String, default: '', maxlength: 5000, trim: true
    },
    products: {
        type: [{
                product: {
                    type: Schema.Types.ObjectId, ref: 'Product', required: true
                }, size:{type:String,maxlength:30,default:'free-size'}, quantity: {
                    type: Number, required: true, min: 1, validate: Number.isSafeInteger
                }, _id: false
            }], required: true, validate: { validator: items => items.length > 0 && items.reduce((n, i) => n + i.quantity, 0) >= 2 && new Set(items.map(i => String(i.product?._id || i.product)+'|'+(i.size||'free-size'))).size === items.length, message: 'باکس باید حداقل دو جفت و ردیف‌های غیرتکراری داشته باشد.' }
    },
    discount: {
        type: Number, default: 0, min: 0, max: 99, validate: Number.isSafeInteger
    },
    coverImage: { type: String, default: '/images/product-placeholder.svg' }, images: { type: [String], default: [] },
    isActive: { type: Boolean, default: true }, isFeatured: { type: Boolean, default: false }
}, { timestamps: true, optimisticConcurrency: true });
boxSchema.pre('validate', function () { if (!this.slug && this.name)
    this.slug = createSlug(this.name); if (!this.sku)
    this.sku = 'BOX-' + randomUUID().replaceAll('-', '').slice(0, 16).toUpperCase(); });
module.exports = model('Box', boxSchema);
