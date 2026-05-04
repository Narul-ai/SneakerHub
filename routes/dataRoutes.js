const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');

// Заглушки, чтобы сервер не падал при поиске контроллера
router.get('/', protect, (req, res) => res.json({ message: "Data received" }));
router.post('/', protect, (req, res) => res.json({ message: "Data saved" }));

module.exports = router;