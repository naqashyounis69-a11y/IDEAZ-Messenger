const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { protect } = require("../middleware/auth.middleware");

const router = express.Router();
const uploadDirectory = path.join(__dirname, "..", "..", "uploads", "messages");
fs.mkdirSync(uploadDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, uploadDirectory),
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).slice(0, 12).toLowerCase();
    callback(null, `${Date.now()}-${crypto.randomUUID()}${extension}`);
  },
});

const allowedTypes = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "video/mp4", "video/webm",
  "audio/webm", "audio/ogg", "audio/mpeg", "audio/mp4", "audio/wav",
  "application/pdf", "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip",
  "application/x-zip-compressed", "application/x-rar-compressed",
  "application/vnd.rar", "application/x-7z-compressed",
  "application/octet-stream",
]);

const maximumUploadSize = Math.min(
  Number(process.env.MAX_UPLOAD_SIZE || 100 * 1024 * 1024),
  1024 * 1024 * 1024
);

const upload = multer({
  storage,
  limits: { fileSize: maximumUploadSize },
  fileFilter: (_req, file, callback) => {
    if (!allowedTypes.has(file.mimetype)) {
      return callback(new Error("Yeh file type allowed nahi hai."));
    }
    callback(null, true);
  },
});

router.post("/", protect, upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "File required hai." });
  }

  return res.status(201).json({
    success: true,
    message: "File upload ho gayi.",
    data: {
      file: `/uploads/messages/${req.file.filename}`,
      fileType: req.file.mimetype,
      fileName: req.file.originalname,
      fileSize: req.file.size,
    },
  });
});

module.exports = router;
