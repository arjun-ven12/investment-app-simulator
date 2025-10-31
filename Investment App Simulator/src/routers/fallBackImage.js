// ============================================================
// routes/fallbackImage.js — Serve all images once (Shared Pool)
// ============================================================
const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

router.get("/all", async (req, res) => {
  try {
    const images = await prisma.fallbackImage.findMany({
      orderBy: { id: "asc" },
      select: { id: true, url: true, category: true },
    });

    if (!images || images.length === 0) {
      console.warn("[FallbackImage] No DB images found — using Unsplash fallback pack.");
      return res.json({
        success: true,
        images: [
          { url: "https://images.unsplash.com/photo-1559526324-593bc073d938?auto=format&fit=crop&w=1200&q=80" },
          { url: "https://images.unsplash.com/photo-1535223289827-42f1e9919769?auto=format&fit=crop&w=1200&q=80" },
          { url: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1200&q=80" },
          { url: "https://images.unsplash.com/photo-1531297484001-80022131f5a1?auto=format&fit=crop&w=1200&q=80" },
        ],
      });
    }

    return res.json({ success: true, images });
  } catch (err) {
    console.error("[FallbackImage DB Error]:", err.message);
    return res.status(500).json({
      success: false,
      message: "Server error fetching fallback images",
    });
  }
});

module.exports = router;
