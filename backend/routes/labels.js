import express from "express";
import pool from "../db.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();
router.get("/", verifyToken, async (req, res) => {
    try {

        const [rows] = await pool.query(
            "SELECT * FROM labels WHERE user_id = ? ORDER BY name ASC",
            [req.userId]
        );
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
});

router.post("/", verifyToken, async (req, res) => {
    const { name, color, is_favorite } = req.body;
    console.log("Creating label:", name, "for user:", req.userId);
    if (!name) return res.status(400).json({ error: "Name is required" });

    try {
        const [result] = await pool.query(
            "INSERT INTO labels (user_id, name, color, is_favorite) VALUES (?, ?, ?, ?)",
            [req.userId, name, color || "charcoal", is_favorite ? 1 : 0]
        );
        console.log("Label created, ID:", result.insertId);
        res.status(201).json({
            id: result.insertId,
            name,
            color: color || "charcoal",
            is_favorite: !!is_favorite
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            const [rows] = await pool.query(
                "SELECT * FROM labels WHERE user_id = ? AND name = ?",
                [req.userId, name]
            );
            if (rows.length > 0) {
                console.log("Label already exists, returning existing:", rows[0].id);
                return res.status(200).json(rows[0]);
            }
        }
        console.error("Database error creating label:", error);
        res.status(500).json({ error: "Server error" });
    }
});

export default router;
