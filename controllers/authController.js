const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sendTelegramNotification = require('../utils/telegram'); // 🔥 Подключили бота

// Вспомогательная функция для создания токена
const createToken = (id, role) => {
  return jwt.sign(
    { id, role }, 
    process.env.JWT_SECRET, 
    { expiresIn: '30d' } 
  );
};

// --- РЕГИСТРАЦИЯ ---
exports.register = async (req, res) => {
  try {
    const { name, email, username, password } = req.body;

    if (!password || !email) {
      return res.status(400).json({ message: 'Пожалуйста, заполните почту и пароль' });
    }

    const checkEmail = email.toLowerCase();
    const checkUsername = (username || email.split('@')[0]).toLowerCase();

    const existingUser = await User.findOne({ 
      $or: [{ email: checkEmail }, { username: checkUsername }] 
    });
    
    if (existingUser) {
      return res.status(400).json({ message: 'Пользователь с таким Email или Логином уже существует' });
    }

    const user = new User({
      name: name || checkUsername,
      username: checkUsername,
      email: checkEmail,
      password: password, 
      role: 'user'
    });

    await user.save();

    const token = createToken(user._id, user.role);

    // 🔥 Уведомляем админа о новом юзере
    sendTelegramNotification('USER_REGISTERED', {
        name: user.name,
        email: user.email,
        username: user.username
    }).catch(() => {});

    res.status(201).json({ 
      token, 
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Ошибка регистрации:', error);
    res.status(500).json({ message: 'Ошибка при создании аккаунта', error: error.message });
  }
};

// --- ВХОД ---
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Введите логин и пароль' });
    }

    const searchStr = email.toLowerCase();

    const user = await User.findOne({ 
      $or: [{ email: searchStr }, { username: searchStr }] 
    });

    if (!user) {
      return res.status(401).json({ message: 'Пользователь не найден' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Неверный пароль' });
    }

    const token = createToken(user._id, user.role);

    // 🔥 Уведомляем, если в панель вошел админ (защита)
    if (user.role === 'admin') {
        sendTelegramNotification('ADMIN_LOGIN', {
            name: user.name,
            email: user.email
        }).catch(() => {});
    }

    res.json({ 
      token, 
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        role: user.role,
        email: user.email,
        wishlist: user.wishlist 
      }
    });

  } catch (error) {
    console.error('Ошибка входа:', error);
    res.status(500).json({ message: 'Ошибка сервера при входе' });
  }
};

// --- ПОЛУЧЕНИЕ ПРОФИЛЯ ---
exports.getProfile = async (req, res) => {
  try {
    // 🔥 Теперь req.user всегда будет 100% верным из-за нового middleware
    res.json(req.user);
  } catch (error) {
    console.error('Ошибка при получении профиля:', error);
    res.status(500).json({ message: 'Ошибка сервера при загрузке профиля' });
  }
};

// --- ИЗБРАННОЕ ---
exports.toggleWishlist = async (req, res) => {
  try {
    const { productId } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }

    const isWishlisted = user.wishlist.includes(productId);

    if (isWishlisted) {
      user.wishlist = user.wishlist.filter(id => id.toString() !== productId);
    } else {
      user.wishlist.push(productId);
    }

    await user.save();
    res.json(user.wishlist); 
  } catch (error) {
    console.error('Ошибка Wishlist Toggle:', error);
    res.status(500).json({ message: "Ошибка при обновлении списка избранного" });
  }
};

exports.getWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('wishlist');
    
    if (!user) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }

    res.json(user.wishlist);
  } catch (error) {
    console.error('Ошибка получения Wishlist:', error);
    res.status(500).json({ message: "Ошибка при загрузке избранных товаров" });
  }
};