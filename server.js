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
// Render сам подставит нужный порт, а на ноуте будет 5000
const PORT = process.env.PORT || 5000;

// --- Middleware ---
const allowedOrigins = [
    'http://localhost:3000',
    'https://sneaker-hub-frontend.vercel.app' // Твоя ссылка на фронтенд
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(null, 'Not allowed by CORS');
        }
    },
    credentials: true
}));

app.use(express.json()); 
app.use(express.static('public')); 
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Для проверки, что сервер жив (health check)
app.get('/', (req, res) => {
    res.send('SneakerHub API is running...');
});

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

app.use((req, res) => {
    res.status(404).json({ message: `Роут ${req.originalUrl} не найден` });
});

app.use((err, req, res, next) => {
  console.error("❌ ОШИБКА СЕРВЕРА:", err.stack); 
  res.status(err.status || 500).json({ 
    message: "Внутренняя ошибка сервера", 
    error: err.message 
  });
});

// --- База данных и запуск ---
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB подключена успешно');
    app.listen(PORT, async () => {
      console.log(`🚀 Сервер взлетел на порту ${PORT}`);
      
      try {
          await sendTelegramNotification('SERVER_STARTED', { port: PORT });
      } catch (e) {
          console.error("Ошибка уведомления в ТГ:", e.message);
      }
    });
  })
  .catch(err => {
    console.error('❌ Ошибка подключения к БД:', err.message);
    process.exit(1); // Завершаем процесс, если база не подключилась
  });