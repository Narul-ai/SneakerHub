const TelegramBot = require('node-telegram-bot-api');

// Твои данные из User Summary и скриншота
const token = '8732791017:AAGt_es4PGOmVHNkyAzGJZwalqUdvVTNw_A';
const chatId = '6040743870';

// Инициализация бота
const bot = new TelegramBot(token, { polling: false });

console.log('⏳ Connecting to Telegram API...');

bot.sendMessage(chatId, '🚀 SNEAKERHUB Debug: Connection successful! Your backend is now linked to Telegram.')
    .then(() => {
        console.log('✅ SUCCESS! Check your Telegram app.');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ ERROR:', error.message);
        process.exit(1);
    });