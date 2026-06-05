const TelegramBot = require('node-telegram-bot-api');
const User = require('../models/User'); // Импортируем модель для автоматической привязки чатов
require('dotenv').config(); 

const token = process.env.TELEGRAM_TOKEN;
const adminChatId = process.env.ADMIN_CHAT_ID;

// Initialize bot instance with polling enabled
const bot = token ? new TelegramBot(token, { polling: true }) : null;

// --- User Interactions (/start command with Deep Linking support) ---
if (bot) {
    bot.onText(/\/start(.*)/, async (msg, match) => {
        const chatId = msg.chat.id;
        const firstName = msg.from.first_name || 'friend';
        
        // Извлекаем параметр из ссылки (например, /start 6a21532781c7333c2bb914d2)
        const startParam = match[1] ? match[1].trim() : null;
        let bindingStatusMessage = '';

        if (startParam) {
            try {
                // Пытаемся найти пользователя по его MongoDB ID
                const user = await User.findById(startParam);
                
                if (user) {
                    // Записываем ID в поле telegramId (основное поле в твоей базе)
                    user.telegramId = String(chatId);
                    user.telegramChatId = chatId; // Оставляем для совместимости, если схема расширится
                    await user.save();
                    
                    bindingStatusMessage = `\n\n<b>✅ Success:</b> Your Telegram account is now securely linked to your profile (<code>${user.name}</code>)! You will receive live delivery updates here.`;
                    console.log(`🎯 Бот успешно связал аккаунт пользователя ${user.name} с telegramId: ${chatId}`);
                } else {
                    bindingStatusMessage = `\n\n<b>⚠️ Note:</b> Welcome link parameter detected, but no matching account was found in SneakerHub database.`;
                }
            } catch (dbErr) {
                console.error('❌ Ошибка при автоматической привязке Telegram ID:', dbErr.message);
                bindingStatusMessage = `\n\n<b>⚠️ System:</b> Account linkage failed due to an internal database mismatch.`;
            }
        }

        const welcomeMessage = [
            `━━━━━━━━━━━━━━━━━━`,
            `👋 <b>Welcome to SneakerHub, ${firstName}!</b>`,
            `━━━━━━━━━━━━━━━━━━`,
            `I am your automated assistant. I'm here to provide live tracking updates for your orders and notify you about exclusive drops! 🔥`,
            bindingStatusMessage, // Добавит лог успешной привязки, если юзер перешел по ссылке
            `\n👟 <b>Ready to upgrade your rotation?</b>`,
            `Explore our premium collection on our official store:`,
            `https://sneaker-hub-frontend.vercel.app`
        ].filter(Boolean).join('\n');

        bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'HTML' });
    });

    // Handle Admin Action Callback Queries
    bot.on('callback_query', async (callbackQuery) => {
        const { data, message } = callbackQuery;
        const chatId = message.chat.id;

        if (data.startsWith('confirm_order_')) {
            const orderId = data.replace('confirm_order_', '');
            await bot.sendMessage(chatId, `⏳ Order confirmation request for <code>${orderId}</code> dispatched to system...`, { parse_mode: 'HTML' });
        } 
        else if (data.startsWith('cancel_order_')) {
            const orderId = data.replace('cancel_order_', '');
            await bot.sendMessage(chatId, `❌ Order cancellation request for <code>${orderId}</code> initiated...`, { parse_mode: 'HTML' });
        }

        bot.answerCallbackQuery(callbackQuery.id);
    });
}

/**
 * Global Telegram Notification Dispatcher
 * @param {string} type - Notification action type
 * @param {object} data - Dynamic context data payload
 * @param {string|number|null} targetChatId - Optional specific recipient ID (Customer ID)
 */
const sendTelegramNotification = async (type, data, targetChatId = null) => {
    try {
        console.log(`📡 TG Bot: Initiating dispatch sequence [${type}]`);

        if (!bot) {
            console.log('⚠️ TG Bot: Missing TELEGRAM_TOKEN configuration in environment.');
            return;
        }

        let message = '';
        let options = { parse_mode: 'HTML' };
        
        let timestamp = new Date().toLocaleString('en-US');
        try {
            timestamp = new Date().toLocaleString('en-US', { 
                timeZone: 'Asia/Almaty',
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit',
                hour12: false
            });
        } catch (timeErr) {
            console.log("⚠️ TG Bot: Timezone parsing failed. Falling back to internal server clock.");
        }

        // Формирование текста сообщений в зависимости от типа события
        switch (type) {
            case 'SERVER_STARTED':
                message = [
                    `<b>🟢 SNEAKERHUB CORE ENGINE ONLINE</b>`,
                    `━━━━━━━━━━━━━━━━━━`,
                    `<b>🚀 Operational Port:</b> <code>${data.port}</code>`,
                    `<b>🌐 Database Status:</b> CONNECTED / SECURE`,
                    `━━━━━━━━━━━━━━━━━━`,
                    `📅 <i>${timestamp}</i>`
                ].join('\n');
                break;

            case 'NEW_ORDER':
                message = [
                    `<b>📦 NEW INCOMING ORDER PLACED!</b>`,
                    `━━━━━━━━━━━━━━━━━━`,
                    `<b>🆔 Order ID:</b> <code>${data.orderId}</code>`,
                    `<b>👤 Customer:</b> <code>${data.customerName}</code>`,
                    `<b>💰 Total Price:</b> <code>$${data.totalPrice}</code>`,
                    `<b>📍 Destination:</b> <i>${data.address || 'Not Provided'}</i>`,
                    `━━━━━━━━━━━━━━━━━━`,
                    `📅 <i>${timestamp}</i>`
                ].join('\n');
                
                options.reply_markup = {
                    inline_keyboard: [
                        [
                            { text: '✅ Approve Order', callback_data: `confirm_order_${data.orderId}` },
                            { text: '❌ Reject Order', callback_data: `cancel_order_${data.orderId}` }
                        ]
                    ]
                };
                break;

            case 'ORDER_SHIPPED':
                message = [
                    `<b>🚚 YOUR SNEAKERHUB PARCEL IS EN ROUTE!</b>`,
                    `━━━━━━━━━━━━━━━━━━`,
                    `Great news! Your order has been processed and handed over to our fulfillment courier.`,
                    `\n<b>🆔 Tracking ID:</b> <code>${data.orderId}</code>`,
                    `<b>👤 Recipient:</b> <code>${data.customerName}</code>`,
                    `<b>🏁 Dispatch Status:</b> ⚡ IN TRANSIT`,
                    `━━━━━━━━━━━━━━━━━━`,
                    `👇 <i>Keep tabs on your package live on our website:</i>`
                ].join('\n');

                options.reply_markup = {
                    inline_keyboard: [
                        [
                            { text: '🌐 Track on SneakerHub', url: 'https://sneaker-hub-frontend.vercel.app' }
                        ]
                    ]
                };
                break;

            case 'NEW_PRODUCT':
                message = [
                    `<b>🔥 EXCLUSIVE NEW DROP ARRIVED!</b>`,
                    `━━━━━━━━━━━━━━━━━━`,
                    `<b>👟 Model:</b> <code>${data.productName}</code>`,
                    `<b>💰 Retail Price:</b> <code>$${data.price}</code>`,
                    `<b>📦 Allocation:</b> <code>${data.countInStock} Units Available</code>`,
                    `<b>📏 Size Index:</b> <code>${data.size || 'Standard Run'}</code>`,
                    `━━━━━━━━━━━━━━━━━━`,
                    `<i>Secure your pair before allocations exhaust!</i> \n📅 <i>${timestamp}</i>`
                ].join('\n');
                
                options.reply_markup = {
                    inline_keyboard: [[{ text: '🛒 Shop Drop Now', url: 'https://sneaker-hub-frontend.vercel.app' }]]
                };
                break;

            case 'PRODUCT_UPDATED':
                message = [
                    `<b>🔄 CATALOG LOGISTICS UPDATED</b>`,
                    `━━━━━━━━━━━━━━━━━━`,
                    `<b>👟 Model:</b> <code>${data.productName}</code>`,
                    `<b>💰 Adjusted Price:</b> <code>$${data.price}</code>`,
                    `<b>📦 Stock Balance:</b> <code>${data.countInStock} units</code>`,
                    `━━━━━━━━━━━━━━━━━━`,
                    `📅 <i>${timestamp}</i>`
                ].join('\n');
                break;

            case 'ORDER_COMPLETED':
                message = [
                    `<b>🏆 ORDER DELIVERED SUCCESSFULLY</b>`,
                    `━━━━━━━━━━━━━━━━━━`,
                    `<b>🆔 Order ID:</b> <code>${data.orderId}</code>`,
                    `<b>👤 Customer:</b> <code>${data.customerName}</code>`,
                    `<b>💰 Revenue Settled:</b> <code>$${data.totalPrice}</code>`,
                    `<b>🏁 Final Status:</b> COMPLETED ✅`,
                    `━━━━━━━━━━━━━━━━━━`,
                    `📅 <i>${timestamp}</i>`
                ].join('\n');
                break;

            case 'NEW_REVIEW':
                message = [
                    `<b>⭐ NEW CUSTOMER REVIEW SUBMITTED</b>`,
                    `━━━━━━━━━━━━━━━━━━`,
                    `<b>👤 User:</b> <code>${data.userName}</code>`,
                    `<b>👟 Silhouette:</b> <code>${data.productName}</code>`,
                    `<b>⭐️ Rating:</b> <code>${data.rating}/5 Stars</code>`,
                    `<b>💬 Verdict:</b> <i>"${data.comment}"</i>`,
                    `━━━━━━━━━━━━━━━━━━`,
                    `📅 <i>${timestamp}</i>`
                ].join('\n');
                break;

            case 'REVIEW_DELETED':
                message = [
                    `<b>🗑️ REVIEW MODERATED / REMOVED</b>`,
                    `━━━━━━━━━━━━━━━━━━`,
                    `<b>👟 Silhouette:</b> <code>${data.productName}</code>`,
                    `<b>👤 Actor:</b> <code>${data.deletedBy}</code>`,
                    `━━━━━━━━━━━━━━━━━━`,
                    `📅 <i>${timestamp}</i>`
                ].join('\n');
                break;

            case 'LOW_STOCK':
                message = [
                    `<b>⚠️ CRITICAL INVENTORY WARNING</b>`,
                    `━━━━━━━━━━━━━━━━━━`,
                    `<b>👟 Model:</b> <code>${data.productName}</code>`,
                    `<b>📉 Units Left:</b> <code>${data.countInStock} units</code>`,
                    `<i>Action required: Restock recommended immediately.</i>`,
                    `━━━━━━━━━━━━━━━━━━`,
                    `📅 <i>${timestamp}</i>`
                ].join('\n');
                break;

            case 'PRODUCT_SOLD_OUT':
                message = [
                    `<b>🚨 PRODUCT COMPLETELY SOLD OUT</b>`,
                    `━━━━━━━━━━━━━━━━━━`,
                    `<b>👟 Model:</b> <code>${data.productName}</code>`,
                    `<b>📉 Warehouse inventory balance:</b> 0 pairs.`,
                    `━━━━━━━━━━━━━━━━━━`,
                    `📅 <i>${timestamp}</i>`
                ].join('\n');
                break;

            case 'USER_REGISTERED':
                message = [
                    `<b>🎉 NEW MEMBERSHIP REGISTERED</b>`,
                    `━━━━━━━━━━━━━━━━━━`,
                    `<b>👤 Name:</b> <code>${data.name}</code>`,
                    `<b>📧 Email Link:</b> <code>${data.email}</code>`,
                    `<b>🪪 Identity handle:</b> <code>@${data.username || 'unknown'}</code>`,
                    `━━━━━━━━━━━━━━━━━━`,
                    `📅 <i>${timestamp}</i>`
                ].join('\n');
                break;

            case 'ADMIN_LOGIN':
                message = [
                    `<b>🔐 SECURE ADMIN LOGIN DETECTED</b>`,
                    `━━━━━━━━━━━━━━━━━━`,
                    `<b>👑 Operator:</b> <code>${data.name}</code>`,
                    `<b>📧 Email Auth:</b> <code>${data.email}</code>`,
                    `<i>If this session access was unauthorized, evaluate credentials immediately.</i>`,
                    `━━━━━━━━━━━━━━━━━━`,
                    `📅 <i>${timestamp}</i>`
                ].join('\n');
                break;

            case 'PRODUCT_DELETED':
                message = [
                    `<b>🗑️ PRODUCT RECORD PURGED FROM DATABASE</b>`,
                    `━━━━━━━━━━━━━━━━━━`,
                    `<b>👟 Model:</b> <code>${data.productName}</code>`,
                    `<b>🆔 Storage ID:</b> <code>${data.productId}</code>`,
                    `━━━━━━━━━━━━━━━━━━`,
                    `📅 <i>${timestamp}</i>`
                ].join('\n');
                break;

            default:
                message = `<b>🔔 Core System Broadcast:</b>\n<code>${JSON.stringify(data)}</code>`;
        }

        // --- УМНАЯ СИСТЕМА ДВОЙНОЙ ОТПРАВКИ ---
        
        // В приоритете проверяем именно telegramId, а telegramChatId оставляем как запасной вариант
        const customerId = targetChatId || data.telegramId || data.telegramChatId || (data.user && (data.user.telegramId || data.user.telegramChatId));
        
        const clientFacingTypes = ['ORDER_SHIPPED', 'ORDER_COMPLETED', 'NEW_PRODUCT'];

        if (clientFacingTypes.includes(type) && customerId && String(customerId) !== String(adminChatId)) {
            try {
                await bot.sendMessage(customerId, message, options);
                console.log(`✅ TG Bot: Client notification [${type}] sent to user chat: ${customerId}`);
            } catch (custErr) {
                console.error(`⚠️ TG Bot: Client blocked the bot or wrong ID (${customerId}):`, custErr.message);
            }
        }

        // Сообщение админу отправляется всегда, кроме массовой рассылки NEW_PRODUCT подписчикам
        if (adminChatId && !(type === 'NEW_PRODUCT' && targetChatId)) {
            try {
                await bot.sendMessage(adminChatId, message, options);
                console.log(`✅ TG Bot: Admin broadcast [${type}] logged successfully.`);
            } catch (adminErr) {
                console.error('❌ TG Bot: Critical failure sending message to Admin:', adminErr.message);
            }
        }
        

    } catch (error) {
        console.error('❌ TG Notification System Error:', error.message);
    }
};

sendTelegramNotification.bot = bot;
module.exports = sendTelegramNotification;