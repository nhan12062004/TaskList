import express from "express";
import pool from "../db.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

// Get all filters for a user
router.get("/", verifyToken, async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT * FROM filters WHERE user_id = ? ORDER BY id ASC",
            [req.userId]
        );
        res.json(rows);
    } catch (error) {
        console.error("Error fetching filters:", error);
        res.status(500).json({ error: "Server error" });
    }
});

// Create a new filter
router.post("/", verifyToken, async (req, res) => {
    const { name, color, query, is_favorite } = req.body;

    if (!name || !query) {
        return res.status(400).json({ error: "Name and query are required" });
    }

    try {
        const [result] = await pool.query(
            "INSERT INTO filters (user_id, name, color, query, is_favorite) VALUES (?, ?, ?, ?, ?)",
            [req.userId, name, color || "charcoal", query, is_favorite ? 1 : 0]
        );

        res.status(201).json({
            id: result.insertId,
            name,
            color,
            query,
            is_favorite: !!is_favorite
        });
    } catch (error) {
        console.error("Error creating filter:", error);
        res.status(500).json({ error: "Server error" });
    }
});

// Update a filter
router.put("/:id", verifyToken, async (req, res) => {
    const { name, color, query, is_favorite } = req.body;
    const { id } = req.params;

    try {
        await pool.query(
            "UPDATE filters SET name = ?, color = ?, query = ?, is_favorite = ? WHERE id = ? AND user_id = ?",
            [name, color, query, is_favorite ? 1 : 0, id, req.userId]
        );
        res.json({ message: "Filter updated successfully" });
    } catch (error) {
        console.error("Error updating filter:", error);
        res.status(500).json({ error: "Server error" });
    }
});

// Delete a filter
router.delete("/:id", verifyToken, async (req, res) => {
    const { id } = req.params;

    try {
        await pool.query(
            "DELETE FROM filters WHERE id = ? AND user_id = ?",
            [id, req.userId]
        );
        res.json({ message: "Filter deleted successfully" });
    } catch (error) {
        console.error("Error deleting filter:", error);
        res.status(500).json({ error: "Server error" });
    }
});

export default router;
