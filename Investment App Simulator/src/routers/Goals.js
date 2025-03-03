const express = require("express");
const router = express.Router();
const prisma = require("../../prisma/prismaClient");

// ✅ Get all goals for a specific user
router.get("/", async (req, res) => {
    try {
        const { userId } = req.query;

        if (!userId) {
            return res.status(400).json({ error: "⚠ User ID is required" });
        }

        const goals = await prisma.goal.findMany({
            where: { userId: parseInt(userId) },
        });

        res.json(goals);
    } catch (error) {
        console.error("❌ Error fetching user goals:", error);
        res.status(500).json({ error: "⚠ Internal server error" });
    }
});

// ✅ Get goal by ID
router.get("/:id", async (req, res) => {
    try {
        const goalId = parseInt(req.params.id);
        if (isNaN(goalId)) {
            return res.status(400).json({ error: "⚠ Invalid goal ID" });
        }

        const goal = await prisma.goal.findUnique({ where: { id: goalId } });

        if (!goal) {
            return res.status(404).json({ error: "⚠ Goal not found" });
        }

        res.json(goal);
    } catch (error) {
        console.error("❌ Error fetching goal:", error);
        res.status(500).json({ error: "⚠ Internal server error" });
    }
});

// ✅ Create a new goal (with frontend validation messages)
router.post("/", async (req, res) => {
    try {
        const { title, amount, description, deadline, userId } = req.body;

        // 🛑 Validate required fields
        if (!title || title.trim() === "") {
            return res.status(400).json({ error: "⚠ Title is required" });
        }
        if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
            return res.status(400).json({ error: "⚠ Amount must be a positive number" });
        }
        if (!deadline || isNaN(Date.parse(deadline))) {
            return res.status(400).json({ error: "⚠ Valid deadline date is required" });
        }
        if (!userId || isNaN(parseInt(userId))) {
            return res.status(400).json({ error: "⚠ Valid userId is required" });
        }

        const newGoal = await prisma.goal.create({
            data: {
                title: title.trim(),
                amount: parseFloat(amount),
                description: description ? description.trim() : null,
                deadline: new Date(deadline),
                userId: parseInt(userId),
            },
        });

        res.status(201).json(newGoal);
    } catch (error) {
        console.error("❌ Error creating goal:", error);
        res.status(500).json({ error: "⚠ Failed to create goal" });
    }
});

// ✅ Update a goal
router.put("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { title, amount, description, deadline } = req.body;

        // 🛑 Validate input
        if (title && title.trim() === "") {
            return res.status(400).json({ error: "⚠ Title cannot be empty" });
        }
        if (amount && (isNaN(amount) || parseFloat(amount) <= 0)) {
            return res.status(400).json({ error: "⚠ Amount must be a positive number" });
        }
        if (deadline && isNaN(Date.parse(deadline))) {
            return res.status(400).json({ error: "⚠ Valid deadline date is required" });
        }

        // 🛑 Check if goal exists before updating
        const existingGoal = await prisma.goal.findUnique({ where: { id: parseInt(id) } });
        if (!existingGoal) {
            return res.status(404).json({ error: "⚠ Goal not found" });
        }

        const updatedGoal = await prisma.goal.update({
            where: { id: parseInt(id) },
            data: {
                title: title ? title.trim() : existingGoal.title,
                amount: amount ? parseFloat(amount) : existingGoal.amount,
                description: description ? description.trim() : existingGoal.description,
                deadline: deadline ? new Date(deadline) : existingGoal.deadline,
            },
        });

        res.json(updatedGoal);
    } catch (error) {
        console.error("❌ Error updating goal:", error);
        res.status(500).json({ error: "⚠ Failed to update goal" });
    }
});

// ✅ Delete a goal
router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        // 🛑 Validate goal ID
        if (!id || isNaN(parseInt(id))) {
            return res.status(400).json({ error: "⚠ Invalid goal ID" });
        }

        // 🛑 Check if goal exists before deleting
        const existingGoal = await prisma.goal.findUnique({ where: { id: parseInt(id) } });
        if (!existingGoal) {
            return res.status(404).json({ error: "⚠ Goal not found" });
        }

        await prisma.goal.delete({ where: { id: parseInt(id) } });

        res.json({ message: "✅ Goal deleted successfully" });
    } catch (error) {
        console.error("❌ Error deleting goal:", error);
        res.status(500).json({ error: "⚠ Failed to delete goal" });
    }
});

module.exports = router;
