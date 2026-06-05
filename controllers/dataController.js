const Data = require('../models/Data');
const User = require('../models/User'); 
const sendTelegramNotification = require('../utils/telegram');

// 1. Получить данные
exports.getData = async (req, res) => {
  try {
    const query = req.user.role === 'admin' ? {} : { user: req.user.id };
    const data = await Data.find(query).sort({ createdAt: -1 });
    res.json(data);
  } catch (error) {
    console.error('Ошибка получения данных:', error);
    res.status(500).json({ message: 'Не удалось загрузить ваши данные' });
  }
};

// 2. Создать запись
exports.createData = async (req, res) => {
  try {
    const { text, number, items, totalPrice } = req.body;

    if (!text && !items) {
      return res.status(400).json({ message: 'Данные для записи отсутствуют' });
    }

    const newData = await Data.create({
      text, 
      number,
      items: items || [], 
      totalPrice: totalPrice || 0,
      status: 'Pending', 
      user: req.user.id 
    });

    sendTelegramNotification('NEW_ORDER', {
      orderId: newData._id,
      customerName: req.user.name || 'Authorized Client',
      totalPrice: newData.totalPrice,
      address: text || 'Not provided'
    });

    res.status(201).json(newData);
  } catch (error) {
    console.error('Ошибка создания:', error);
    res.status(500).json({ message: 'Ошибка при сохранении данных' });
  }
};

// 3. Удалить запись
exports.deleteData = async (req, res) => {
  try {
    const query = { _id: req.params.id };
    if (req.user.role !== 'admin') {
      query.user = req.user.id;
    }

    const deletedItem = await Data.findOneAndDelete(query);

    if (!deletedItem) {
      return res.status(404).json({ message: 'Запись не найдена или у вас нет прав на удаление' });
    }

    res.json({ message: 'Запись успешно удалена', id: req.params.id });
  } catch (error) {
    console.error('Ошибка удаления:', error);
    res.status(500).json({ message: 'Не удалось удалить запись' });
  }
};

// 4. Обновить запись (С ПОЛНЫМ ЛОГИРОВАНИЕМ ДЛЯ ТЕСТА)
exports.updateData = async (req, res) => {
  try {
    const { text, number, status } = req.body;
    
    // 🔍 ЛОГ 1: Проверяем, пришёл ли вообще запрос в этот контроллер
    console.log("🛠️ [updateData] Контроллер вызван! ID заказа:", req.params.id, "Полученный статус:", status);

    const query = { _id: req.params.id };
    if (req.user.role !== 'admin') {
      query.user = req.user.id;
    }

    const updateFields = {};
    if (text !== undefined) updateFields.text = text;
    if (number !== undefined) updateFields.number = number;
    if (status !== undefined) updateFields.status = status;

    const updated = await Data.findOneAndUpdate(
      query,
      { $set: updateFields }, 
      { new: true, runValidators: true } 
    );

    if (!updated) {
      console.log("⚠️ [updateData] Заказ в базе данных не найден по запросу:", query);
      return res.status(404).json({ message: 'Запись для обновления не найдена' });
    }

    console.log("✅ [updateData] Заказ успешно обновлен в БД. Текущий статус заказа:", updated.status);

    if (status) {
      try {
        // Ищем покупателя
        console.log("🔍 [updateData] Ищем пользователя с ID:", updated.user);
        const customer = await User.findById(updated.user);

        if (!customer) {
          console.log("❌ [updateData] Пользователь, владеющий заказом, НЕ НАЙДЕН в коллекции users!");
        } else {
          console.log(`👤 [updateData] Пользователь найден: ${customer.name}. Его telegramId в базе:`, customer.telegramId);
        }

        if (customer && customer.telegramId) {
          console.log(`🚀 [updateData] Проверка условий для отправки. Текст статуса: "${status}"`);
          
          if (status === 'В пути' || status === 'Shipped') {
            console.log("✈️ [updateData] Условие Shipped сработало! Запускаем отправку...");
            sendTelegramNotification('ORDER_SHIPPED', {
              orderId: updated._id,
              customerName: customer.name || 'Customer'
            }, customer.telegramId); 
          } 
          else if (status === 'Completed' || status === 'Завершен') {
            console.log("🏁 [updateData] Условие Completed сработало! Запускаем отправку...");
            sendTelegramNotification('ORDER_COMPLETED', {
              orderId: updated._id,
              customerName: customer.name || 'Customer',
              totalPrice: updated.totalPrice
            }, customer.telegramId); 
          } else {
            console.log(`ℹ️ [updateData] Статус "${status}" не подходит ни под одно условие отправки уведомления клиенту.`);
          }
        } else if (customer && !customer.telegramId) {
          console.log("⚠️ [updateData] Отмена отправки: у пользователя отсутствует или пустой telegramId!");
        }
      } catch (userErr) {
        console.error('⚠️ Ошибка отправки статуса пользователю в ТГ:', userErr.message);
      }
    }

    res.json(updated);
  } catch (error) {
    console.error('❌ Ошибка обновления в контроллере:', error);
    res.status(500).json({ message: 'Ошибка при обновлении данных' });
  }
};