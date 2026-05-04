const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  name: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
  },
}, {
  timestamps: true 
});

const productSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Название товара обязательно'],
    trim: true,
    index: true
  },
  brand: {
    type: String,
    required: [true, 'Укажите бренд'],
    trim: true
  },
  description: {
    type: String,
    default: 'Описание появится позже.'
  },
  price: {
    type: Number,
    required: [true, 'Цена обязательна'],
    min: 0
  },
  oldPrice: { 
    type: Number,
    default: 0 
  },
  images: { 
    type: [String], 
    required: [true, 'Добавьте фото']
  },
  sizes: {
    type: [String],
    required: true
  },
  category: { 
    type: String, // 🔥 Убрал строгий enum, чтобы не блокировал сохранение из Postman
    required: true,
    default: 'sneakers'
  },
  countInStock: {
    type: Number,
    required: true,
    default: 10
  },
  reviews: [reviewSchema],
  rating: {
    type: Number,
    required: true,
    default: 0,
  },
  numReviews: {
    type: Number,
    required: true,
    default: 0,
  },
  owner: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  }
}, { timestamps: true });

productSchema.index({ title: 'text', brand: 'text' });

module.exports = mongoose.model('Product', productSchema);