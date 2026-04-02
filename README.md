# ✅ TaskList

Ứng dụng quản lý công việc full-stack lấy cảm hứng từ Todoist — được xây dựng bằng **React**, **Express** và **MySQL**. Hỗ trợ quản lý dự án, nhãn, bộ lọc, trợ lý AI, tích hợp Telegram Bot và nhiều tính năng khác.

---

## 📸 Tính năng

- 🔐 **Xác thực** — Đăng ký & đăng nhập với JWT
- 📥 **Inbox, Hôm nay, Sắp tới** — Các chế độ xem thông minh để sắp xếp công việc
- 📁 **Dự án & Phân mục** — Nhóm công việc theo dự án với các phân mục tùy chỉnh
- 🏷️ **Nhãn & Bộ lọc** — Gắn nhãn cho công việc và tạo bộ lọc tùy chỉnh
- ✅ **Quản lý công việc** — Tạo, sửa, hoàn thành, đặt lịch, ưu tiên, bình luận
- 🤖 **Trợ lý AI** — Tích hợp Groq API để gợi ý công việc thông minh
- 🔔 **Thông báo** — Cập nhật hoạt động của công việc
- 📊 **Nhật ký hoạt động** — Theo dõi công việc đã hoàn thành và bình luận
- 🤳 **Telegram Bot** — Quản lý công việc trực tiếp từ Telegram
- 😀 **Emoji Picker** — Thêm emoji vào dự án và công việc
- 🗣️ **Giọng nói thành văn bản** — Tạo công việc bằng giọng nói

---

## 🛠️ Công nghệ sử dụng

| Tầng       | Công nghệ                               |
| ---------- | ---------------------------------------- |
| Frontend   | React 18, Vite 5                         |
| Backend    | Express 5 (Node.js)                      |
| Cơ sở dữ liệu | MySQL (Railway)                      |
| AI         | Groq SDK                                 |
| Bot        | node-telegram-bot-api                    |
| Xác thực   | JSON Web Tokens (jsonwebtoken, bcryptjs) |

---

## 📂 Cấu trúc dự án

```
TaskList/
├── frontend/                # React + Vite (giao diện)
│   ├── src/
│   │   ├── components/      # Các component tái sử dụng
│   │   │   ├── AddTaskModal/
│   │   │   ├── AiAssistant/
│   │   │   ├── Sidebar/
│   │   │   ├── TaskDetailModal/
│   │   │   ├── TelegramModal/
│   │   │   └── ...
│   │   ├── contexts/        # React Context (Auth, v.v.)
│   │   ├── Layout/          # Layout chính
│   │   ├── pages/           # Các trang
│   │   │   ├── Inbox/
│   │   │   ├── Today/
│   │   │   ├── Upcoming/
│   │   │   ├── MyProjects/
│   │   │   ├── Completed/
│   │   │   ├── Filters-Labels/
│   │   │   ├── Login/
│   │   │   ├── Register/
│   │   │   └── Onboarding/
│   │   └── main.jsx         # Điểm khởi chạy ứng dụng
│   ├── package.json
│   └── vite.config.js
│
├── backend/                 # Express API server
│   ├── routes/
│   │   ├── authRoutes.js    # Đăng ký / Đăng nhập
│   │   ├── tasks.js         # CRUD công việc
│   │   ├── projects.js      # CRUD dự án
│   │   ├── labels.js        # CRUD nhãn
│   │   ├── sections.js      # CRUD phân mục
│   │   ├── filters.js       # CRUD bộ lọc
│   │   ├── activity.js      # Nhật ký hoạt động
│   │   ├── ai.js            # API trợ lý AI
│   │   ├── telegram.js      # Logic Telegram bot
│   │   └── users.js         # Hồ sơ người dùng
│   ├── middleware/
│   │   └── verifyToken.js   # Middleware xác thực JWT
│   ├── db.js                # Kết nối MySQL
│   ├── index.js             # Điểm khởi chạy server
│   └── package.json
│
├── .gitignore
└── README.md
```

---

## 🚀 Hướng dẫn cài đặt

### Yêu cầu

- **Node.js** ≥ 18
- **MySQL** (local hoặc cloud, ví dụ Railway)

### 1. Clone dự án

```bash
git clone https://github.com/nhan12062004/TaskList.git
cd TaskList
```

### 2. Cài đặt Backend

```bash
cd backend
npm install
```

Tạo file `.env` trong thư mục `backend/`:

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

Chạy server backend:

```bash
node index.js
```

Server API sẽ chạy tại `http://localhost:3000`.

### 3. Cài đặt Frontend

```bash
cd frontend
npm install
npm run dev
```

Ứng dụng sẽ chạy tại `http://localhost:5173`.

---

## 📡 Các API Endpoint

| Phương thức | Endpoint                   | Mô tả                         |
| ----------- | -------------------------- | ------------------------------ |
| POST        | `/api/auth/register`       | Đăng ký tài khoản mới         |
| POST        | `/api/auth/login`          | Đăng nhập & nhận JWT token     |
| GET         | `/api/tasks`               | Lấy danh sách công việc       |
| POST        | `/api/tasks`               | Tạo công việc mới              |
| PUT         | `/api/tasks/:id`           | Cập nhật công việc             |
| DELETE      | `/api/tasks/:id`           | Xóa công việc                  |
| GET         | `/api/projects`            | Lấy danh sách dự án           |
| POST        | `/api/projects`            | Tạo dự án mới                  |
| GET         | `/api/labels`              | Lấy danh sách nhãn            |
| POST        | `/api/labels`              | Tạo nhãn mới                   |
| GET         | `/api/sections`            | Lấy danh sách phân mục        |
| POST        | `/api/sections`            | Tạo phân mục mới               |
| GET         | `/api/filters`             | Lấy danh sách bộ lọc          |
| GET         | `/api/activity`            | Lấy nhật ký hoạt động          |
| POST        | `/api/ai/*`                | Các endpoint trợ lý AI        |
| POST        | `/api/telegram/link`       | Tạo mã liên kết Telegram      |
| GET         | `/api/telegram/status`     | Kiểm tra trạng thái Telegram   |
| POST        | `/api/telegram/disconnect` | Hủy liên kết Telegram          |
| GET         | `/health`                  | Kiểm tra sức khỏe server      |

---

## 🤖 Telegram Bot

Telegram Bot tích hợp cho phép bạn:

- ➕ Thêm công việc qua tin nhắn
- 📋 Xem danh sách công việc
- ✅ Đánh dấu hoàn thành công việc
- 🗣️ Gửi tin nhắn thoại để tạo công việc
- 📷 Gửi hình ảnh để AI phân tích

Liên kết tài khoản từ ứng dụng: **Cài đặt → Telegram → Kết nối**.

---

## 📝 Giấy phép

Dự án này được xây dựng cho mục đích học tập.

---

> Được xây dựng với ❤️ bởi [nhan12062004](https://github.com/nhan12062004)
