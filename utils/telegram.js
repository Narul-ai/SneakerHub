const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config(); 

const token = process.env.TELEGRAM_TOKEN;
const adminChatId = process.env.ADMIN_CHAT_ID;

// Включаем polling: true, чтобы бот мог "слышать" нажатия на кнопки
const bot = token ? new TelegramBot(token, { polling: true }) : null;

// Обработка нажатий на кнопки (Callback Queries)
if (bot) {
    bot.on('callback_query', async (callbackQuery) => {
        const { data, message } = callbackQuery;
        const chatId = message.chat.id;

        // Здесь будет логика обработки (например, вызов API для смены статуса в базе)
        if (data.startsWith('confirm_order_')) {
            const orderId = data.replace('confirm_order_', '');
            await bot.sendMessage(chatId, `⏳ Запрос на подтверждение заказа <code>${orderId}</code> отправлен в систему...`, { parse_mode: 'HTML' });
        } 
        else if (data.startsWith('cancel_order_')) {
            const orderId = data.replace('cancel_order_', '');
            await bot.sendMessage(chatId, `❌ Запрос на отмену заказа <code>${orderId}</code> отправлен...`, { parse_mode: 'HTML' });
        }

        // Убираем "часики" на кнопке в Telegram
        bot.answerCallbackQuery(callbackQuery.id);
    });
}

const sendTelegramNotification = async (type, data) => {
    try {
        console.log(`📡 TG Bot: Начинаю отправку [${type}]`);

        if (!bot) {
            console.log('⚠️ TG Bot: Отсутствует TELEGRAM_TOKEN в .env');
            return;
        }
        if (!adminChatId) {
            console.log('⚠️ TG Bot: Отсутствует ADMIN_CHAT_ID в .env');
            return;
        }

        let message = '';
        let options = { parse_mode: 'HTML' }; // Настройки сообщения (по умолчанию только HTML)
        
        let timestamp = new Date().toLocaleString('ru-RU');
        try {
            timestamp = new Date().toLocaleString('ru-RU', { 
                timeZone: 'Asia/Almaty',
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit'
            });
        } catch (timeErr) {
            console.log("⚠️ TG Bot: Ошибка таймзоны, используем стандартное время сервера.");
        }

        switch (type) {
            case 'SERVER_STARTED':
                message = [
                    `<b>🟢 СЕРВЕР ЗАПУЩЕН</b>`,
                    `━━━━━━━━━━━━━━━━━━`,
                    `<b>🚀 Порт:</b> <code>${data.port}</code>`,
                    `<b>🌐 Статус БД:</b> Подключено`,
                    `━━━━━━━━━━━━━━━━━━`,
                    `📅 <i>${timestamp}</i>`
                ].join('\n');
                break;

            case 'NEW_ORDER':
                message = [
                    `<b>📦 ПОСТУПИЛ НОВЫЙ ЗАКАЗ!</b>`,
                    `━━━━━━━━━━━━━━━━━━`,
                    `<b>🆔 ID:</b> <code>${data.orderId}</code>`,
                    `<b>👤 Клиент:</b> <code>${data.customerName}</code>`,
                    `<b>💰 Сумма:</b> <code>$${data.totalPrice}</code>`,
                    `<b>📍 Адрес:</b> <i>${data.address || 'Не указан'}</i>`,
                    `━━━━━━━━━━━━━━━━━━`,
                    `📅 <i>${timestamp}</i>`
                ].join('\n');
                
                // Добавляем кнопки управления
                options.reply_markup = {
                    inline_keyboard: [
                        [
                            { text: '✅ Подтвердить', callback_data: `confirm_order_${data.orderId}` },
                            { text: '❌ Отменить', callback_data: `cancel_order_${data.orderId}` }
                        ]
                    ]
                };
                break;

            case 'ORDER_SHIPPED':
                message = [
                    `<b>🚚 ЗАКАЗ В ПУТИ</b>`,
                    `━━━━━━━━━━━━━━━━━━`,
                    `<b>🆔 ID:</b> <code>${data.orderId}</code>`,
                    `<b>👤 Клиент:</b> <code>${data.customerName}</code>`,
                    `<b>🏁 Статус:</b> ⚡ ОТПРАВЛЕНО / В ПУТИ`,
                    `━━━━━━━━━━━━━━━━━━`,
                    `📅 <i>${timestamp}</i>`
                ].join('\n');
                break;

            case 'NEW_PRODUCT':
                message = [
                    `<b>🆕 НОВЫЙ ДРОП В SNEAKERHUB</b>`,
                    `━━━━━━━━━━━━━━━━━━`,
                    `<b>👟 Модель:</b> <code>${data.productName}</code>`,
                    `<b>💰 Цена:</b> <code>$${data.price}</code>`,
                    `<b>📦 В наличии:</b> <code>${data.countInStock} пар</code>`,
                    `<b>📏 Размеры:</b> <code>${data.size}</code>`,
                    `━━━━━━━━━━━━━━━━━━`,
                    `📅 <i>${timestamp}</i>`
                ].join('\n');
                break;

            case 'PRODUCT_UPDATED':
                message = [
                    `<b>🔄 ТОВАР ОБНОВЛЕН</b>`,
                    `━━━━━━━━━━━━━━━━━━`,
                    `<b>👟 Модель:</b> <code>${data.productName}</code>`,
                    `<b>💰 Новая Цена:</b> <code>$${data.price}</code>`,
                    `<b>📦 Остаток:</b> <code>${data.countInStock} шт.</code>`,
                    `━━━━━━━━━━━━━━━━━━`,
                    `📅 <i>${timestamp}</i>`
                ].join('\n');
                break;

            case 'ORDER_COMPLETED':
                message = [
                    `<b>✅ ЗАКАЗ ВЫПОЛНЕН!</b>`,
                    `━━━━━━━━━━━━━━━━━━`,
                    `<b>🆔 ID:</b> <code>${data.orderId}</code>`,
                    `<b>👤 Клиент:</b> <code>${data.customerName}</code>`,
                    `<b>💰 Сумма:</b> <code>$${data.totalPrice}</code>`,
                    `<b>🏁 Статус:</b> 🏆 ЗАВЕРШЕН`,
                    `━━━━━━━━━━━━━━━━━━`,
                    `📅 <i>${timestamp}</i>`
                ].join('\n');
                break;

            case 'NEW_REVIEW':
                message = [
                    `<b>⭐ НОВЫЙ ОТЗЫВ!</b>`,
                    `━━━━━━━━━━━━━━━━━━`,
                    `<b>👤 От:</b> <code>${data.userName}</code>`,
                    `<b>👟 Товар:</b> <code>${data.productName}</code>`,
                    `<b>⭐️ Оценка:</b> <code>${data.rating}/5</code>`,
                    `<b>💬 Комментарий:</b> <i>"${data.comment}"</i>`,
                    `━━━━━━━━━━━━━━━━━━`,
                    `📅 <i>${timestamp}</i>`
                ].join('\n');
                break;

            case 'REVIEW_DELETED':
                message = [
                    `<b>🗑️ ОТЗЫВ УДАЛЕН</b>`,
                    `━━━━━━━━━━━━━━━━━━`,
                    `<b>👟 Товар:</b> <code>${data.productName}</code>`,
                    `<b>👤 Кем удален:</b> <code>${data.deletedBy}</code>`,
                    `━━━━━━━━━━━━━━━━━━`,
                    `📅 <i>${timestamp}</i>`
                ].join('\n');
                break;

            case 'LOW_STOCK':
                message = [
                    `<b>⚠️ ЗАКАНЧИВАЕТСЯ ТОВАР</b>`,
                    `━━━━━━━━━━━━━━━━━━`,
                    `<b>👟 Модель:</b> <code>${data.productName}</code>`,
                    `<b>📉 Осталось:</b> <code>${data.countInStock} шт.</code>`,
                    `<i>Пора делать ресток!</i>`,
                    `━━━━━━━━━━━━━━━━━━`,
                    `📅 <i>${timestamp}</i>`
                ].join('\n');
                break;

            case 'PRODUCT_SOLD_OUT':
                message = [
                    `<b>🚨 ТОВАР РАСПРОДАН (SOLD OUT)</b>`,
                    `━━━━━━━━━━━━━━━━━━`,
                    `<b>👟 Модель:</b> <code>${data.productName}</code>`,
                    `❌ <i>Остаток на складе: 0 шт.</i>`,
                    `━━━━━━━━━━━━━━━━━━`,
                    `📅 <i>${timestamp}</i>`
                ].join('\n');
                break;

            case 'USER_REGISTERED':
                message = [
                    `<b>🎉 НОВЫЙ ПОЛЬЗОВАТЕЛЬ</b>`,
                    `━━━━━━━━━━━━━━━━━━`,
                    `<b>👤 Имя:</b> <code>${data.name}</code>`,
                    `<b>📧 Email:</b> <code>${data.email}</code>`,
                    `<b>🪪 Логин:</b> <code>@${data.username}</code>`,
                    `━━━━━━━━━━━━━━━━━━`,
                    `📅 <i>${timestamp}</i>`
                ].join('\n');
                break;

            case 'ADMIN_LOGIN':
                message = [
                    `<b>🔐 ВХОД В АДМИНКУ</b>`,
                    `━━━━━━━━━━━━━━━━━━`,
                    `<b>👑 Админ:</b> <code>${data.name}</code>`,
                    `<b>📧 Email:</b> <code>${data.email}</code>`,
                    `<i>Если это был не ты, срочно проверь безопасность!</i>`,
                    `━━━━━━━━━━━━━━━━━━`,
                    `📅 <i>${timestamp}</i>`
                ].join('\n');
                break;

            case 'PRODUCT_DELETED':
                message = [
                    `<b>🗑️ ТОВАР УДАЛЕН ИЗ БАЗЫ</b>`,
                    `━━━━━━━━━━━━━━━━━━`,
                    `<b>👟 Модель:</b> <code>${data.productName}</code>`,
                    `<b>🆔 ID:</b> <code>${data.productId}</code>`,
                    `━━━━━━━━━━━━━━━━━━`,
                    `📅 <i>${timestamp}</i>`
                ].join('\n');
                break;

            default:
                message = `<b>🔔 Системное уведомление:</b>\n<code>${JSON.stringify(data)}</code>`;
        }

        await bot.sendMessage(adminChatId, message, options);
        console.log(`✅ TG Notification [${type}] sent successfully!`);

    } catch (error) {
        console.error('❌ TG Error (Global Catch):', error.message);
        if (error.response && error.response.body) {
            console.error('⚠️ Ответ от Telegram API:', error.response.body);
        }
    }
};

module.exports = sendTelegramNotification;