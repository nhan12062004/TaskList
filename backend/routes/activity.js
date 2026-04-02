import express from "express";
import pool from "../db.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

router.get("/", verifyToken, async (req, res) => {
    try {
        const [logs] = await pool.query(
            `SELECT al.*, p.name as project_name, u.full_name, u.avatar_url 
       FROM activity_logs al
       LEFT JOIN tasks t ON al.task_id = t.id
       LEFT JOIN projects p ON t.project_id = p.id
       LEFT JOIN users u ON al.user_id = u.id
       WHERE al.user_id = ?
       ORDER BY al.created_at DESC
       LIMIT 100`,
            [req.userId]
        );

        res.json(logs);
    } catch (error) {
        console.error("Get activity error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
