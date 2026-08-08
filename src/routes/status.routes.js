const express = require("express");
const prisma = require("../config/prisma");
const { protect } = require("../middleware/auth.middleware");

const router = express.Router();
router.use(protect);

router.get("/", async (req, res, next) => {
  try {
    const statuses = await prisma.status.findMany({
      where: { expiresAt: { gt: new Date() } },
      include: {
        author: { select: { id: true, username: true, fullName: true, avatar: true } },
        views: { where: { viewerId: req.user.id }, select: { id: true } },
        _count: { select: { views: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, data: { statuses: statuses.map((status) => ({ ...status, viewed: status.views.length > 0, views: undefined })) } });
  } catch (error) { next(error); }
});

router.post("/", async (req, res, next) => {
  try {
    const text = String(req.body.text || "").trim();
    const media = req.body.media ? String(req.body.media) : null;
    const mediaType = req.body.mediaType ? String(req.body.mediaType) : null;
    const color = /^#[0-9a-f]{6}$/i.test(req.body.color || "") ? req.body.color : "#4f46e5";
    if (!text && !media) return res.status(400).json({ success: false, message: "Status text ya image required hai." });
    if (text.length > 700) return res.status(400).json({ success: false, message: "Status maximum 700 characters ho sakta hai." });
    if (media && !String(mediaType).startsWith("image/")) return res.status(400).json({ success: false, message: "Status mein filhal sirf image allowed hai." });
    const status = await prisma.status.create({
      data: { authorId: req.user.id, text: text || null, media, mediaType, color, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
      include: { author: { select: { id: true, username: true, fullName: true, avatar: true } } },
    });
    res.status(201).json({ success: true, message: "Status 24 hours ke liye post ho gaya.", data: { status } });
  } catch (error) { next(error); }
});

router.patch("/:statusId/view", async (req, res, next) => {
  try {
    const status = await prisma.status.findFirst({ where: { id: req.params.statusId, expiresAt: { gt: new Date() } } });
    if (!status) return res.status(404).json({ success: false, message: "Status expire ho chuka hai." });
    if (status.authorId !== req.user.id) await prisma.statusView.upsert({
      where: { statusId_viewerId: { statusId: status.id, viewerId: req.user.id } },
      update: { viewedAt: new Date() }, data: { statusId: status.id, viewerId: req.user.id },
    });
    res.json({ success: true });
  } catch (error) { next(error); }
});

router.delete("/:statusId", async (req, res, next) => {
  try {
    const result = await prisma.status.deleteMany({ where: { id: req.params.statusId, authorId: req.user.id } });
    if (!result.count) return res.status(404).json({ success: false, message: "Status nahi mila." });
    res.json({ success: true, message: "Status delete ho gaya." });
  } catch (error) { next(error); }
});

module.exports = router;
