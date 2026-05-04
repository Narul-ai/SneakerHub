const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// --- ПУБЛИЧНЫЕ РОУТЫ ---
router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProductById);

// --- РОУТЫ ДЛЯ ПОЛЬЗОВАТЕЛЕЙ ---
// Добавление отзыва
router.post('/:id/reviews', protect, productController.createProductReview);

// Удаление отзыва (Может автор или админ)
router.delete('/:id/reviews/:reviewId', protect, productController.deleteProductReview);

// --- АДМИНСКИЕ РОУТЫ ---
router.post('/', protect, adminOnly, productController.createProduct);
router.patch('/:id', protect, adminOnly, productController.updateProduct);
router.delete('/:id', protect, adminOnly, productController.deleteProduct);

module.exports = router;