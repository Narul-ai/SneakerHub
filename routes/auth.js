const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Забираем секрет из .env (никогда не пиши его строкой в коде)
const JWT_SECRET = process.env.JWT_SECRET;

router.post('/login', async (req, res) => {
  const { identifier, password } = req.body; // Используем identifier (может быть и почтой, и логином)
  
  console.log("--> Попытка входа:", identifier);

  try {
    // 1. Ищем пользователя (либо по username, либо по email)
    const user = await User.findOne({
      $or: [
        { username: identifier?.toLowerCase() },
        { email: identifier?.toLowerCase() }
      ]
    });

    if (!user) {
      console.log("X Юзер не найден в базе");
      return res.status(401).json({ message: "Неверный логин или пароль" });
    }

    // 2. Сравниваем пароли
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log("X Пароль не совпал");
      return res.status(401).json({ message: "Неверный логин или пароль" });
    }

    // 3. Создаем токен (включаем роль для фронтенда)
    const token = jwt.sign(
      { id: user._id, role: user.role }, 
      JWT_SECRET, 
      { expiresIn: '30d' } // Для профи-сайта лучше 30 дней
    );

    console.log(`✅ Успешный вход: ${user.username} [${user.role}]`);

    // 4. Отправляем полные данные, чтобы фронтенду было легче
    res.json({ 
      token, 
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role
      } 
    });

  } catch (err) {
    console.error("! Ошибка на сервере:", err);
    res.status(500).json({ message: "Внутренняя ошибка сервера" });
  }
});

module.exports = router;