const Data = require('../models/Data');

// 1. Получить данные (с сортировкой по дате — новые сверху)
exports.getData = async (req, res) => {
  try {
    // В профи-сайтах данные всегда сортируются: .sort({ createdAt: -1 })
    const data = await Data.find({ user: req.user.id }).sort({ createdAt: -1 });
    
    // Если данных нет, возвращаем пустой массив (это норма, не ошибка)
    res.json(data);
  } catch (error) {
    console.error('Ошибка получения данных:', error);
    res.status(500).json({ message: 'Не удалось загрузить ваши данные' });
  }
};

// 2. Создать запись (с валидацией входящих данных)
exports.createData = async (req, res) => {
  try {
    const { text, number, items, totalPrice } = req.body;

    // Профессиональная проверка: не пустые ли данные?
    if (!text && !items) {
      return res.status(400).json({ message: 'Данные для записи отсутствуют' });
    }

    const newData = await Data.create({
      text,
      number,
      items: items || [], // Поле для массива товаров (если это заказ)
      totalPrice: totalPrice || 0,
      user: req.user.id // Привязка к текущему авторизованному юзеру
    });

    res.status(201).json(newData);
  } catch (error) {
    console.error('Ошибка создания:', error);
    res.status(500).json({ message: 'Ошибка при сохранении данных' });
  }
};

// 3. Удалить запись (с проверкой на существование)
exports.deleteData = async (req, res) => {
  try {
    const deletedItem = await Data.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id // Безопасность: удаляем только СВОЁ
    });

    if (!deletedItem) {
      return res.status(404).json({ message: 'Запись не найдена или у вас нет прав на удаление' });
    }

    res.json({ message: 'Запись успешно удалена', id: req.params.id });
  } catch (error) {
    console.error('Ошибка удаления:', error);
    res.status(500).json({ message: 'Не удалось удалить запись' });
  }
};

// 4. Обновить запись (частичное обновление через $set)
exports.updateData = async (req, res) => {
  try {
    const { text, number } = req.body;

    const updated = await Data.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { $set: { text, number } }, // Используем $set для безопасности
      { new: true, runValidators: true } // runValidators проверит данные по схеме
    );

    if (!updated) {
      return res.status(404).json({ message: 'Запись для обновления не найдена' });
    }

    res.json(updated);
  } catch (error) {
    console.error('Ошибка обновления:', error);
    res.status(500).json({ message: 'Ошибка при обновлении данных' });
  }
};