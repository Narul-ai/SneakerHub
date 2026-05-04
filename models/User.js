const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Имя обязательно'],
    trim: true 
  },
  username: { 
    type: String, 
    unique: true, 
    sparse: true, 
    trim: true,
    lowercase: true
  },
  email: { 
    type: String, 
    required: [true, 'Email обязателен'], 
    unique: true, 
    lowercase: true,
    trim: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Введите корректный email']
  },
  password: { 
    type: String, 
    required: [true, 'Пароль обязателен'],
    minlength: [6, 'Пароль должен быть не менее 6 символов']
  },
  phoneNumber: {
    type: String,
    default: '' 
  },
  avatar: {
    type: String,
    default: 'https://cdn-icons-png.flaticon.com/512/149/149071.png' 
  },
  role: { 
    type: String, 
    enum: ['user', 'admin'], 
    default: 'user' 
  },
  telegramId: {
    type: String,
    default: '' 
  },
  // --- НОВОЕ ПОЛЕ: ИЗБРАННОЕ ---
  wishlist: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product' // Ссылка на модель товара
    }
  ]
}, { 
  timestamps: true,
  toJSON: {
    transform(doc, ret) {
      delete ret.password;
      delete ret.__v;
      // Поле wishlist оставляем, чтобы фронтенд знал, какие товары в избранном
    }
  }
});

// --- ХЕШИРОВАНИЕ ПАРОЛЯ ---
userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (error) {
    throw error;
  }
});

// Метод для сравнения паролей
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);