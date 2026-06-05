const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const User = require('../models/User'); // Подключаем модель User, чтобы найти telegramId
const { protect, adminOnly } = require('../middleware/authMiddleware');
const sendTelegramNotification = require('../utils/telegram');

// 1. Получение ВСЕХ заказов (ТОЛЬКО ДЛЯ АДМИНА)
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('user', 'name email username') 
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: "Ошибка получения заказов" });
  }
});

// 2. Личный кабинет пользователя
router.get('/my-orders', protect, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    console.error("Ошибка в my-orders:", error);
    res.status(500).json({ message: "Ошибка получения истории заказов" });
  }
});

// 3. Создание заказа (С уведомлением в Telegram)
router.post('/', protect, async (req, res) => {
  try {
    const { items, totalPrice, shippingInfo } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "Корзина пуста" });
    }

    const finalShippingInfo = {
      customerName: shippingInfo?.customerName || req.user.name,
      phoneNumber: shippingInfo?.phoneNumber || req.user.phoneNumber || "Номер не указан",
      address: shippingInfo?.address || "Самовывоз"
    };

    if (!finalShippingInfo.customerName) {
      return res.status(400).json({ message: "Не удалось определить имя заказчика" });
    }

    const newOrder = new Order({
      items,
      totalPrice,
      shippingInfo: finalShippingInfo, 
      user: req.user.id 
    });

    const savedOrder = await newOrder.save();

    // 🔥 Уведомление боту о новом заказе
    sendTelegramNotification('NEW_ORDER', {
        orderId: savedOrder._id,
        customerName: savedOrder.shippingInfo.customerName,
        totalPrice: savedOrder.totalPrice,
        address: savedOrder.shippingInfo.address
    }).catch(e => console.log("❌ Ошибка ТГ при создании заказа:", e.message));

    res.status(201).json(savedOrder);
  } catch (err) {
    console.error("Ошибка сохранения заказа:", err);
    res.status(500).json({ 
      message: "Ошибка при оформлении", 
      error: err.message 
    });
  }
});

// 4. Обновление статуса (ТЕПЕРЬ С ИСПРАВЛЕННОЙ ОТПРАВКОЙ КЛИЕНТУ)
router.patch('/:id/status', protect, adminOnly, async (req, res) => {
  try {
    const { status } = req.body;
    
    console.log(`🛠️ [PATCH status] Запрос на смену статуса заказа ${req.params.id} на: "${status}"`);

    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id, 
      { status: status }, 
      { new: true }
    );

    if (!updatedOrder) return res.status(404).json({ message: "Заказ не найден" });

    // 🔥 Находим клиента, который сделал этот заказ, чтобы взять его telegramId
    try {
      const customer = await User.findById(updatedOrder.user);
      
      if (customer && customer.telegramId) {
        console.log(`👤 [PATCH status] Клиент найден: ${customer.name}, его Telegram ID: ${customer.telegramId}`);

        // Уведомляем бота в зависимости от нового статуса
        if (status === 'Shipped' || status === 'В пути') {
            console.log("✈️ Запуск отправки ORDER_SHIPPED...");
            await sendTelegramNotification('ORDER_SHIPPED', {
                orderId: updatedOrder._id,
                customerName: updatedOrder.shippingInfo.customerName
            }, customer.telegramId); // 👈 Передаем telegramId клиента третьим аргументом!
        } 
        else if (status === 'Completed' || status === 'Завершен') {
            console.log("🏁 Запуск отправки ORDER_COMPLETED...");
            await sendTelegramNotification('ORDER_COMPLETED', {
                orderId: updatedOrder._id,
                customerName: updatedOrder.shippingInfo.customerName,
                totalPrice: updatedOrder.totalPrice
            }, customer.telegramId); // 👈 Передаем telegramId клиента третьим аргументом!
        } else {
            console.log(`ℹ️ Статус "${status}" не требует отправки уведомления клиенту.`);
        }
      } else {
        console.log("⚠️ Уведомление клиенту пропущено: пользователь не найден или у него нет привязанного telegramId.");
      }
    } catch (botErr) {
      console.error("❌ Ошибка при подготовке отправки ТГ сообщения:", botErr.message);
    }

    res.json(updatedOrder);
  } catch (error) {
    console.error("❌ Ошибка обновления статуса в роуте:", error);
    res.status(500).json({ message: "Ошибка обновления статуса" });
  }
});

// 5. Удаление (ТОЛЬКО ДЛЯ АДМИНА)
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) return res.status(404).json({ message: "Заказ не найден" });
    res.json({ message: "Заказ удален из базы" });
  } catch (error) {
    res.status(500).json({ message: "Ошибка удаления" });
  }
});

module.exports = router;