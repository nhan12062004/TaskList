import express from "express";
import { verifyToken } from "../middleware/verifyToken.js";
import pool from "../db.js";
import Groq from "groq-sdk";

const router = express.Router();

/**
 * 4️⃣ PROMPT CHO AI
 */
function buildPrompt(message, currentDate) {
    return `
Bạn là AI phân tích câu lệnh quản lý công việc.
Chỉ trả về JSON, KHÔNG giải thích.
Ngày hôm nay là: ${currentDate}

Các action hợp lệ:
- create_task (data: { 
    title: string, 
    description?: string, 
    due_date?: string (Format: YYYY-MM-DD HH:mm:ss hoặc YYYY-MM-DD), 
    priority?: number (1=Cao nhất, 2, 3, 4=Mặc định/Thấp),
    labels?: string[] (Danh sách tên nhãn, bỏ dấu #)
  })
- list_task (data: { filter?: 'today'|'inbox'|'all' })
- update_task (data: { task_search: string, updates: { title?, due_date?, completed?, priority? } })
- delete_task (data: { task_search: string })
- chat (data: { message: string })

Câu lệnh người dùng:
"${message}"

JSON mẫu:
{
  "action": "create_task",
  "data": { "title": "Mua vé xem phim", "due_date": "2026-02-10 19:30:00", "priority": 1, "labels": ["Personal"] }
}
`;
}

/**
 * 5️⃣ HÀM GỌI AI (DÙNG GROQ LÀM CHÍNH - KHÔNG CÓ MOCK)
 */
async function callAI(message) {
    const groqKey = process.env.GROQ_API_KEY;

    if (!groqKey) {
        throw new Error("GROQ_API_KEY chưa được cấu hình trong .env");
    }

    const groq = new Groq({ apiKey: groqKey });

    const result = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: buildPrompt(message, new Date().toISOString().split('T')[0]) }],
        response_format: { type: "json_object" }
    });

    const text = result.choices[0].message.content;
    console.log("Groq Response:", text);
    return JSON.parse(text);
}

// Fallback "AI" bằng cơm (Regex) - Offline Mode nâng cao
function mockAIParser(message) {
    const lower = message.toLowerCase();

    // Helper: Remove used keywords to clean up title
    let cleanTitle = message;
    const remove = (regex) => { cleanTitle = cleanTitle.replace(regex, ""); };

    // --- PARSERS ---

    // 1. Create Task
    if (lower.includes("tạo task") || lower.includes("thêm task") || lower.includes("add task") || lower.includes("nhắc tôi")) {
        // Basic cleanup
        remove(/(tạo|thêm|add|nhắc tôi)\s+task/gi);
        remove(/nhắc tôi/gi);

        // a. Extract Priority
        let priority = 4;
        if (lower.includes("gấp") || lower.includes("quan trọng") || lower.includes("p1")) {
            priority = 1;
            remove(/(gấp|quan trọng|p1)/gi);
        } else if (lower.includes("p2")) {
            priority = 2; remove(/p2/gi);
        } else if (lower.includes("p3")) {
            priority = 3; remove(/p3/gi);
        }

        // b. Extract Date/Time
        let due_date = null;
        const now = new Date();

        // Detect "12h", "12:30"
        let timeStr = "09:00:00"; // Default deadline time if date mentioned but no time? Or keep null time.
        const timeMatch = lower.match(/(\d{1,2})h(\d{2})?|(\d{1,2}):(\d{2})/);
        if (timeMatch) {
            let h = timeMatch[1] || timeMatch[3];
            let m = timeMatch[2] || timeMatch[4] || "00";
            timeStr = `${h.padStart(2, '0')}:${m}:00`;
            remove(/(\d{1,2})h(\d{2})?|(\d{1,2}):(\d{2})/gi); // Remove time from title
        }

        if (lower.includes("hôm nay") || lower.includes("nay")) {
            due_date = now.toISOString().split('T')[0];
            if (timeMatch) due_date += ` ${timeStr}`;
            remove(/(hôm nay|bữa nay|chiều nay|tối nay|sáng nay)/gi);
        } else if (lower.includes("ngày mai") || lower.includes("mai") || lower.includes("sáng mai")) {
            const tmr = new Date(now);
            tmr.setDate(tmr.getDate() + 1);
            due_date = tmr.toISOString().split('T')[0];
            if (timeMatch) due_date += ` ${timeStr}`;
            remove(/(ngày mai|mai|sáng mai)/gi);
        }

        // c. Extract Labels (#label)
        const labels = [];
        const labelRegex = /#(\w+)/g;
        const labelMatches = message.match(labelRegex); // Use original message for case sensitivity if needed? or lower
        if (labelMatches) {
            labelMatches.forEach(tag => {
                labels.push(tag.replace('#', ''));
                cleanTitle = cleanTitle.replace(tag, "");
            });
        }

        // Final Title Cleanup
        cleanTitle = cleanTitle.replace(/\s+/g, " ").trim();
        // Remove trailing words like "vào", "lúc" if they are at the end
        cleanTitle = cleanTitle.replace(/\s(vào|lúc|ở|tại)$/, "");

        return {
            action: "create_task",
            data: {
                title: cleanTitle || "New Task",
                priority,
                due_date,
                labels
            }
        };
    }

    // 2. List Task
    if (lower.includes("danh sách") || lower.includes("list") || lower.includes("xem task")) {
        return { action: "list_task", data: {} };
    }

    // 3. Delete Task
    if (lower.includes("xóa task") || lower.includes("delete task")) {
        const search = message.replace(/(xóa|delete)\s+task/i, "").trim();
        return { action: "delete_task", data: { task_search: search } };
    }

    // 4. Update Task
    if (lower.includes("hoàn thành task") || lower.includes("xong task")) {
        const search = message.replace(/(hoàn thành|xong)\s+task/i, "").trim();
        return { action: "update_task", data: { task_search: search, updates: { completed: true } } };
    }

    // 5. Chat Fallback
    if (lower.includes("hi") || lower.includes("hello") || lower.includes("chào")) {
        return { action: "chat", data: { message: "Xin chào! 👋 Tôi là trợ lý ảo (đang chạy chế độ Offline). Bạn có thể thử: 'Tạo task đi chợ mai lúc 9h #hanoi', hoặc 'Xóa task đi chợ'." } };
    }

    if (lower.includes("bạn là ai") || lower.includes("làm gì")) {
        return { action: "chat", data: { message: "Tôi là AI quản lý công việc. Tôi có thể thực hiện: Thêm, Sửa, Xóa task giúp bạn." } };
    }

    return {
        action: "chat",
        data: { message: "⚠️ Tôi chưa hiểu ý bạn. Hãy thử: 'Tạo task [tên] lúc [giờ] #nhãn'." }
    };
}


/**
 * 6️⃣ XỬ LÝ ACTION (INTERACT WITH DB)
 */
async function handleAction(ai, userId) {
    const connection = await pool.getConnection();
    try {
        const resolveTaskId = async (search) => {
            if (!search) return null;
            if (/^\d+$/.test(search)) return parseInt(search);
            const [rows] = await connection.query(
                `SELECT id FROM tasks WHERE user_id = ? AND title LIKE ? LIMIT 1`,
                [userId, `%${search}%`]
            );
            return rows.length > 0 ? rows[0].id : null;
        };

        switch (ai.action) {
            case "create_task": {
                const [inbox] = await connection.query("SELECT id FROM projects WHERE user_id = ? AND is_inbox = 1 LIMIT 1", [userId]);
                const projectId = inbox.length ? inbox[0].id : null;

                const { title, description, priority, due_date, labels } = ai.data;

                // 1. Insert Task
                const [result] = await connection.query(
                    `INSERT INTO tasks (user_id, project_id, title, description, priority, due_date, section_id, created_at) 
                     VALUES (?, ?, ?, ?, ?, ?, NULL, NOW())`,
                    [userId, projectId, title, description || "", priority || 4, due_date || null]
                );
                const taskId = result.insertId;

                // 2. Insert Labels if present
                if (labels && Array.isArray(labels) && labels.length > 0) {
                    // Find existing label IDs
                    const placeholders = labels.map(() => '?').join(',');
                    const [existingLabels] = await connection.query(
                        `SELECT id, name FROM labels WHERE user_id = ? AND name IN (${placeholders})`,
                        [userId, ...labels]
                    );

                    // Map names to IDs
                    if (existingLabels.length > 0) {
                        const taskLabelValues = existingLabels.map(l => [taskId, l.id]);
                        await connection.query(
                            `INSERT INTO task_labels (task_id, label_id) VALUES ?`,
                            [taskLabelValues]
                        );
                    }
                }

                let replyMsg = `✅ Đã tạo task: "${title}"`;
                if (due_date) replyMsg += `\n📅 Hạn: ${due_date}`;
                if (priority === 1) replyMsg += `\n🔥 Ưu tiên: Cao`;
                if (labels && labels.length) replyMsg += `\n🏷️ Nhãn: ${labels.join(", ")}`;

                return { reply: replyMsg, shouldRefresh: true };
            }

            case "list_task": {
                const [tasks] = await connection.query(
                    "SELECT id, title, completed FROM tasks WHERE user_id = ? AND completed = 0 ORDER BY created_at DESC LIMIT 5",
                    [userId]
                );
                if (tasks.length === 0) return { reply: "📭 Bạn chưa có task nào chưa hoàn thành." };
                const listStr = tasks.map(t => `- [${t.id}] ${t.title}`).join("\n");
                return { reply: `📋 Danh sách 5 task gần nhất:\n${listStr}` };
            }

            case "delete_task": {
                const taskId = await resolveTaskId(ai.data.task_search);
                if (!taskId) return { reply: `❌ Không tìm thấy task nào khớp với "${ai.data.task_search}"` };

                const [rows] = await connection.query("SELECT title FROM tasks WHERE id = ?", [taskId]);
                const taskTitle = rows[0]?.title || taskId;

                await connection.query("DELETE FROM tasks WHERE id = ? AND user_id = ?", [taskId, userId]);
                return { reply: `🗑️ Đã xóa task: "${taskTitle}"`, shouldRefresh: true };
            }

            case "update_task": {
                const taskId = await resolveTaskId(ai.data.task_search);
                if (!taskId) return { reply: `❌ Không tìm thấy task nào khớp với "${ai.data.task_search}"` };

                const updates = ai.data.updates || {};
                const fields = [];
                const values = [];

                if (updates.title) { fields.push("title = ?"); values.push(updates.title); }
                if (updates.completed !== undefined) { fields.push("completed = ?"); values.push(updates.completed ? 1 : 0); }
                if (updates.due_date) { fields.push("due_date = ?"); values.push(updates.due_date); }

                if (fields.length === 0) return { reply: "⚠️ Không có thông tin nào cần cập nhật." };

                values.push(taskId, userId);
                await connection.query(`UPDATE tasks SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`, values);

                const [rows] = await connection.query("SELECT title FROM tasks WHERE id = ?", [taskId]);
                const taskTitle = rows[0]?.title || taskId;

                return { reply: `✅ Đã cập nhật task: "${taskTitle}"`, shouldRefresh: true };
            }

            case "chat":
            default:
                return { reply: ai.data.message || "🤖 Tôi có thể giúp gì cho bạn?" };
        }
    } finally {
        connection.release();
    }
}

router.post("/chat", verifyToken, async (req, res) => {
    try {
        const { message } = req.body;
        const userId = req.userId;

        await pool.query(`
            CREATE TABLE IF NOT EXISTS chat_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                role ENUM('user', 'bot') NOT NULL,
                message TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 1. Log User Message
        await pool.query("INSERT INTO chat_history (user_id, role, message) VALUES (?, 'user', ?)", [userId, message]);

        // 2. Call AI (or Mock)
        const aiResponse = await callAI(message);
        console.log("AI Intent:", aiResponse);

        // 3. Handle DB Action
        const result = await handleAction(aiResponse, userId);

        // 4. Log Bot Response
        await pool.query("INSERT INTO chat_history (user_id, role, message) VALUES (?, 'bot', ?)", [userId, result.reply]);

        res.json(result);

    } catch (error) {
        console.error("Chatbot Error:", error);
        res.status(500).json({ error: "Lỗi xử lý: " + error.message });
    }
});

export default router;
