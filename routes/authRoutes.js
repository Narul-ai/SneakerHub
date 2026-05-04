const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// --- АВТОРИЗАЦИЯ ---

// @route   POST /api/auth/register
router.post('/register', authController.register);

// @route   POST /api/auth/login
router.post('/login', authController.login);

// --- ПРОФИЛЬ (Вот чего не хватало!) ---

// @route   GET /api/auth/profile
router.get('/profile', protect, authController.getProfile); 

// --- ИЗБРАННОЕ (WISHLIST) ---

// @route   GET /api/auth/wishlist
router.get('/wishlist', protect, authController.getWishlist);

// @route   POST /api/auth/wishlist
router.post('/wishlist', protect, authController.toggleWishlist);

module.exports = router;