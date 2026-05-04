const mongoose = require('mongoose');

const dataSchema = new mongoose.Schema({
  // Список купленных товаров
  items: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
      },
      title: String,
      price: Number,
      quantity: { type: Number, default: 1 },
      size: String // Важно для кроссовок!
    }
  ],
  
  // Общая сумма заказа
  totalPrice: {
    type: Number,
    required: true,
    default: 0
  },

  // Статус заказа (для админки)
  status: {
    type: String,
    enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'],
    default: 'Pending'
  },

  // Комментарий или адрес доставки
  address: {
    type: String,
    default: 'Самовывоз'
  },

  // Привязка к пользователю
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { 
  timestamps: true // Автоматически создаст createdAt (дата заказа) и updatedAt
});

module.exports = mongoose.model('Data', dataSchema);