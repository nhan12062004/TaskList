import express from "express";
import pool from "../db.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

router.post("/", verifyToken, async (req, res) => {
  const { content, description, priority, due_date, project_id, labels, section_id } = req.body;

  if (!content) {
    return res.status(400).json({ error: "Content is required" });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    let finalProjectId = project_id;

    if (!finalProjectId) {
      const [inboxResults] = await connection.query(
        `SELECT id FROM projects WHERE user_id = ? AND is_inbox = 1 LIMIT 1`,
        [req.userId]
      );
      if (inboxResults.length > 0) {
        finalProjectId = inboxResults[0].id;
      }
    }

    const [result] = await connection.query(
      `INSERT INTO tasks (user_id, project_id, section_id, title, description, priority, due_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.userId, finalProjectId || null, section_id || null, content, description || "", priority || 4, due_date || null]
    );

    const taskId = result.insertId;

    if (labels && Array.isArray(labels) && labels.length > 0) {
      const placeholders = labels.map(() => '?').join(',');
      const [existingLabels] = await connection.query(
        `SELECT id, name FROM labels WHERE user_id = ? AND name IN (${placeholders})`,
        [req.userId, ...labels]
      );

      const labelMap = {};
      existingLabels.forEach(l => labelMap[l.name] = l.id);

      const taskLabelValues = [];
      for (const labelName of labels) {
        if (labelMap[labelName]) {
          taskLabelValues.push([taskId, labelMap[labelName]]);
        }
      }

      if (taskLabelValues.length > 0) {
        await connection.query(
          `INSERT INTO task_labels (task_id, label_id) VALUES ?`,
          [taskLabelValues]
        );
      }
    }

    await connection.commit();

    // Log activity
    await pool.query(
      `INSERT INTO activity_logs (user_id, task_id, action_type, details) VALUES (?, ?, 'create_task', ?)`,
      [req.userId, taskId, JSON.stringify({ title: content })]
    );

    res.status(201).json({
      id: taskId,
      content,
      description,
      priority,
      due_date,
      project_id,
      labels
    });

  } catch (error) {
    await connection.rollback();
    console.error("Create task error:", error);
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

router.get("/", verifyToken, async (req, res) => {
  try {
    const { inbox, project_id } = req.query;

    let whereClause = "t.user_id = ? AND t.completed = 0";
    let joinClause = "";
    const params = [req.userId];


    if (inbox === "true") {
      joinClause = "INNER JOIN projects p ON t.project_id = p.id AND p.is_inbox = 1";
    } else {
      joinClause = "LEFT JOIN projects p ON t.project_id = p.id";
      if (project_id) {
        whereClause += " AND t.project_id = ?";
        params.push(project_id);
      }
    }

    const [tasks] = await pool.query(
      `SELECT t.id, t.title, t.description, t.priority, t.due_date, t.project_id, p.name as project_name, p.is_inbox as project_is_inbox, t.section_id, t.created_at,
              COALESCE(
                JSON_ARRAYAGG(
                  CASE WHEN l.id IS NOT NULL THEN JSON_OBJECT('id', l.id, 'name', l.name, 'color', l.color) ELSE NULL END
                ),
                JSON_ARRAY()
              ) as labels
       FROM tasks t
       ${joinClause}
       LEFT JOIN task_labels tl ON t.id = tl.task_id
       LEFT JOIN labels l ON tl.label_id = l.id
       WHERE ${whereClause}
       GROUP BY t.id
       ORDER BY t.section_id ASC, t.sort_order ASC, t.created_at DESC`,
      params
    );

    const cleanedTasks = tasks.map(task => ({
      ...task,
      labels: task.labels ? task.labels.filter(l => l !== null) : []
    }));



    res.json(cleanedTasks);
  } catch (error) {
    console.error("Get tasks error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/summary", verifyToken, async (req, res) => {
  try {
    const [inboxRows] = await pool.query(
      `SELECT COUNT(*) AS count
       FROM tasks t
       INNER JOIN projects p ON t.project_id = p.id AND p.is_inbox = 1
       WHERE t.user_id = ?
         AND t.completed = 0`,
      [req.userId]
    );

    const [todayRows] = await pool.query(
      `SELECT COUNT(*) AS count
       FROM tasks
       WHERE user_id = ?
         AND completed = 0
         AND due_date IS NOT NULL
         AND DATE(due_date) = CURDATE()`,
      [req.userId]
    );

    res.json({
      inbox: inboxRows[0]?.count ?? 0,
      today: todayRows[0]?.count ?? 0,
    });
  } catch (error) {
    console.error("Get task summary error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/reorder", verifyToken, async (req, res) => {
  const { taskIds } = req.body;

  if (!taskIds || !Array.isArray(taskIds)) {
    return res.status(400).json({ error: "taskIds array is required" });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    for (let i = 0; i < taskIds.length; i++) {
      await connection.query(
        `UPDATE tasks SET sort_order = ? WHERE id = ? AND user_id = ?`,
        [i, taskIds[i], req.userId]
      );
    }

    await connection.commit();
    res.json({ success: true });
  } catch (error) {
    await connection.rollback();
    console.error("Reorder tasks error:", error);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    connection.release();
  }
});

router.get("/:taskId/comments", verifyToken, async (req, res) => {
  try {
    const { taskId } = req.params;
    const [comments] = await pool.query(
      `SELECT tc.*, u.full_name as user_name, u.avatar_url as user_avatar_url 
       FROM task_comments tc
       JOIN users u ON tc.user_id = u.id
       WHERE tc.task_id = ?
       ORDER BY tc.created_at ASC`,
      [taskId]
    );
    res.json(comments);
  } catch (error) {
    console.error("Get comments error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:taskId/comments", verifyToken, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: "Comment content is required" });
    }

    await pool.query(
      "INSERT INTO task_comments (task_id, user_id, content) VALUES (?, ?, ?)",
      [taskId, req.userId, content]
    );

    // Log activity
    await pool.query(
      `INSERT INTO activity_logs (user_id, task_id, action_type, details) VALUES (?, ?, 'add_comment', ?)`,
      [req.userId, taskId, JSON.stringify({ content })]
    );

    res.status(201).json({ success: true });
  } catch (error) {
    console.error("Add comment error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});


router.post("/:id/close", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch task title for logging
    const [tasks] = await pool.query("SELECT title FROM tasks WHERE id = ?", [id]);
    const taskTitle = tasks.length > 0 ? tasks[0].title : "Unknown task";

    await pool.query(
      "UPDATE tasks SET completed = 1 WHERE id = ? AND user_id = ?",
      [id, req.userId]
    );

    // Log activity
    await pool.query(
      `INSERT INTO activity_logs (user_id, task_id, action_type, details) VALUES (?, ?, 'complete_task', ?)`,
      [req.userId, id, JSON.stringify({ title: taskTitle })]
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Close task error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:id/reopen", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(
      "UPDATE tasks SET completed = 0 WHERE id = ? AND user_id = ?",
      [id, req.userId]
    );

    // Fetch task title for logging
    const [tasks] = await pool.query("SELECT title FROM tasks WHERE id = ?", [id]);
    const taskTitle = tasks.length > 0 ? tasks[0].title : "Unknown task";

    // Log activity
    await pool.query(
      `INSERT INTO activity_logs (user_id, task_id, action_type, details) VALUES (?, ?, 'reopen_task', ?)`,
      [req.userId, id, JSON.stringify({ title: taskTitle })]
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Reopen task error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, priority, due_date, project_id, section_id, labels } = req.body;

    let updates = [];
    let params = [];

    if (title !== undefined) {
      updates.push("title = ?");
      params.push(title);
    }
    if (description !== undefined) {
      updates.push("description = ?");
      params.push(description);
    }
    if (priority !== undefined) {
      updates.push("priority = ?");
      params.push(priority);
    }
    if (due_date !== undefined) {
      updates.push("due_date = ?");
      params.push(due_date);
    }
    if (project_id !== undefined) {
      updates.push("project_id = ?");
      params.push(project_id);
    }
    if (section_id !== undefined) {
      updates.push("section_id = ?");
      params.push(section_id);
    }

    if (updates.length > 0) {
      // Fetch current task state for delta logging
      const [oldTasks] = await pool.query("SELECT title, due_date FROM tasks WHERE id = ?", [id]);
      const oldTask = oldTasks[0];

      params.push(id);
      params.push(req.userId);
      await pool.query(
        `UPDATE tasks SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`,
        params
      );

      // Log date change activity if applicable
      if (due_date !== undefined && due_date !== oldTask.due_date) {
        await pool.query(
          `INSERT INTO activity_logs (user_id, task_id, action_type, details) VALUES (?, ?, 'change_date', ?)`,
          [req.userId, id, JSON.stringify({
            title: title || oldTask.title,
            old_date: oldTask.due_date,
            new_date: due_date
          })]
        );
      } else {
        // Generic update log
        await pool.query(
          `INSERT INTO activity_logs (user_id, task_id, action_type, details) VALUES (?, ?, 'update_task', ?)`,
          [req.userId, id, JSON.stringify({ title: title || oldTask.title })]
        );
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Update task error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
