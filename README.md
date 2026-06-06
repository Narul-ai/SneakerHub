# SneakerHub (Backend API)

SneakerHub is the backend core of a full-stack MERN e-commerce ecosystem. It features a high-performance RESTful API, dynamic data filtering, secure authentication, an administrative management system, and automated customer notifications via an integrated Telegram Bot.

> **Note:** This repository contains the standalone Backend API. The Frontend client built with React is hosted in a separate repository.

## 🚀 Features

* **E-Commerce API Core:** Complete RESTful routes and full CRUD operations for products, categories, wishlists, and user orders.
* **Dynamic Catalog System:** Advanced server-side query processing for filtering products by brands, price range, sizes, and availability.
* **Secure Authentication:** Secure user registration, login, and session protection using JWT (JSON Web Tokens).
* **Admin Controls:** Dedicated administrative endpoints to manage inventory, update pricing, and track orders in real-time.
* **Telegram Bot Integration:** Automated notification dispatcher linked directly with the database to alert admins about new orders instantly.

## 🛠️ Tech Stack

* **Runtime Environment:** Node.js
* **Framework:** Express.js
* **Database:** MongoDB (with Mongoose ORM for data modeling)
* **Integrations:** Telegram Bot API (via node-telegram-bot-api / aiogram style logic)

## ⚙️ Environment Variables Setup

To run this project locally, create a `.env` file in the root directory and populate it based on the `.env.example` file provided in this repository.