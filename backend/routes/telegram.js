import TelegramBot from "node-telegram-bot-api";
import pool from "../db.js";
import bcrypt from "bcryptjs";
import "dotenv/config";
import axios from "axios";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Groq from "groq-sdk";
import cron from "node-cron";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get bot token from environment
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

let bot = null;

// Store for linking codes (in production, use Redis or database)
const linkingCodes = new Map();

// Initialize the Telegram Bot
export function initTelegramBot() {
    if (!TELEGRAM_BOT_TOKEN) {
        console.log("⚠️ TELEGRAM_BOT_TOKEN not set. Telegram bot disabled.");
        return null;
    }

    bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });
    console.log("🤖 Telegram Bot started successfully!");

    // Handle /start command
    bot.onText(/\/start(?:\s+(.+))?/, async (msg, match) => {
        const chatId = msg.chat.id;
        const linkCode = match[1];

        if (linkCode) {
            // User came from a linking URL
            const userId = linkingCodes.get(linkCode);
            if (userId) {
                const linkSuccess = await linkTelegramAccount(chatId, userId);
                if (linkSuccess) {
                    linkingCodes.delete(linkCode);
                    bot.sendMessage(chatId,
                        "✅ *Tài khoản đã được liên kết thành công!*\n\n" +
                        "Bây giờ bạn có thể quản lý task qua Telegram.\n\n" +
                        "📝 *Các lệnh có sẵn:*\n" +
                        "/add <nội dung> - Thêm task mới\n" +
                        "/list - Xem danh sách task\n" +
                        "/today - Xem task hôm nay\n" +
                        "/done <số thứ tự> - Hoàn thành task\n" +
                        "/edit <số thứ tự> <nội dung mới> - Sửa task\n" +
                        "/delete <số thứ tự> - Xóa task\n" +
                        "/help - Xem hướng dẫn",
                        { parse_mode: "Markdown" }
                    );
                } else {
                    bot.sendMessage(chatId, "❌ Có lỗi xảy ra khi lưu thông tin liên kết vào cơ sở dữ liệu. Vui lòng thử lại.");
                }
            } else {
                bot.sendMessage(chatId,
                    "❌ Mã liên kết không hợp lệ hoặc đã hết hạn.\n\n" +
                    "Vui lòng tạo mã liên kết mới từ ứng dụng TaskList."
                );
            }
        } else {
            // Regular start
            const user = await getUserByTelegramId(chatId);
            if (user) {
                bot.sendMessage(chatId,
                    `👋 Chào mừng trở lại, *${user.full_name}*!\n\n` +
                    "📝 *Các lệnh có sẵn:*\n" +
                    "/add <nội dung> - Thêm task mới\n" +
                    "/list - Xem danh sách task\n" +
                    "/today - Xem task hôm nay\n" +
                    "/done <số thứ tự> - Hoàn thành task\n" +
                    "/edit <số thứ tự> <nội dung mới> - Sửa task\n" +
                    "/delete <số thứ tự> - Xóa task\n" +
                    "/help - Xem hướng dẫn",
                    { parse_mode: "Markdown" }
                );
            } else {
                bot.sendMessage(chatId,
                    "👋 *Chào mừng đến với TaskList Bot!*\n\n" +
                    "Để bắt đầu sử dụng, bạn cần liên kết tài khoản TaskList của mình.\n\n" +
                    "📱 Vào ứng dụng TaskList → Cài đặt → Liên kết Telegram để lấy mã liên kết.",
                    { parse_mode: "Markdown" }
                );
            }
        }
    });

    // Handle /help command
    bot.onText(/\/help/, async (msg) => {
        const chatId = msg.chat.id;
        bot.sendMessage(chatId,
            "📝 *Hướng dẫn sử dụng TaskList Bot*\n\n" +
            "*Thêm task:*\n" +
            "`/add Mua sữa`\n" +
            "`/add Họp lúc 3h chiều !1` (ưu tiên cao)\n" +
            "`/add Nộp báo cáo @work` (gắn nhãn)\n" +
            "`/add Họp team #work ngày mai` (project + ngày)\n" +
            "`/add Deadline 15/02` (ngày cụ thể)\n\n" +
            "*Ngày đến hạn:*\n" +
            "• `hôm nay` hoặc `today`\n" +
            "• `ngày mai` hoặc `tomorrow`\n" +
            "• `tuần sau` hoặc `next week`\n" +
            "• `15/02` hoặc `15-02-2026`\n\n" +
            "*Labels & Projects:*\n" +
            "• `@labelname` - Gắn nhãn\n" +
            "• `#projectname` - Thêm vào project\n\n" +
            "*Xem danh sách:*\n" +
            "`/list` - Tất cả task\n" +
            "`/today` - Task hôm nay\n\n" +
            "*Quản lý task:*\n" +
            "`/done 1` - Hoàn thành task #1\n" +
            "`/edit 1 Nội dung mới` - Sửa task #1\n" +
            "`/delete 1` - Xóa task #1\n\n" +
            "*Ưu tiên:*\n" +
            "!1 = 🔴 Cao nhất | !2 = 🟠 Cao\n" +
            "!3 = 🔵 Trung bình | !4 = ⚪ Thấp",
            { parse_mode: "Markdown" }
        );
    });

    // Handle /add command
    bot.onText(/\/add\s+(.+)/, async (msg, match) => {
        const chatId = msg.chat.id;
        const taskContent = match[1];

        const user = await getUserByTelegramId(chatId);
        if (!user) {
            bot.sendMessage(chatId, "❌ Vui lòng liên kết tài khoản trước khi sử dụng.");
            return;
        }

        try {
            // Parse task content
            const parsed = parseTaskContent(taskContent);

            // Get user's projects
            const [userProjects] = await pool.query(
                `SELECT id, name, is_inbox FROM projects WHERE user_id = ?`,
                [user.id]
            );

            // Find project (default to inbox)
            let projectId = null;
            let projectName = "Inbox";

            if (parsed.project) {
                const foundProject = userProjects.find(p =>
                    p.name.toLowerCase() === parsed.project.toLowerCase()
                );
                if (foundProject) {
                    projectId = foundProject.id;
                    projectName = foundProject.name;
                } else {
                    // Project not found, use inbox
                    const inbox = userProjects.find(p => p.is_inbox === 1);
                    projectId = inbox ? inbox.id : null;
                }
            } else {
                // Use inbox as default
                const inbox = userProjects.find(p => p.is_inbox === 1);
                projectId = inbox ? inbox.id : null;
            }

            // Create the task
            const [result] = await pool.query(
                `INSERT INTO tasks (user_id, project_id, title, priority, due_date) VALUES (?, ?, ?, ?, ?)`,
                [user.id, projectId, parsed.title, parsed.priority, parsed.dueDate]
            );

            const taskId = result.insertId;

            // Add labels if any
            if (parsed.labels.length > 0) {
                // Get existing labels
                const [userLabels] = await pool.query(
                    `SELECT id, name FROM labels WHERE user_id = ?`,
                    [user.id]
                );

                for (const labelName of parsed.labels) {
                    let labelId = null;
                    const existingLabel = userLabels.find(l =>
                        l.name.toLowerCase() === labelName.toLowerCase()
                    );

                    if (existingLabel) {
                        labelId = existingLabel.id;
                    } else {
                        // Create new label
                        const [newLabel] = await pool.query(
                            `INSERT INTO labels (user_id, name, color) VALUES (?, ?, ?)`,
                            [user.id, labelName, getRandomColor()]
                        );
                        labelId = newLabel.insertId;
                    }

                    // Link label to task
                    await pool.query(
                        `INSERT INTO task_labels (task_id, label_id) VALUES (?, ?)`,
                        [taskId, labelId]
                    );
                }
            }

            // Build response message
            const priorityEmoji = getPriorityEmoji(parsed.priority);
            let response = `✅ *Task đã được tạo!*\n\n${priorityEmoji} ${escapeMarkdown(parsed.title)}`;

            if (parsed.dueDate) {
                response += `\n📅 ${formatDate(parsed.dueDate)}`;
            }
            if (parsed.labels.length > 0) {
                response += `\n🏷️ ${parsed.labels.map(l => '@' + l).join(' ')}`;
            }
            if (projectName !== "Inbox") {
                response += `\n📁 #${projectName}`;
            }
            response += `\n\nID: #${taskId}`;

            bot.sendMessage(chatId, response, { parse_mode: "Markdown" });
        } catch (error) {
            console.error("Telegram add task error:", error);
            bot.sendMessage(chatId, "❌ Có lỗi xảy ra khi tạo task. Vui lòng thử lại.");
        }
    });

    // Handle /list command
    bot.onText(/\/list/, async (msg) => {
        const chatId = msg.chat.id;

        const user = await getUserByTelegramId(chatId);
        if (!user) {
            bot.sendMessage(chatId, "❌ Vui lòng liên kết tài khoản trước khi sử dụng.");
            return;
        }

        try {
            const [tasks] = await pool.query(
                `SELECT t.id, t.title, t.priority, t.due_date, p.name as project_name
         FROM tasks t
         LEFT JOIN projects p ON t.project_id = p.id
         WHERE t.user_id = ? AND t.completed = 0
         ORDER BY t.priority ASC, t.created_at DESC
         LIMIT 20`,
                [user.id]
            );

            if (tasks.length === 0) {
                bot.sendMessage(chatId, "📭 Bạn không có task nào. Dùng /add để thêm task mới!");
                return;
            }

            let message = "📋 *Danh sách task của bạn:*\n\n";
            tasks.forEach((task, index) => {
                const priorityEmoji = getPriorityEmoji(task.priority);
                const dueDate = task.due_date ? ` 📅 ${formatDate(task.due_date)}` : "";
                const project = task.project_name ? ` 📁 ${task.project_name}` : "";
                message += `${index + 1}. ${priorityEmoji} ${escapeMarkdown(task.title)}${dueDate}${project}\n`;
            });

            message += "\n_Dùng /done <số> để hoàn thành task_";
            bot.sendMessage(chatId, message, { parse_mode: "Markdown" });

            // Store task mapping for this user session
            await storeTaskMapping(chatId, tasks);
        } catch (error) {
            console.error("Telegram list tasks error:", error);
            bot.sendMessage(chatId, "❌ Có lỗi xảy ra khi lấy danh sách task.");
        }
    });

    // Handle /today command
    bot.onText(/\/today/, async (msg) => {
        const chatId = msg.chat.id;

        const user = await getUserByTelegramId(chatId);
        if (!user) {
            bot.sendMessage(chatId, "❌ Vui lòng liên kết tài khoản trước khi sử dụng.");
            return;
        }

        try {
            const [tasks] = await pool.query(
                `SELECT t.id, t.title, t.priority, t.due_date, p.name as project_name
         FROM tasks t
         LEFT JOIN projects p ON t.project_id = p.id
         WHERE t.user_id = ? AND t.completed = 0 
         AND DATE(t.due_date) = CURDATE()
         ORDER BY t.priority ASC, t.created_at DESC`,
                [user.id]
            );

            if (tasks.length === 0) {
                bot.sendMessage(chatId, "🎉 Không có task nào cho hôm nay!");
                return;
            }

            let message = "📅 *Task hôm nay:*\n\n";
            tasks.forEach((task, index) => {
                const priorityEmoji = getPriorityEmoji(task.priority);
                const project = task.project_name ? ` 📁 ${task.project_name}` : "";
                message += `${index + 1}. ${priorityEmoji} ${escapeMarkdown(task.title)}${project}\n`;
            });

            message += "\n_Dùng /done <số> để hoàn thành task_";
            bot.sendMessage(chatId, message, { parse_mode: "Markdown" });

            await storeTaskMapping(chatId, tasks);
        } catch (error) {
            console.error("Telegram today tasks error:", error);
            bot.sendMessage(chatId, "❌ Có lỗi xảy ra khi lấy danh sách task hôm nay.");
        }
    });

    // Handle /done command
    bot.onText(/\/done\s+(\d+)/, async (msg, match) => {
        const chatId = msg.chat.id;
        const taskIndex = parseInt(match[1]) - 1;

        const user = await getUserByTelegramId(chatId);
        if (!user) {
            bot.sendMessage(chatId, "❌ Vui lòng liên kết tài khoản trước khi sử dụng.");
            return;
        }

        try {
            const taskMapping = await getTaskMapping(chatId);
            if (!taskMapping || taskIndex < 0 || taskIndex >= taskMapping.length) {
                bot.sendMessage(chatId, "❌ Số thứ tự không hợp lệ. Dùng /list để xem danh sách task.");
                return;
            }

            const taskId = taskMapping[taskIndex];

            // Get task title before completing
            const [taskRows] = await pool.query(
                `SELECT title FROM tasks WHERE id = ? AND user_id = ?`,
                [taskId, user.id]
            );

            if (taskRows.length === 0) {
                bot.sendMessage(chatId, "❌ Task không tồn tại.");
                return;
            }

            await pool.query(
                `UPDATE tasks SET completed = 1 WHERE id = ? AND user_id = ?`,
                [taskId, user.id]
            );

            bot.sendMessage(chatId,
                `✅ *Hoàn thành!*\n\n~${escapeMarkdown(taskRows[0].title)}~`,
                { parse_mode: "Markdown" }
            );
        } catch (error) {
            console.error("Telegram done task error:", error);
            bot.sendMessage(chatId, "❌ Có lỗi xảy ra khi hoàn thành task.");
        }
    });

    // Handle /edit command
    bot.onText(/\/edit\s+(\d+)\s+(.+)/, async (msg, match) => {
        const chatId = msg.chat.id;
        const taskIndex = parseInt(match[1]) - 1;
        const newContent = match[2];

        const user = await getUserByTelegramId(chatId);
        if (!user) {
            bot.sendMessage(chatId, "❌ Vui lòng liên kết tài khoản trước khi sử dụng.");
            return;
        }

        try {
            const taskMapping = await getTaskMapping(chatId);
            if (!taskMapping || taskIndex < 0 || taskIndex >= taskMapping.length) {
                bot.sendMessage(chatId, "❌ Số thứ tự không hợp lệ. Dùng /list để xem danh sách task.");
                return;
            }

            const taskId = taskMapping[taskIndex];

            await pool.query(
                `UPDATE tasks SET title = ? WHERE id = ? AND user_id = ?`,
                [newContent, taskId, user.id]
            );

            bot.sendMessage(chatId,
                `✏️ *Task đã được cập nhật!*\n\n${escapeMarkdown(newContent)}`,
                { parse_mode: "Markdown" }
            );
        } catch (error) {
            console.error("Telegram edit task error:", error);
            bot.sendMessage(chatId, "❌ Có lỗi xảy ra khi sửa task.");
        }
    });



    // Handle /delete command
    bot.onText(/\/delete\s+(\d+)/, async (msg, match) => {
        const chatId = msg.chat.id;
        const taskIndex = parseInt(match[1]) - 1;

        const user = await getUserByTelegramId(chatId);
        if (!user) {
            bot.sendMessage(chatId, "❌ Vui lòng liên kết tài khoản trước khi sử dụng.");
            return;
        }

        try {
            const taskMapping = await getTaskMapping(chatId);
            if (!taskMapping || taskIndex < 0 || taskIndex >= taskMapping.length) {
                bot.sendMessage(chatId, "❌ Số thứ tự không hợp lệ. Dùng /list để xem danh sách task.");
                return;
            }

            const taskId = taskMapping[taskIndex];

            // Get task title before deleting
            const [taskRows] = await pool.query(
                `SELECT title FROM tasks WHERE id = ? AND user_id = ?`,
                [taskId, user.id]
            );

            if (taskRows.length === 0) {
                bot.sendMessage(chatId, "❌ Task không tồn tại.");
                return;
            }

            // Delete task labels first (foreign key constraint)
            await pool.query(`DELETE FROM task_labels WHERE task_id = ?`, [taskId]);

            // Delete task comments
            await pool.query(`DELETE FROM task_comments WHERE task_id = ?`, [taskId]);

            // Delete the task
            await pool.query(
                `DELETE FROM tasks WHERE id = ? AND user_id = ?`,
                [taskId, user.id]
            );

            bot.sendMessage(chatId,
                `🗑️ *Task đã bị xóa!*\n\n~${escapeMarkdown(taskRows[0].title)}~`,
                { parse_mode: "Markdown" }
            );
        } catch (error) {
            console.error("Telegram delete task error:", error);
            bot.sendMessage(chatId, "❌ Có lỗi xảy ra khi xóa task.");
        }
    });

    // Handle natural language messages
    bot.on("message", async (msg) => {
        const chatId = msg.chat.id;
        const text = msg.text || "";

        // Ignore if it's a known command
        if (text.startsWith("/start") || text.startsWith("/help") ||
            text.startsWith("/add") || text.startsWith("/list") ||
            text.startsWith("/today") || text.startsWith("/done") ||
            text.startsWith("/edit") || text.startsWith("/delete")) {
            return;
        }

        // Skip empty or command-like messages
        if (!text || text.startsWith("/")) {
            return;
        }

        const lowerText = text.toLowerCase().trim();

        // Check if user is linked
        const user = await getUserByTelegramId(chatId);
        if (!user) {
            bot.sendMessage(chatId,
                "❌ Vui lòng liên kết tài khoản trước.\n\n" +
                "📱 Vào ứng dụng TaskList → Telegram để lấy mã liên kết."
            );
            return;
        }

        // Pattern matching for natural language
        let handled = false;

        // === VIEW TODAY'S TASKS ===
        if (matchPattern(lowerText, [
            "hôm nay", "hom nay", "today",
            "hôm nay có gì", "hom nay co gi",
            "task hôm nay", "task hom nay",
            "việc hôm nay", "viec hom nay",
            "có gì hôm nay", "co gi hom nay"
        ])) {
            await handleTodayCommand(chatId, user);
            handled = true;
        }

        // === VIEW ALL TASKS ===
        else if (matchPattern(lowerText, [
            "xem task", "cho xem task", "list", "danh sách",
            "có task gì", "co task gi", "tất cả task",
            "show task", "các task", "cac task",
            "việc cần làm", "viec can lam"
        ])) {
            await handleListCommand(chatId, user);
            handled = true;
        }

        // === COMPLETE TASK ===
        else if (matchPattern(lowerText, [
            "xong", "done", "hoàn thành", "hoan thanh",
            "đã xong", "da xong", "làm xong", "lam xong"
        ])) {
            // Try to extract task number
            const numMatch = lowerText.match(/(\d+)/);
            if (numMatch) {
                await handleDoneCommand(chatId, user, parseInt(numMatch[1]) - 1);
                handled = true;
            } else {
                bot.sendMessage(chatId,
                    "✅ Bạn muốn hoàn thành task nào?\n\n" +
                    "Ví dụ: `xong task 1` hoặc `/done 1`",
                    { parse_mode: "Markdown" }
                );
                handled = true;
            }
        }

        // === DELETE TASK ===
        else if (matchPattern(lowerText, [
            "xóa", "xoa", "delete", "remove", "bỏ", "bo"
        ])) {
            const numMatch = lowerText.match(/(\d+)/);
            if (numMatch) {
                await handleDeleteCommand(chatId, user, parseInt(numMatch[1]) - 1);
                handled = true;
            } else {
                bot.sendMessage(chatId,
                    "�️ Bạn muốn xóa task nào?\n\n" +
                    "Ví dụ: `xóa task 1` hoặc `/delete 1`",
                    { parse_mode: "Markdown" }
                );
                handled = true;
            }
        }

        // === ADD TASK (implicit) ===
        else if (matchPattern(lowerText, [
            "thêm", "them", "add", "tạo", "tao",
            "nhắc", "nhac", "remind"
        ])) {
            // Extract task content after the keyword
            let taskContent = text;
            const addKeywords = ["thêm", "them", "add", "tạo", "tao", "nhắc", "nhac", "remind"];
            for (const kw of addKeywords) {
                const regex = new RegExp(`^${kw}\\s+`, "i");
                if (regex.test(taskContent)) {
                    taskContent = taskContent.replace(regex, "").trim();
                    break;
                }
            }

            if (taskContent && taskContent.length > 0) {
                await handleAddCommand(chatId, user, taskContent);
                handled = true;
            } else {
                bot.sendMessage(chatId,
                    "➕ Bạn muốn thêm task gì?\n\n" +
                    "Ví dụ: `thêm mua sữa` hoặc `/add mua sữa`",
                    { parse_mode: "Markdown" }
                );
                handled = true;
            }
        }

        // === HELP ===
        else if (matchPattern(lowerText, [
            "help", "giúp", "giup", "hướng dẫn", "huong dan",
            "cách dùng", "cach dung", "làm sao", "lam sao"
        ])) {
            bot.sendMessage(chatId,
                "📝 *Bạn có thể nói tự nhiên:*\n\n" +
                "• \"hôm nay có task gì\" → xem task hôm nay\n" +
                "• \"cho xem task\" → xem tất cả task\n" +
                "• \"xong task 1\" → hoàn thành task #1\n" +
                "• \"xóa task 2\" → xóa task #2\n" +
                "• \"thêm mua sữa\" → thêm task mới\n\n" +
                "_Hoặc dùng lệnh: /help để xem đầy đủ_",
                { parse_mode: "Markdown" }
            );
            handled = true;
        }

        // === DEFAULT: Suggest adding as task ===
        if (!handled) {
            // Check if it looks like a task (not a question)
            if (!lowerText.includes("?") && text.length < 100) {
                bot.sendMessage(chatId,
                    `💡 *Thêm task này?*\n\n` +
                    `📝 ${escapeMarkdown(text)}\n\n` +
                    `Gõ \`thêm ${text.substring(0, 30)}${text.length > 30 ? '...' : ''}\` hoặc dùng /add`,
                    { parse_mode: "Markdown" }
                );
            } else {
                bot.sendMessage(chatId,
                    "🤔 Tôi chưa hiểu. Thử:\n" +
                    "• \"hôm nay có gì\"\n" +
                    "• \"xem task\"\n" +
                    "• \"thêm [nội dung]\"\n" +
                    "• /help"
                );
            }
        }
    });



    // Handle photo messages (Scan Image)
    bot.on("photo", async (msg) => {
        const chatId = msg.chat.id;
        const user = await getUserByTelegramId(chatId);

        if (!user) {
            bot.sendMessage(chatId, "❌ Vui lòng liên kết tài khoản trước.");
            return;
        }

        try {
            bot.sendMessage(chatId, "📷 Đang phân tích hình ảnh...");

            // Get the largest photo available
            const photo = msg.photo[msg.photo.length - 1];
            const fileId = photo.file_id;
            const file = await bot.getFile(fileId);
            const fileUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${file.file_path}`;

            // Download photo
            const response = await axios({
                method: 'get',
                url: fileUrl,
                responseType: 'arraybuffer'
            });

            // Save temporarily
            const tempDir = path.join(__dirname, '../temp');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }
            const tempFile = path.join(tempDir, `photo_${chatId}_${Date.now()}.jpg`);
            fs.writeFileSync(tempFile, Buffer.from(response.data));

            // Call Groq Vision
            const groqKey = process.env.GROQ_API_KEY;
            if (!groqKey) {
                bot.sendMessage(chatId, "⚠️ Cần cấu hình GROQ_API_KEY để sử dụng tính năng này.");
                fs.unlinkSync(tempFile);
                return;
            }

            const groq = new Groq({ apiKey: groqKey });

            const base64Image = Buffer.from(fs.readFileSync(tempFile)).toString("base64");
            const dataUrl = `data:image/jpeg;base64,${base64Image}`;

            const prompt = "Hãy trích xuất nội dung công việc hoặc văn bản quan trọng từ hình ảnh này. Trả về dưới dạng một câu ngắn gọn để làm tên công việc. Nếu có nhiều việc, hãy liệt kê ngăn cách bằng dấu phẩy. Chỉ trả về nội dung text, không giải thích thêm.";

            const result = await groq.chat.completions.create({
                model: "llama-3.2-11b-vision-preview",
                messages: [
                    {
                        role: "user",
                        content: [
                            { type: "text", text: prompt },
                            { type: "image_url", image_url: { url: dataUrl } }
                        ]
                    }
                ]
            });

            const text = result.choices[0].message.content.trim();

            fs.unlinkSync(tempFile); // Clean up

            if (!text) {
                bot.sendMessage(chatId, "❌ Không tìm thấy nội dung trong ảnh.");
                return;
            }

            bot.sendMessage(chatId,
                `📷 *Đã trích xuất:*\n"${escapeMarkdown(text)}"\n\n` +
                `💡 Bạn có muốn tạo task này không?\n` +
                `Gõ: /add ${text}`,
                { parse_mode: "Markdown" }
            );

        } catch (error) {
            console.error("Photo processing error:", error);
            bot.sendMessage(chatId, "❌ Có lỗi khi xử lý hình ảnh.");
        }
    });

    // Handle voice messages
    bot.on("voice", async (msg) => {
        const chatId = msg.chat.id;

        const user = await getUserByTelegramId(chatId);
        if (!user) {
            bot.sendMessage(chatId,
                "❌ Vui lòng liên kết tài khoản trước.\n\n" +
                "📱 Vào ứng dụng TaskList → Telegram để lấy mã liên kết."
            );
            return;
        }

        try {
            // Send processing indicator
            bot.sendMessage(chatId, "🎤 Đang xử lý tin nhắn thoại...");

            // Get file info
            const fileId = msg.voice.file_id;
            const file = await bot.getFile(fileId);
            const fileUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${file.file_path}`;

            // Download the voice file
            const response = await axios({
                method: 'get',
                url: fileUrl,
                responseType: 'arraybuffer'
            });

            // Save temporarily
            const tempDir = path.join(__dirname, '../temp');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }
            const tempFile = path.join(tempDir, `voice_${chatId}_${Date.now()}.ogg`);
            fs.writeFileSync(tempFile, Buffer.from(response.data));

            // Transcribe using Groq Whisper
            const groqKey = process.env.GROQ_API_KEY;
            let transcribedText = "";

            if (groqKey) {
                const groq = new Groq({ apiKey: groqKey });
                const transcription = await groq.audio.transcriptions.create({
                    file: fs.createReadStream(tempFile),
                    model: "whisper-large-v3-turbo",
                    language: "vi"
                });
                transcribedText = transcription.text;
            } else {
                bot.sendMessage(chatId,
                    "⚠️ Tính năng ghi âm cần GROQ_API_KEY.\n\n" +
                    "Vui lòng gõ tin nhắn thay vì gửi voice."
                );
                fs.unlinkSync(tempFile);
                return;
            }

            // Clean up temp file
            fs.unlinkSync(tempFile);

            if (!transcribedText || transcribedText.trim() === "") {
                bot.sendMessage(chatId, "❌ Không thể nhận dạng giọng nói. Vui lòng thử lại.");
                return;
            }

            // Send transcribed text back to user
            bot.sendMessage(chatId,
                `🎤 *Đã nhận:* "${escapeMarkdown(transcribedText)}"`,
                { parse_mode: "Markdown" }
            );

            // Process the transcribed text like a regular message
            const lowerText = transcribedText.toLowerCase().trim();

            // Same logic as text message handler
            if (matchPattern(lowerText, ["hôm nay", "hom nay", "today", "task hôm nay"])) {
                await handleTodayCommand(chatId, user);
            } else if (matchPattern(lowerText, ["xem task", "danh sách", "list", "các task"])) {
                await handleListCommand(chatId, user);
            } else if (matchPattern(lowerText, ["xong", "done", "hoàn thành"])) {
                const numMatch = lowerText.match(/(\d+)/);
                if (numMatch) {
                    await handleDoneCommand(chatId, user, parseInt(numMatch[1]) - 1);
                } else {
                    bot.sendMessage(chatId, "✅ Bạn muốn hoàn thành task nào? Nói \"xong task 1\"");
                }
            } else if (matchPattern(lowerText, ["xóa", "xoa", "delete"])) {
                const numMatch = lowerText.match(/(\d+)/);
                if (numMatch) {
                    await handleDeleteCommand(chatId, user, parseInt(numMatch[1]) - 1);
                } else {
                    bot.sendMessage(chatId, "🗑️ Bạn muốn xóa task nào? Nói \"xóa task 1\"");
                }
            } else if (matchPattern(lowerText, ["thêm", "them", "add", "tạo", "nhắc"])) {
                let taskContent = transcribedText;
                const addKeywords = ["thêm", "them", "add", "tạo", "tao", "nhắc", "nhac"];
                for (const kw of addKeywords) {
                    const regex = new RegExp(`^${kw}\\s+`, "i");
                    if (regex.test(taskContent)) {
                        taskContent = taskContent.replace(regex, "").trim();
                        break;
                    }
                }
                if (taskContent) {
                    await handleAddCommand(chatId, user, taskContent);
                }
            } else {
                // Default: treat as new task
                bot.sendMessage(chatId,
                    `💡 *Thêm task này?*\n\n` +
                    `📝 ${escapeMarkdown(transcribedText)}\n\n` +
                    `Nói "thêm ${transcribedText.substring(0, 20)}..." hoặc gõ /add`,
                    { parse_mode: "Markdown" }
                );
            }
        } catch (error) {
            console.error("Voice message error:", error);
            bot.sendMessage(chatId,
                "❌ Có lỗi khi xử lý tin nhắn thoại.\n\n" +
                "Vui lòng thử gõ tin nhắn thay vì gửi voice."
            );
        }
    });

    // Start daily reminders
    startDailyReminders();

    return bot;
}

// Pattern matching helper
function matchPattern(text, patterns) {
    return patterns.some(pattern => text.includes(pattern));
}

// Handler functions for natural language commands
async function handleTodayCommand(chatId, user) {
    try {
        const [tasks] = await pool.query(
            `SELECT t.id, t.title, t.priority, t.due_date, p.name as project_name
             FROM tasks t
             LEFT JOIN projects p ON t.project_id = p.id
             WHERE t.user_id = ? AND t.completed = 0 
             AND DATE(t.due_date) = CURDATE()
             ORDER BY t.priority ASC, t.created_at DESC`,
            [user.id]
        );

        if (tasks.length === 0) {
            bot.sendMessage(chatId, "🎉 Không có task nào cho hôm nay!");
            return;
        }

        let message = "📅 *Task hôm nay:*\n\n";
        tasks.forEach((task, index) => {
            const priorityEmoji = getPriorityEmoji(task.priority);
            const project = task.project_name ? ` 📁 ${task.project_name}` : "";
            message += `${index + 1}. ${priorityEmoji} ${escapeMarkdown(task.title)}${project}\n`;
        });

        message += "\n_Nói \"xong 1\" để hoàn thành task_";
        bot.sendMessage(chatId, message, { parse_mode: "Markdown" });

        await storeTaskMapping(chatId, tasks);
    } catch (error) {
        console.error("handleTodayCommand error:", error);
        bot.sendMessage(chatId, "❌ Có lỗi xảy ra.");
    }
}

async function handleListCommand(chatId, user) {
    try {
        const [tasks] = await pool.query(
            `SELECT t.id, t.title, t.priority, t.due_date, p.name as project_name
             FROM tasks t
             LEFT JOIN projects p ON t.project_id = p.id
             WHERE t.user_id = ? AND t.completed = 0
             ORDER BY t.priority ASC, t.created_at DESC
             LIMIT 20`,
            [user.id]
        );

        if (tasks.length === 0) {
            bot.sendMessage(chatId, "📭 Bạn không có task nào. Nói \"thêm [nội dung]\" để tạo task mới!");
            return;
        }

        let message = "📋 *Danh sách task:*\n\n";
        tasks.forEach((task, index) => {
            const priorityEmoji = getPriorityEmoji(task.priority);
            const dueDate = task.due_date ? ` 📅 ${formatDate(task.due_date)}` : "";
            const project = task.project_name ? ` 📁 ${task.project_name}` : "";
            message += `${index + 1}. ${priorityEmoji} ${escapeMarkdown(task.title)}${dueDate}${project}\n`;
        });

        message += "\n_Nói \"xong 1\" để hoàn thành task_";
        bot.sendMessage(chatId, message, { parse_mode: "Markdown" });

        await storeTaskMapping(chatId, tasks);
    } catch (error) {
        console.error("handleListCommand error:", error);
        bot.sendMessage(chatId, "❌ Có lỗi xảy ra.");
    }
}

async function handleDoneCommand(chatId, user, taskIndex) {
    try {
        const taskMapping = await getTaskMapping(chatId);
        if (!taskMapping || taskIndex < 0 || taskIndex >= taskMapping.length) {
            bot.sendMessage(chatId, "❌ Số thứ tự không hợp lệ. Nói \"xem task\" để xem danh sách.");
            return;
        }

        const taskId = taskMapping[taskIndex];

        const [taskRows] = await pool.query(
            `SELECT title FROM tasks WHERE id = ? AND user_id = ?`,
            [taskId, user.id]
        );

        if (taskRows.length === 0) {
            bot.sendMessage(chatId, "❌ Task không tồn tại.");
            return;
        }

        await pool.query(
            `UPDATE tasks SET completed = 1 WHERE id = ? AND user_id = ?`,
            [taskId, user.id]
        );

        bot.sendMessage(chatId,
            `✅ *Hoàn thành!*\n\n~${escapeMarkdown(taskRows[0].title)}~`,
            { parse_mode: "Markdown" }
        );
    } catch (error) {
        console.error("handleDoneCommand error:", error);
        bot.sendMessage(chatId, "❌ Có lỗi xảy ra.");
    }
}

async function handleDeleteCommand(chatId, user, taskIndex) {
    try {
        const taskMapping = await getTaskMapping(chatId);
        if (!taskMapping || taskIndex < 0 || taskIndex >= taskMapping.length) {
            bot.sendMessage(chatId, "❌ Số thứ tự không hợp lệ. Nói \"xem task\" để xem danh sách.");
            return;
        }

        const taskId = taskMapping[taskIndex];

        const [taskRows] = await pool.query(
            `SELECT title FROM tasks WHERE id = ? AND user_id = ?`,
            [taskId, user.id]
        );

        if (taskRows.length === 0) {
            bot.sendMessage(chatId, "❌ Task không tồn tại.");
            return;
        }

        await pool.query(`DELETE FROM task_labels WHERE task_id = ?`, [taskId]);
        await pool.query(`DELETE FROM task_comments WHERE task_id = ?`, [taskId]);
        await pool.query(
            `DELETE FROM tasks WHERE id = ? AND user_id = ?`,
            [taskId, user.id]
        );

        bot.sendMessage(chatId,
            `🗑️ *Đã xóa!*\n\n~${escapeMarkdown(taskRows[0].title)}~`,
            { parse_mode: "Markdown" }
        );
    } catch (error) {
        console.error("handleDeleteCommand error:", error);
        bot.sendMessage(chatId, "❌ Có lỗi xảy ra.");
    }
}

async function handleAddCommand(chatId, user, taskContent) {
    try {
        const parsed = parseTaskContent(taskContent);

        const [userProjects] = await pool.query(
            `SELECT id, name, is_inbox FROM projects WHERE user_id = ?`,
            [user.id]
        );

        let projectId = null;
        let projectName = "Inbox";

        if (parsed.project) {
            const foundProject = userProjects.find(p =>
                p.name.toLowerCase() === parsed.project.toLowerCase()
            );
            if (foundProject) {
                projectId = foundProject.id;
                projectName = foundProject.name;
            } else {
                const inbox = userProjects.find(p => p.is_inbox === 1);
                projectId = inbox ? inbox.id : null;
            }
        } else {
            const inbox = userProjects.find(p => p.is_inbox === 1);
            projectId = inbox ? inbox.id : null;
        }

        const [result] = await pool.query(
            `INSERT INTO tasks (user_id, project_id, title, priority, due_date) VALUES (?, ?, ?, ?, ?)`,
            [user.id, projectId, parsed.title, parsed.priority, parsed.dueDate]
        );

        const taskId = result.insertId;

        if (parsed.labels.length > 0) {
            const [userLabels] = await pool.query(
                `SELECT id, name FROM labels WHERE user_id = ?`,
                [user.id]
            );

            for (const labelName of parsed.labels) {
                let labelId = null;
                const existingLabel = userLabels.find(l =>
                    l.name.toLowerCase() === labelName.toLowerCase()
                );

                if (existingLabel) {
                    labelId = existingLabel.id;
                } else {
                    const [newLabel] = await pool.query(
                        `INSERT INTO labels (user_id, name, color) VALUES (?, ?, ?)`,
                        [user.id, labelName, getRandomColor()]
                    );
                    labelId = newLabel.insertId;
                }

                await pool.query(
                    `INSERT INTO task_labels (task_id, label_id) VALUES (?, ?)`,
                    [taskId, labelId]
                );
            }
        }

        const priorityEmoji = getPriorityEmoji(parsed.priority);
        let response = `✅ *Task đã tạo!*\n\n${priorityEmoji} ${escapeMarkdown(parsed.title)}`;

        if (parsed.dueDate) {
            response += `\n📅 ${formatDate(parsed.dueDate)}`;
        }
        if (parsed.labels.length > 0) {
            response += `\n🏷️ ${parsed.labels.map(l => '@' + l).join(' ')}`;
        }
        if (projectName !== "Inbox") {
            response += `\n📁 #${projectName}`;
        }

        bot.sendMessage(chatId, response, { parse_mode: "Markdown" });
    } catch (error) {
        console.error("handleAddCommand error:", error);
        bot.sendMessage(chatId, "❌ Có lỗi xảy ra khi tạo task.");
    }
}

// Helper functions
async function getUserByTelegramId(telegramId) {
    try {
        const [rows] = await pool.query(
            `SELECT id, full_name, email, telegram_id FROM users WHERE telegram_id = ?`,
            [telegramId.toString()]
        );
        return rows.length > 0 ? rows[0] : null;
    } catch (error) {
        console.error("Get user by telegram ID error:", error);
        return null;
    }
}

async function linkTelegramAccount(telegramId, userId) {
    try {
        await pool.query(
            `UPDATE users SET telegram_id = ? WHERE id = ?`,
            [telegramId.toString(), userId]
        );
        return true;
    } catch (error) {
        console.error("Link telegram account error:", error);
        return false;
    }
}

function getPriorityEmoji(priority) {
    switch (priority) {
        case 1: return "🔴";
        case 2: return "🟠";
        case 3: return "🔵";
        default: return "⚪";
    }
}

function formatDate(date) {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

function escapeMarkdown(text) {
    return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, "\\$&");
}

// Parse task content to extract title, priority, labels, project, and date
function parseTaskContent(content) {
    let title = content;
    let priority = 4;
    const labels = [];
    let project = null;
    let dueDate = null;

    // Extract priority (!1 to !4)
    const priorityMatch = title.match(/!([1-4])/);
    if (priorityMatch) {
        priority = parseInt(priorityMatch[1]);
        title = title.replace(/!([1-4])/, "").trim();
    }

    // Extract labels (@label)
    const labelMatches = title.match(/@(\w+)/g);
    if (labelMatches) {
        labelMatches.forEach(l => {
            labels.push(l.substring(1)); // Remove @ prefix
        });
        title = title.replace(/@\w+/g, "").trim();
    }

    // Extract project (#project)
    const projectMatch = title.match(/#(\w+)/);
    if (projectMatch) {
        project = projectMatch[1];
        title = title.replace(/#\w+/, "").trim();
    }

    // Extract date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check for Vietnamese date keywords
    const lowerContent = title.toLowerCase();

    if (lowerContent.includes("hôm nay") || lowerContent.includes("hom nay") || lowerContent.includes("today")) {
        dueDate = today;
        title = title.replace(/hôm nay|hom nay|today/gi, "").trim();
    } else if (lowerContent.includes("ngày mai") || lowerContent.includes("ngay mai") || lowerContent.includes("tomorrow")) {
        dueDate = new Date(today);
        dueDate.setDate(dueDate.getDate() + 1);
        title = title.replace(/ngày mai|ngay mai|tomorrow/gi, "").trim();
    } else if (lowerContent.includes("tuần sau") || lowerContent.includes("tuan sau") || lowerContent.includes("next week")) {
        dueDate = new Date(today);
        dueDate.setDate(dueDate.getDate() + 7);
        title = title.replace(/tuần sau|tuan sau|next week/gi, "").trim();
    } else {
        // Check for date format dd/mm or dd-mm or dd.mm
        const dateMatch = title.match(/(\d{1,2})[\/\-\.](\d{1,2})(?:[\/\-\.](\d{2,4}))?/);
        if (dateMatch) {
            const day = parseInt(dateMatch[1]);
            const month = parseInt(dateMatch[2]) - 1; // 0-indexed
            let year = dateMatch[3] ? parseInt(dateMatch[3]) : today.getFullYear();

            // Handle 2-digit year
            if (year < 100) {
                year += 2000;
            }

            dueDate = new Date(year, month, day);

            // If date is in the past, assume next year
            if (dueDate < today && !dateMatch[3]) {
                dueDate.setFullYear(today.getFullYear() + 1);
            }

            title = title.replace(/(\d{1,2})[\/\-\.](\d{1,2})(?:[\/\-\.](\d{2,4}))?/, "").trim();
        }
    }

    // Clean up extra spaces
    title = title.replace(/\s+/g, " ").trim();

    return {
        title,
        priority,
        labels,
        project,
        dueDate
    };
}

// Get a random color for new labels
function getRandomColor() {
    const colors = [
        "#61BD4F", "#F2D600", "#FFAB4A", "#EB5A46", "#C377E0",
        "#0079BF", "#00C2E0", "#51E898", "#FF80CE", "#344563"
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

// Task mapping storage (in-memory, consider using Redis for production)
const taskMappings = new Map();

async function storeTaskMapping(chatId, tasks) {
    taskMappings.set(chatId.toString(), tasks.map(t => t.id));
}

async function getTaskMapping(chatId) {
    return taskMappings.get(chatId.toString()) || null;
}

// Generate a linking code for a user
export function generateLinkingCode(userId) {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    linkingCodes.set(code, userId);

    // Expire after 10 minutes
    setTimeout(() => {
        linkingCodes.delete(code);
    }, 10 * 60 * 1000);

    return code;
}

// Get bot instance for external use
export function getBot() {
    return bot;
}

// Get bot username for deep linking
export function getBotUsername() {
    if (bot && bot.options) {
        return process.env.TELEGRAM_BOT_USERNAME || null;
    }
    return null;
}

// Schedule daily reminders at 7:00 AM
function startDailyReminders() {
    cron.schedule("0 7 * * *", async () => {
        console.log("⏰ Running daily task reminders...");
        try {
            const [users] = await pool.query(
                `SELECT id, telegram_id, full_name FROM users WHERE telegram_id IS NOT NULL`
            );

            for (const user of users) {
                await sendDailySummary(user);
            }
        } catch (error) {
            console.error("Daily reminder error:", error);
        }
    });
    console.log("📅 Daily reminders scheduled for 7:00 AM");
}

async function sendDailySummary(user) {
    if (!user.telegram_id) return;

    try {
        const [tasks] = await pool.query(
            `SELECT t.id, t.title, t.priority, t.due_date, p.name as project_name
             FROM tasks t
             LEFT JOIN projects p ON t.project_id = p.id
             WHERE t.user_id = ? AND t.completed = 0
             AND DATE(t.due_date) = CURDATE()
             ORDER BY t.priority ASC, t.created_at DESC`,
            [user.id]
        );

        let message = "";

        if (tasks.length > 0) {
            message = `☀️ *Chào buổi sáng, ${user.full_name}!*\n\n📅 *Hôm nay bạn có ${tasks.length} task:*\n\n`;

            tasks.forEach((task, index) => {
                const priorityEmoji = getPriorityEmoji(task.priority);
                const project = task.project_name ? ` 📁 ${task.project_name}` : "";
                message += `${index + 1}. ${priorityEmoji} ${escapeMarkdown(task.title)}${project}\n`;
            });

            message += "\nChúc bạn một ngày làm việc hiệu quả! 💪";

            // Update mapping so user can use commands like /done 1
            await storeTaskMapping(user.telegram_id, tasks);
        } else {
            message = `☀️ *Chào buổi sáng, ${user.full_name}!*\n\n🎉 Hôm nay bạn thảnh thơi! Không có task nào cần làm.\n\nChúc bạn một ngày vui vẻ! 😄`;
        }

        bot.sendMessage(user.telegram_id, message, { parse_mode: "Markdown" });

    } catch (error) {
        console.error(`Error sending reminder to user ${user.id}:`, error);
    }
}

export default { initTelegramBot, generateLinkingCode, getBotUsername, getBot };
