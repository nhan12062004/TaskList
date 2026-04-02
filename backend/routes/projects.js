import express from "express";
import pool from "../db.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

router.get("/inbox", verifyToken, async (req, res) => {
  try {
    let [rows] = await pool.query(
      `SELECT id, name, color, is_inbox, is_archived
       FROM projects
       WHERE user_id = ? AND is_inbox = 1
       LIMIT 1`,
      [req.userId]
    );

    if (rows.length === 0) {
      const [result] = await pool.query(
        `INSERT INTO projects (user_id, name, color, is_inbox, is_archived)
         VALUES (?, 'Inbox', '#246fe0', 1, 0)`,
        [req.userId]
      );

      rows = [{
        id: result.insertId,
        name: 'Inbox',
        color: '#246fe0',
        is_inbox: 1,
        is_archived: 0
      }];
    }

    const inbox = rows[0];
    res.json({
      id: inbox.id,
      name: inbox.name,
      color: inbox.color,
      isInbox: true,
      isArchived: !!inbox.is_archived,
    });
  } catch (error) {
    console.error("Get inbox project error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/", verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, color, is_inbox, is_archived
       FROM projects
       WHERE user_id = ? AND is_archived = 0 AND is_inbox = 0
       ORDER BY created_at ASC`,
      [req.userId]
    );

    const projects = rows.map((row) => ({
      id: row.id,
      name: row.name,
      color: row.color,
      isInbox: !!row.is_inbox,
      isArchived: !!row.is_archived,
    }));

    res.json({ projects });
  } catch (error) {
    console.error("Get projects error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", verifyToken, async (req, res) => {
  const { name } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Project name is required" });
  }

  try {
    const defaultColor = "#808080";

    const [result] = await pool.query(
      `INSERT INTO projects (user_id, name, color, is_inbox, is_archived)
       VALUES (?, ?, ?, 0, 0)`,
      [req.userId, name.trim(), defaultColor]
    );

    const newProject = {
      id: result.insertId,
      name: name.trim(),
      color: defaultColor,
      isInbox: false,
      isArchived: false,
    };

    res.status(201).json(newProject);
  } catch (error) {
    console.error("Create project error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
