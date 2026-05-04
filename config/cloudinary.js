const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// ПРОВЕРКА: Если ключей нет, сервер выдаст предупреждение в терминал при старте
if (!process.env.CLOUDINARY_CLOUD_NAME) {
    console.error("⚠️ ВНИМАНИЕ: Переменные Cloudinary не найдены в .env!");
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'products',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
  }
});

const upload = multer({ storage: storage });

module.exports = upload;