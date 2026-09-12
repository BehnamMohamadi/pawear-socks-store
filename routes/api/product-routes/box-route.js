const router = require('express').Router();
const c = require('../../../controller/product-controllers/box-controller');
const { protect, restrictTo } = require('../../../middleware/auth-middleware');
const { validate } = require('../../../middleware/validate');
const { validateParam } = require('../../../middleware/validate-param');
const { productIdSchema } = require('../../../validation/product-validations/product-validation');
const { createBoxSchema, editBoxSchema } = require('../../../validation/product-validations/box-validation');
const { uploadImage } = require('../../../middleware/upload-image');
const { uploadCatalogImages, editCatalogImages } = require('../../../controller/product-controllers/catalog-images-controller');
const Joi = require('joi');

const gallerySchema = Joi.object({
    images: Joi.array().max(10).unique().items(Joi.string()).required(),
    coverImage: Joi.string()
}).unknown(false);

const uploadBoxImages = [
    validateParam('boxId', productIdSchema),
    uploadImage.array('images', 10),
    uploadCatalogImages('Box')
];

const editBoxImages = [
    validateParam('boxId', productIdSchema),
    validate(gallerySchema),
    editCatalogImages('Box')
];

router.get('/all', protect, restrictTo('admin'), c.list(true));
router.get('/admin/:boxId', protect, restrictTo('admin'), validateParam('boxId', productIdSchema), c.get(true));
router.get('/', c.list(false));
router.get('/slug/:slug', c.get(false));
router.get('/id/:boxId', validateParam('boxId', productIdSchema), c.get(false));

router.use(protect, restrictTo('admin'));
router.post('/', validate(createBoxSchema), c.create);
router.patch('/:boxId', validateParam('boxId', productIdSchema), validate(editBoxSchema), c.edit);
router.delete('/:boxId', validateParam('boxId', productIdSchema), c.remove);

router.post('/:boxId/images', ...uploadBoxImages);
router.put('/:boxId/images', ...editBoxImages);

// Backward-compatible aliases used by the current admin gallery UI.
router.post('/:boxId/gallery', ...uploadBoxImages);
router.put('/:boxId/gallery', ...editBoxImages);

module.exports = router;
