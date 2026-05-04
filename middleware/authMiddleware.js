const jwt = require('jsonwebtoken');
const User = require('../models/User'); // 🔥 Добавили модель

// 1. Основная проверка: Залогинен ли пользователь?
exports.protect = async (req, res, next) => {
  let token;

  // Проверяем наличие токена в заголовках
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Доступ запрещен. Войдите в систему.' });
  }

  try {
    // Декодируем токен
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 🔥 ИСПРАВЛЕНИЕ: Теперь берем реального юзера из базы. Это решает 100% проблем с ID!
    req.user = await User.findById(decoded.id || decoded._id).select('-password');

    if (!req.user) {
        return res.status(401).json({ message: 'Пользователь больше не существует' });
    }

    console.log(`👤 Auth Check: User ${req.user._id} (Role: ${req.user.role}) is authenticated`);
    next();
  } catch (error) {
    console.error('❌ JWT Error:', error.message);
    res.status(401).json({ message: 'Сессия истекла. Войдите заново.' });
  }
};

// 2. Проверка прав: Является ли пользователь админом?
exports.adminOnly = (req, res, next) => {
  console.log(`🔐 Admin Check: Current role is "${req.user ? req.user.role : 'undefined'}"`);

  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    console.log("🚫 Admin Check: Access Denied");
    res.status(403).json({ message: 'Доступ запрещен. Требуются права администратора.' });
  }
};