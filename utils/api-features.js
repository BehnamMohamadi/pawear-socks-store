const { AppError } = require('./app-error');
class ApiFeatures {
    constructor(query, queryString, excludedFields = []) { this.query = query; this.queryString = queryString; this.excludedFields = excludedFields; this.filterObject = {}; }
    filter() {
        const allowed = ['name', 'slug', 'sku', 'category', 'subCategory', 'gender', 'brand', 'isActive', 'isFeatured', 'status', 'paymentStatus', 'gateway', 'requiresReview', 'reviewStatus', 'order', 'role', 'accountStatus.status', 'price', 'stock'];
        const protectedFields = Object.keys(this.query.getFilter());
        for (const [key, value] of Object.entries(this.queryString)) {
            if (!allowed.includes(key) || protectedFields.includes(key))
                continue;
            if (typeof value !== 'string' || value.startsWith('$') || value.length > 200)
                throw new AppError(400, 'فیلتر معتبر نیست.');
            this.filterObject[key] = value;
        }
        this.query = this.query.find(this.filterObject);
        return this;
    }
    sort() { const sort = this.queryString.sort || '-createdAt'; if (typeof sort !== 'string' || !/^[-a-zA-Z.,]+$/.test(sort))
        throw new AppError(400, 'مرتب‌سازی معتبر نیست.'); this.query = this.query.sort(sort.split(',').join(' ')); return this; }
    limitFields() {
        const fields = this.queryString.fields;
        if (fields) {
            if (typeof fields !== 'string' || !/^[-a-zA-Z.,]+$/.test(fields))
                throw new AppError(400, 'فیلدها معتبر نیستند.');
            const selected = fields.split(',').filter(f => !['password', 'tokenVersion', '__v', ...this.excludedFields].includes(f.replace(/^-/, '').split('.')[0]));
            if (selected.length)
                this.query = this.query.select(selected.join(' '));
        }
        return this;
    }
    paginate() { const page = Number(this.queryString.page || 1), limit = Number(this.queryString.limit || 20); if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(limit) || limit < 1 || limit > 100 || page > 100000)
        throw new AppError(400, 'صفحه‌بندی معتبر نیست.'); this.page = page; this.limit = limit; this.query = this.query.skip((page - 1) * limit).limit(limit); return this; }
}
module.exports = { ApiFeatures };
