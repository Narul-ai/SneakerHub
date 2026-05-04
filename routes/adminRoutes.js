const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const upload = require('../config/cloudinary');
const sendTelegramNotification = require('../utils/telegram');

// --- РОУТ ДЛЯ ЗАГРУЗКИ КАРТИНОК ---
router.post('/upload', protect, adminOnly, upload.array('images', 5), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "Файлы не выбраны" });
    }

    const urls = req.files.map(file => file.path);
    console.log("✅ Фото загружены в Cloudinary:", urls);
    res.json({ urls });
  } catch (error) {
    console.error('❌ Ошибка загрузки в Cloudinary:', error);
    res.status(500).json({ message: "Ошибка сервера при загрузке изображений", error: error.message });
  }
});

// --- РОУТЫ ДЛЯ ТОВАРОВ ---

// 1. Добавить новый товар
router.post('/products', protect, adminOnly, async (req, res) => {
  try {
    const { 
      title, brand, price, oldPrice, images, 
      description, category, sizes, sku, countInStock 
    } = req.body;

    if (!title || !price) {
      return res.status(400).json({ message: "Название и цена обязательны!" });
    }

    const product = new Product({
      title,
      brand: brand || "No Brand",
      price: Number(price),
      oldPrice: oldPrice ? Number(oldPrice) : 0,
      images: Array.isArray(images) ? images : [images],
      description: description || "Описание отсутствует",
      category: category || "sneakers",
      sizes: sizes || ["38", "39", "40", "41", "42", "43", "44"],
      sku: sku || `SKU-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      countInStock: countInStock || 10,
      owner: req.user._id // Используем _id для консистентности
    });

    const createdProduct = await product.save();

    // 🔥 Теперь бот будет писать и при добавлении через сайт
    sendTelegramNotification('NEW_PRODUCT', {
      productName: `${product.brand} ${product.title}`,
      price: product.price,
      countInStock: product.countInStock,
      size: product.sizes.join(', ')
    }).catch(e => console.log("Ошибка TG бота:", e.message));

    res.status(201).json(createdProduct);
  } catch (error) {
    console.error("❌ Ошибка при создании товара:", error.message);
    res.status(500).json({ message: "Ошибка при создании товара", error: error.message });
  }
});

// 2. Обновить товар
router.put('/products/:id', protect, adminOnly, async (req, res) => {
  try {
    const updateData = req.body;
    
    if (updateData.price) updateData.price = Number(updateData.price);
    if (updateData.oldPrice) updateData.oldPrice = Number(updateData.oldPrice);

    const product = await Product.findByIdAndUpdate(
      req.params.id, 
      { $set: updateData }, 
      { new: true } 
    );

    if (!product) {
      return res.status(404).json({ message: "Товар не найден" });
    }

    // Уведомление об обновлении
    sendTelegramNotification('PRODUCT_UPDATED', {
        productName: product.title,
        price: product.price,
        countInStock: product.countInStock
    }).catch(() => {});

    res.json(product);
  } catch (error) {
    console.error("❌ Ошибка при обновлении товара:", error.message);
    res.status(500).json({ message: "Ошибка при обновлении", error: error.message });
  }
});

// 3. Удалить товар
router.delete('/products/:id', protect, adminOnly, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
        return res.status(404).json({ message: "Товар не найден" });
    }

    sendTelegramNotification('PRODUCT_DELETED', {
        productName: product.title,
        productId: product._id
    }).catch(() => {});

    res.json({ message: "Товар успешно удален" });
  } catch (error) {
    res.status(500).json({ message: "Ошибка при удалении" });
  }
});

module.exports = router;