import express from "express";
import pool from "../db.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

router.get("/", verifyToken, async (req, res) => {
    try {
        const { project_id } = req.query;

        let query = `SELECT * FROM sections WHERE user_id = ?`;
        const params = [req.userId];

        if (project_id) {
            query += ` AND project_id = ?`;
            params.push(project_id);
        }

        query += ` ORDER BY sort_order ASC, created_at ASC`;

        const [sections] = await pool.query(query, params);
        res.json(sections);
    } catch (error) {
        console.error("Get sections error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.post("/", verifyToken, async (req, res) => {
    try {
        const { name, project_id } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ error: "Section name is required" });
        }

        // Get max sort_order for this project
        const [maxOrder] = await pool.query(
            `SELECT MAX(sort_order) as max_order FROM sections WHERE user_id = ? AND project_id ${project_id ? '= ?' : 'IS NULL'}`,
            project_id ? [req.userId, project_id] : [req.userId]
        );

        const newOrder = (maxOrder[0]?.max_order || 0) + 1;

        const [result] = await pool.query(
            `INSERT INTO sections (user_id, project_id, name, sort_order) VALUES (?, ?, ?, ?)`,
            [req.userId, project_id || null, name.trim(), newOrder]
        );

        res.status(201).json({
            id: result.insertId,
            user_id: req.userId,
            project_id: project_id || null,
            name: name.trim(),
            sort_order: newOrder
        });
    } catch (error) {
        console.error("Create section error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.put("/:id", verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ error: "Section name is required" });
        }

        await pool.query(
            `UPDATE sections SET name = ? WHERE id = ? AND user_id = ?`,
            [name.trim(), id, req.userId]
        );

        res.json({ success: true });
    } catch (error) {
        console.error("Update section error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.delete("/:id", verifyToken, async (req, res) => {
    try {
        const { id } = req.params;

        await pool.query(
            `DELETE FROM sections WHERE id = ? AND user_id = ?`,
            [id, req.userId]
        );

        res.json({ success: true });
    } catch (error) {
        console.error("Delete section error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.put("/reorder", verifyToken, async (req, res) => {
    try {
        const { sectionIds } = req.body;

        if (!sectionIds || !Array.isArray(sectionIds)) {
            return res.status(400).json({ error: "sectionIds array is required" });
        }

        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            for (let i = 0; i < sectionIds.length; i++) {
                await connection.query(
                    `UPDATE sections SET sort_order = ? WHERE id = ? AND user_id = ?`,
                    [i, sectionIds[i], req.userId]
                );
            }

            await connection.commit();
            res.json({ success: true });
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error("Reorder sections error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
