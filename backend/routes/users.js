import express from "express";
import pool from "../db.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

const updateMe = async (req, res) => {
  try {
    const { name, avatarUrl } = req.body;

    if (!name && !avatarUrl) {
      return res.status(400).json({ error: "No updates provided" });
    }

    const fields = [];
    const values = [];

    if (name) {
      fields.push("full_name = ?");
      values.push(name);
    }

    if (avatarUrl !== undefined) {
      fields.push("avatar_url = ?");
      values.push(avatarUrl);
    }

    values.push(req.userId);

    await pool.query(
      `UPDATE users SET ${fields.join(", ")} WHERE id = ?`,
      values
    );

    const [rows] = await pool.query(
      "SELECT id, email, full_name, avatar_url FROM users WHERE id = ?",
      [req.userId]
    );

    const user = rows[0];
    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.full_name,
        avatarUrl: user.avatar_url,
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

router.patch("/me", verifyToken, updateMe);

export default router;
