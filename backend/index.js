import express from "express";
import cors from "cors";
import pool from "./db.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/users.js";
import projectRoutes from "./routes/projects.js";
import taskRoutes from "./routes/tasks.js";

import labelsRoutes from "./routes/labels.js";
import sectionsRoutes from "./routes/sections.js";
import aiRoutes from "./routes/ai.js";
import filtersRoutes from "./routes/filters.js";
import activityRoutes from "./routes/activity.js";
import { initTelegramBot, generateLinkingCode } from "./routes/telegram.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "25mb" }));

app.get("/health", async (req, res) => {
  const [rows] = await pool.query("SELECT 1 AS ok");
  res.json(rows[0]);
});

// Initialize database tables
const initDB = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        task_id INT,
        action_type ENUM('create_task', 'complete_task', 'reopen_task', 'add_comment', 'change_date', 'update_task') NOT NULL,
        details JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log("✅ Database tables initialized");

    // Pre-populate activity logs with existing completed tasks and comments
    const [existingLogs] = await pool.query("SELECT COUNT(*) as count FROM activity_logs");
    if (existingLogs[0].count === 0) {
      console.log("⏳ Pre-populating activity logs...");

      // Migrate completed tasks
      await pool.query(`
        INSERT INTO activity_logs (user_id, task_id, action_type, details, created_at)
        SELECT user_id, id, 'complete_task', JSON_OBJECT('title', title), updated_at
        FROM tasks WHERE completed = 1
      `);

      // Migrate comments
      await pool.query(`
        INSERT INTO activity_logs (user_id, task_id, action_type, details, created_at)
        SELECT user_id, task_id, 'add_comment', JSON_OBJECT('content', content), created_at
        FROM task_comments
      `);

      console.log("✅ Pre-population complete");
    }
  } catch (err) {
    console.error("❌ Database initialization failed:", err);
  }
};
initDB();


app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/labels", labelsRoutes);
app.use("/api/sections", sectionsRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/filters", filtersRoutes);
app.use("/api/activity", activityRoutes);

import { verifyToken } from "./middleware/verifyToken.js";

// API endpoint to generate Telegram linking code (requires login)
app.post("/api/telegram/link", verifyToken, async (req, res) => {
  try {
    const userId = req.userId; // Get from JWT token

    const code = generateLinkingCode(userId);
    const botUsername = process.env.TELEGRAM_BOT_USERNAME || "your_bot";
    const linkUrl = `https://t.me/${botUsername}?start=${code}`;

    res.json({ code, linkUrl, botUsername });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to check Telegram connection status (requires login)
app.get("/api/telegram/status", verifyToken, async (req, res) => {
  try {
    const userId = req.userId; // Get from JWT token
    const [rows] = await pool.query(
      `SELECT telegram_id FROM users WHERE id = ?`,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      connected: !!rows[0].telegram_id,
      telegramId: rows[0].telegram_id
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to disconnect Telegram (requires login)
app.post("/api/telegram/disconnect", verifyToken, async (req, res) => {
  try {
    const userId = req.userId; // Get from JWT token

    // Get user's telegram_id before clearing it
    const [userRows] = await pool.query(
      `SELECT telegram_id FROM users WHERE id = ?`,
      [userId]
    );

    const telegramId = userRows.length > 0 ? userRows[0].telegram_id : null;

    // Clear telegram_id
    await pool.query(
      `UPDATE users SET telegram_id = NULL WHERE id = ?`,
      [userId]
    );

    // Send notification to user on Telegram if bot is available
    if (telegramId) {
      try {
        const { getBot } = await import("./routes/telegram.js");
        const botInstance = getBot();
        if (botInstance) {
          botInstance.sendMessage(telegramId,
            "🔓 *Tài khoản đã bị hủy liên kết*\n\n" +
            "Tài khoản TaskList của bạn đã được hủy liên kết từ ứng dụng web.\n\n" +
            "Bạn có thể liên kết lại bất cứ lúc nào từ ứng dụng TaskList → Telegram.",
            { parse_mode: "Markdown" }
          );
        }
      } catch (botErr) {
        console.error("Failed to send disconnect notification:", botErr);
        // Don't fail the request if bot notification fails
      }
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => {
  console.log("✅ Backend running at http://localhost:3000");

  // Initialize Telegram Bot
  initTelegramBot();
});
