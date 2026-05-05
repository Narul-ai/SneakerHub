require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const sendTelegramNotification = require('./utils/telegram');

const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const dataRoutes = require('./routes/dataRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
// Render использует переменную PORT, важно оставить 10000 как альтернативу
const PORT = process.env.PORT || 10000;

// --- Middleware ---
const allowedOrigins = [
    'http://localhost:3000',
    'https://sneaker-hub-frontend.vercel.app'
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

app.use(express.json()); 
app.use(express.static('public')); 
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => {
    res.send('SneakerHub API is running...');
});

// --- Подключение роутов ---
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/admin', adminRoutes);

// --- База данных и запуск ---
const MONGO_URI = process.env.MONGO_URI;

// Лог для проверки переменной
console.log("🛠 Проверка MONGO_URI:", MONGO_URI ? "Доступен ✅" : "ОТСУТСТВУЕТ ❌");

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB подключена успешно');
    app.listen(PORT, '0.0.0.0', async () => {
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
    // Не выходим из процесса сразу, чтобы увидеть логи в Render
  });