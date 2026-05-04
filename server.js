require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const sendTelegramNotification = require('./utils/telegram');

// Импорт роутов
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const dataRoutes = require('./routes/dataRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// --- Middleware ---
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));

app.use(express.json()); 
app.use(express.static('public')); 

// Если у тебя есть локальные превью, оставляем, но Cloudinary в приоритете
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Логирование админ-действий
app.use((req, res, next) => {
  if (req.path.startsWith('/api/admin')) {
    console.log(`[ADMIN ACTION] ${req.method} ${req.path} - ${new Date().toLocaleTimeString()}`);
  }
  next();
});

// --- Подключение роутов ---
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/admin', adminRoutes);

// --- Обработка 404 ---
app.use((req, res, next) => {
    res.status(404).json({ message: `Роут ${req.originalUrl} не найден на сервере` });
});

// --- Глобальная обработка ошибок ---
app.use((err, req, res, next) => {
  console.log("❌ КРИТИЧЕСКАЯ ОШИБКА:");
  console.error(err.stack); 
  res.status(err.status || 500).json({ 
    message: "Внутренняя ошибка сервера", 
    error: err.message || "Неизвестная ошибка" 
  });
});

// --- Подключение к БД и запуск ---
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/my-marketplace';

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB подключена успешно');
    app.listen(PORT, async () => {
      console.log(`🚀 Сервер запущен на порту ${PORT}`);
      
      try {
          await sendTelegramNotification('SERVER_STARTED', { port: PORT });
      } catch (e) {
          console.error("Ошибка уведомления в ТГ:", e.message);
      }
    });
  })
  .catch(err => {
    console.error('❌ Ошибка подключения к БД:', err.message);
  });