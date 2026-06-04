const Product = require('../models/Product');
const User = require('../models/User'); // Подключили пользователей для рассылки нотификаций
const sendTelegramNotification = require('../utils/telegram');

// @desc    Получение всех товаров
exports.getAllProducts = async (req, res) => {
    try {
        const products = await Product.find().sort({ createdAt: -1 });
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: "Ошибка при получении товаров" });
    }
};

// @desc    Получение одного товара по ID
exports.getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (product) {
            res.json(product);
        } else {
            res.status(404).json({ message: "Товар не найден" });
        }
    } catch (error) {
        res.status(500).json({ message: "Ошибка сервера" });
    }
};

// @desc    Создание товара (Admin) + Автоматическая рассылка пользователям
exports.createProduct = async (req, res) => {
    try {
        console.log("🔥 [CONTROLLER] createProduct запущен"); 
        
        if (!req.user) {
            console.log("⚠️ Ошибка: Нет req.user");
            return res.status(401).json({ message: "Пользователь не определен. Ошибка авторизации." });
        }

        const { title, brand, price, oldPrice, images, sizes, description, category, countInStock } = req.body;
        console.log("📦 Данные из body:", { title, brand, category, price });

        const newProduct = new Product({
            title,
            brand,
            price,
            oldPrice: oldPrice || 0, 
            category: category || 'sneakers', 
            countInStock,
            description,
            sizes,
            images,
            owner: req.user._id 
        });

        const savedProduct = await newProduct.save();
        console.log(`✅ Товар успешно сохранен в БД. ID: ${savedProduct._id}`);

        // 1. Отправляем техническое уведомление админу в чат (по умолчанию)
        sendTelegramNotification('NEW_PRODUCT', {
            productName: `${brand} ${title}`,
            price: price,
            countInStock: countInStock,
            size: (sizes && sizes.length > 0) ? sizes.join(', ') : 'N/A'
        });

        // 2. МАССОВАЯ РАССЫЛКА: Находим всех клиентов, у которых привязан Telegram, и пушим им новинку
        try {
            const subscribers = await User.find({ telegramChatId: { $exists: true, $ne: null } });
            
            subscribers.forEach(user => {
                sendTelegramNotification('NEW_PRODUCT', {
                    productName: `${brand} ${title}`,
                    price: price,
                    countInStock: countInStock,
                    size: (sizes && sizes.length > 0) ? sizes.join(', ') : 'N/A'
                }, user.telegramChatId); // Передаем ID подписчика третьим параметром
            });
            
            console.log(`📢 Рассылка о новом дропе успешно отправлена ${subscribers.length} пользователям.`);
        } catch (broadcastErr) {
            console.error("⚠️ Ошибка при выполнении массовой рассылки бота:", broadcastErr.message);
        }

        res.status(201).json(savedProduct);
    } catch (error) {
        console.error("❌ Error in createProduct:", error.message);
        res.status(400).json({ message: "Ошибка при создании: " + error.message });
    }
};

// @desc    Редактирование товара / Изменение статуса заказа
exports.updateProduct = async (req, res) => {
    try {
        const updatedProduct = await Product.findByIdAndUpdate(
            req.params.id,
            req.body,
            { returnDocument: 'after' } 
        );

        if (!updatedProduct) return res.status(404).json({ message: "Товар не найден" });

        // Находим покупателя/владельца этого товара в базе данных, чтобы узнать его Telegram ID
        let customerName = "Customer";
        let customerTelegramChatId = null;
        
        try {
            if (updatedProduct.owner) {
                const customer = await User.findById(updatedProduct.owner);
                if (customer) {
                    customerName = customer.name || "Customer";
                    customerTelegramChatId = customer.telegramChatId || null;
                }
            }
        } catch (userFindErr) {
            console.error("⚠️ Не удалось найти данные владельца для отправки ТГ:", userFindErr.message);
        }

        // Уведомления о смене статусов (Отправка клиенту + дублирование админу)
        if (req.body.status === 'Completed') {
            sendTelegramNotification('ORDER_COMPLETED', {
                orderId: updatedProduct._id,
                customerName: customerName,
                totalPrice: updatedProduct.price,
                telegramChatId: customerTelegramChatId // Передаем ID Назерке внутрь объекта
            });
        } else if (req.body.status === 'Shipped' || req.body.status === 'In Transit') {
            // ЛОГИКА ДЛЯ ДУБЛИРОВАНИЯ СТАТУСА "В ПУТИ" КЛИЕНТУ В ЛИЧКУ
            sendTelegramNotification('ORDER_SHIPPED', {
                orderId: updatedProduct._id,
                customerName: customerName,
                totalPrice: updatedProduct.price,
                telegramChatId: customerTelegramChatId // Передаем ID Назерке внутрь объекта
            });
        } else {
            // Обычное обновление параметров товара админом
            sendTelegramNotification('PRODUCT_UPDATED', {
                productName: updatedProduct.title,
                price: updatedProduct.price,
                countInStock: updatedProduct.countInStock
            });
        }

        // Проверка на склад (уходят админу)
        if (req.body.countInStock !== undefined) {
            if (req.body.countInStock === 0) {
                 sendTelegramNotification('PRODUCT_SOLD_OUT', {
                    productName: updatedProduct.title
                });
            } else if (req.body.countInStock > 0 && req.body.countInStock < 3) {
                sendTelegramNotification('LOW_STOCK', {
                    productName: updatedProduct.title,
                    countInStock: updatedProduct.countInStock
                });
            }
        }

        res.json(updatedProduct);
    } catch (error) {
        console.error("❌ Error in updateProduct:", error.message);
        res.status(400).json({ message: "Ошибка при обновлении" });
    }
};

// @desc    Удаление товара
exports.deleteProduct = async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);
        if (!product) return res.status(404).json({ message: "Товар не найден" });
        
        sendTelegramNotification('PRODUCT_DELETED', {
            productName: product.title,
            productId: product._id
        });

        res.json({ message: "Товар успешно удален" });
    } catch (error) {
        res.status(500).json({ message: "Ошибка при удалении" });
    }
};

// @desc    Создание отзыва
exports.createProductReview = async (req, res) => {
    const { rating, comment } = req.body;
    try {
        const product = await Product.findById(req.params.id);

        if (product) {
            if (!req.user) {
                return res.status(401).json({ message: 'Необходима авторизация' });
            }

            const alreadyReviewed = product.reviews.find(
                (r) => r.user && r.user.toString() === req.user._id.toString()
            );

            if (alreadyReviewed) {
                return res.status(400).json({ message: 'Вы уже оставили отзыв' });
            }

            const review = {
                name: req.user.name || 'Аноним',
                rating: Number(rating),
                comment,
                user: req.user._id,
            };

            product.reviews.push(review);
            product.numReviews = product.reviews.length;
            product.rating = product.reviews.reduce((acc, item) => item.rating + acc, 0) / product.reviews.length;

            await product.save({ validateBeforeSave: false });

            // Оповещаем админа о новом отзыве на модерацию
            sendTelegramNotification('NEW_REVIEW', {
                userName: req.user.name || 'Аноним',
                productName: product.title,
                rating: rating,
                comment: comment
            });

            res.status(201).json({ message: 'Отзыв добавлен успешно' });
        } else {
            res.status(404).json({ message: 'Товар не найден' });
        }
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Удаление отзыва
exports.deleteProductReview = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({ message: 'Товар не найден' });
        }

        const reviewIndex = product.reviews.findIndex(
            (r) => r._id.toString() === req.params.reviewId
        );

        if (reviewIndex === -1) {
            return res.status(404).json({ message: 'Отзыв не найден' });
        }

        const review = product.reviews[reviewIndex];
        const userId = req.user ? req.user._id.toString() : null;
        const reviewOwnerId = review.user ? review.user.toString() : null;
        
        const isAuthor = reviewOwnerId && userId === reviewOwnerId;
        const isAdmin = req.user && req.user.role === 'admin';

        if (isAuthor || isAdmin) {
            product.reviews.splice(reviewIndex, 1);
            product.numReviews = product.reviews.length;

            product.rating = product.numReviews > 0 
                ? product.reviews.reduce((acc, item) => item.rating + acc, 0) / product.numReviews 
                : 0;

            await product.save({ validateBeforeSave: false });

            sendTelegramNotification('REVIEW_DELETED', {
                productName: product.title,
                deletedBy: isAdmin ? "Admin" : "Author"
            });

            res.json({ message: 'Отзыв удален' });
        } else {
            res.status(401).json({ message: 'У вас нет прав на удаление этого отзыва' });
        }
    } catch (error) {
        console.error("ОШИБКА:", error);
        res.status(500).json({ message: "Ошибка на сервере", error: error.message });
    }
};