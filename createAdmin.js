const mongoose = require('mongoose');
const User = require('../models/User'); // Убедись, что путь правильный (на уровень выше)
require('dotenv').config({ path: '../.env' }); // Подгружаем конфиг, чтобы не хардкодить URI

const createAdmin = async () => {
  try {
    // Используем URI из .env или локальный, если .env не подцепился
    const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/my-marketplace";
    await mongoose.connect(uri);
    console.log("📡 Подключено к базе для создания админа...");

    const adminData = {
      name: "Главный Админ",
      username: "admin2025",
      email: "admin@marketplace.kz", // Добавляем почту, так как она обязательна в модели
      password: "nara055nor", 
      role: "admin" // Явно указываем роль!
    };

    // Проверяем по email или username
    const existingUser = await User.findOne({ 
      $or: [{ email: adminData.email }, { username: adminData.username }] 
    });

    if (existingUser) {
      console.log("⚠️ Админ с такими данными уже существует!");
      process.exit();
    }

    // ВАЖНО: Мы не хешируем пароль здесь вручную! 
    // В нашей модели User.js уже есть pre('save') хук, который сделает это за нас.
    // Если захешируем здесь, а потом модель захеширует еще раз — пароль не подойдет.

    const admin = new User(adminData);

    await admin.save();
    console.log("✅ Админ успешно создан!");
    console.log(`Логин: ${adminData.username}`);
    console.log(`Пароль: ${adminData.password}`);
    
    process.exit();
  } catch (err) {
    console.error("❌ Ошибка при создании админа:", err.message);
    process.exit(1);
  }
};

createAdmin();