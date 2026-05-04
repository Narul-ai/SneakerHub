const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Настройки для стабильного соединения
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      autoIndex: true, // Помогает создавать индексы (нужно для уникальных email)
    });

    console.log(`✅ MongoDB подключена: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ Ошибка подключения: ${error.message}`);
    // Если база не подключилась, останавливаем сервер, иначе всё упадет позже
    process.exit(1);
  }
};

// Добавляем слушателей событий для "живого" мониторинга
mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ Соединение с MongoDB разорвано. Пытаюсь переподключиться...');
});

mongoose.connection.on('error', (err) => {
  console.error(`🔥 Ошибка базы данных: ${err}`);
});

module.exports = connectDB;