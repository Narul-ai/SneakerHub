const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  // Номер заказа: SH-123456
  orderNumber: {
    type: String,
    unique: true,
    default: () => `SH-${Math.floor(100000 + Math.random() * 900000)}`
  },

  // Связь с пользователем
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },

  // Данные для доставки (могут отличаться от данных в профиле)
  shippingInfo: {
    customerName: { type: String, required: true },
    phoneNumber: { type: String, required: true }, // Критично для ТГ-бота и курьера
    address: { type: String, default: "Самовывоз" }
  },

  items: [
    {
      product: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Product',
        required: true 
      },
      title: { type: String, required: true },
      price: { type: Number, required: true },
      size: { type: String, required: true }, // String лучше, так как бывают размеры типа "42.5" или "XL"
      image: String,
      quantity: { type: Number, default: 1 }
    }
  ],

  totalPrice: { 
    type: Number, 
    required: true,
    min: 0 
  },

  status: {
    type: String,
    enum: ['Новый', 'Обработка', 'В пути', 'Доставлен', 'Отменен'],
    default: 'Новый'
  },

  paymentStatus: {
    type: String,
    enum: ['Ожидает оплаты', 'Оплачено', 'Возврат'],
    default: 'Ожидает оплаты'
  },

  // Для ТГ-бота: пометка, уведомлен ли админ о новом заказе
  isnotified: {
    type: Boolean,
    default: false
  }

}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);