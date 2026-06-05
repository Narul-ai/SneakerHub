const Data = require('../models/Data');
const User = require('../models/User'); // Подключаем модель юзера, чтобы брать их telegramId
const sendTelegramNotification = require('../utils/telegram');

// 1. Получить данные (с сортировкой по дате — новые сверху)
exports.getData = async (req, res) => {
  try {
    // Если это админ — отдаем все заказы системы, если обычный юзер — только его личные
    const query = req.user.role === 'admin' ? {} : { user: req.user.id };
    
    const data = await Data.find(query).sort({ createdAt: -1 });
    res.json(data);
  } catch (error) {
    console.error('Ошибка получения данных:', error);
    res.status(500).json({ message: 'Не удалось загрузить ваши данные' });
  }
};

// 2. Создать запись / Оформить заказ (с валидацией и уведомлением админа)
exports.createData = async (req, res) => {
  try {
    const { text, number, items, totalPrice } = req.body;

    if (!text && !items) {
      return res.status(400).json({ message: 'Данные для записи отсутствуют' });
    }

    const newData = await Data.create({
      text, // Здесь может храниться адрес или комментарий
      number,
      items: items || [], 
      totalPrice: totalPrice || 0,
      status: 'Pending', // Начальный статус заказа
      user: req.user.id 
    });

    // Оповещаем ТЕБЯ в телеграм, что на сайте SneakerHub новый заказ!
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

// 3. Удалить запись (с проверкой прав)
exports.deleteData = async (req, res) => {
  try {
    // Админ может удалить любую запись, пользователь — только свою
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

// 4. Обновить запись / Изменить статус заказа (Админ -> Пользователю)
exports.updateData = async (req, res) => {
  try {
    const { text, number, status } = req.body;

    // СВЕРХВАЖНО ДЛЯ АДМИНКИ: Если обновляет админ, убираем привязку к req.user.id,
    // чтобы ты мог менять статусы заказов других пользователей!
    const query = { _id: req.params.id };
    if (req.user.role !== 'admin') {
      query.user = req.user.id;
    }

    // Собираем поля для динамического обновления через $set
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
      return res.status(404).json({ message: 'Запись для обновления не найдена' });
    }

    // --- УВЕДОМЛЕНИЯ КЛИЕНТАМ О СМЕНЕ СТАТУСА ---
    if (status) {
      try {
        // Находим покупателя, которому принадлежит этот заказ
        const customer = await User.findById(updated.user);

        if (customer && customer.telegramId) { // 👈 Проверяем telegramId вместо telegramChatId
          // Если ты выставил статус "В пути" или "Shipped"
          if (status === 'В пути' || status === 'Shipped') {
            sendTelegramNotification('ORDER_SHIPPED', {
              orderId: updated._id,
              customerName: customer.name || 'Customer'
            }, customer.telegramId); // 👈 Передаем корректный telegramId
          } 
          // Если заказ успешно завершен
          else if (status === 'Completed' || status === 'Завершен') {
            sendTelegramNotification('ORDER_COMPLETED', {
              orderId: updated._id,
              customerName: customer.name || 'Customer',
              totalPrice: updated.totalPrice
            }, customer.telegramId); // 👈 Передаем корректный telegramId
          }
        }
      } catch (userErr) {
        console.error('⚠️ Ошибка отправки статуса пользователю в ТГ:', userErr.message);
      }
    }

    res.json(updated);
  } catch (error) {
    console.error('Ошибка обновления:', error);
    res.status(500).json({ message: 'Ошибка при обновлении данных' });
  }
};