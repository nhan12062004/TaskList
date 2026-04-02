# ✅ TaskList

A full-stack task management application inspired by Todoist — built with **React**, **Express**, and **MySQL**. Features include project organization, labels, filters, AI assistant, Telegram bot integration, and more.

---

## 📸 Features

- 🔐 **Authentication** — Register & login with JWT-based auth
- 📥 **Inbox, Today, Upcoming** — Smart views to organize your tasks
- 📁 **Projects & Sections** — Group tasks into projects with custom sections
- 🏷️ **Labels & Filters** — Tag tasks with labels and create custom filters
- ✅ **Task Management** — Create, edit, complete, schedule, set priorities, add comments
- 🤖 **AI Assistant** — Powered by Groq API for smart task suggestions
- 🔔 **Notifications** — Stay updated on task activity
- 📊 **Activity Log** — Track completed tasks and comments
- 🤳 **Telegram Bot** — Manage tasks directly from Telegram
- 😀 **Emoji Picker** — Add emojis to your projects and tasks
- 🗣️ **Speech-to-Text** — Create tasks with your voice

---

## 🛠️ Tech Stack

| Layer      | Technology                              |
| ---------- | --------------------------------------- |
| Frontend   | React 18, Vite 5                        |
| Backend    | Express 5 (Node.js)                     |
| Database   | MySQL (hosted on Railway)               |
| AI         | Groq SDK                                |
| Bot        | node-telegram-bot-api                   |
| Auth       | JSON Web Tokens (jsonwebtoken, bcryptjs)|

---

## 📂 Project Structure

```
TaskList/
├── frontend/                # React + Vite client
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   │   ├── AddTaskModal/
│   │   │   ├── AiAssistant/
│   │   │   ├── Sidebar/
│   │   │   ├── TaskDetailModal/
│   │   │   ├── TelegramModal/
│   │   │   └── ...
│   │   ├── contexts/        # React Context (Auth, etc.)
│   │   ├── Layout/          # Main layout wrapper
│   │   ├── pages/           # Page views
│   │   │   ├── Inbox/
│   │   │   ├── Today/
│   │   │   ├── Upcoming/
│   │   │   ├── MyProjects/
│   │   │   ├── Completed/
│   │   │   ├── Filters-Labels/
│   │   │   ├── Login/
│   │   │   ├── Register/
│   │   │   └── Onboarding/
│   │   └── main.jsx         # App entry point
│   ├── package.json
│   └── vite.config.js
│
├── backend/                 # Express API server
│   ├── routes/
│   │   ├── authRoutes.js    # Register / Login
│   │   ├── tasks.js         # CRUD tasks
│   │   ├── projects.js      # CRUD projects
│   │   ├── labels.js        # CRUD labels
│   │   ├── sections.js      # CRUD sections
│   │   ├── filters.js       # CRUD filters
│   │   ├── activity.js      # Activity logs
│   │   ├── ai.js            # AI assistant endpoints
│   │   ├── telegram.js      # Telegram bot logic
│   │   └── users.js         # User profile
│   ├── middleware/
│   │   └── verifyToken.js   # JWT middleware
│   ├── db.js                # MySQL connection pool
│   ├── index.js             # Server entry point
│   └── package.json
│
├── .gitignore
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **MySQL** database (local or cloud, e.g. Railway)

### 1. Clone the repository

```bash
git clone https://github.com/nhan12062004/TaskList.git
cd TaskList
```

### 2. Setup Backend

```bash
cd backend
npm install
```

Create a `.env` file inside `backend/`:

```env
DB_HOST=your_db_host
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_db_name
DB_PORT=3306

JWT_SECRET=your_jwt_secret

GROQ_API_KEY=your_groq_api_key

TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_BOT_USERNAME=your_bot_username
```

Start the backend server:

```bash
node index.js
```

The API will be running at `http://localhost:3000`.

### 3. Setup Frontend

```bash
cd frontend
npm install
npm run dev
```

The app will be running at `http://localhost:5173`.

---

## 📡 API Endpoints

| Method | Endpoint                    | Description               |
| ------ | --------------------------- | ------------------------- |
| POST   | `/api/auth/register`        | Register a new user       |
| POST   | `/api/auth/login`           | Login & get JWT token     |
| GET    | `/api/tasks`                | Get user's tasks          |
| POST   | `/api/tasks`                | Create a new task         |
| PUT    | `/api/tasks/:id`            | Update a task             |
| DELETE | `/api/tasks/:id`            | Delete a task             |
| GET    | `/api/projects`             | Get user's projects       |
| POST   | `/api/projects`             | Create a new project      |
| GET    | `/api/labels`               | Get user's labels         |
| POST   | `/api/labels`               | Create a new label        |
| GET    | `/api/sections`             | Get sections              |
| POST   | `/api/sections`             | Create a new section      |
| GET    | `/api/filters`              | Get user's filters        |
| GET    | `/api/activity`             | Get activity logs         |
| POST   | `/api/ai/*`                 | AI assistant endpoints    |
| POST   | `/api/telegram/link`        | Generate Telegram link    |
| GET    | `/api/telegram/status`      | Check Telegram connection |
| POST   | `/api/telegram/disconnect`  | Disconnect Telegram       |
| GET    | `/health`                   | Health check              |

---

## 🤖 Telegram Bot

The integrated Telegram bot allows you to:

- ➕ Add tasks via chat
- 📋 View your task list
- ✅ Mark tasks as complete
- 🗣️ Send voice messages to create tasks
- 📷 Send images for AI analysis

Link your account from the app: **Settings → Telegram → Connect**.

---

## 📝 License

This project is for educational purposes.

---

> Built with ❤️ by [nhan12062004](https://github.com/nhan12062004)
