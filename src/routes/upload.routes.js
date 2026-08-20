const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { protect } = require("../middleware/auth.middleware");

const router = express.Router();
const uploadDirectory = path.join(__dirname, "..", "..", "uploads", "messages");
const chunkDirectory = path.join(__dirname, "..", "..", "uploads", "chunks");
fs.mkdirSync(uploadDirectory, { recursive: true });
fs.mkdirSync(chunkDirectory, { recursive: true });

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

router.post("/chunk", protect, express.raw({ type: "application/octet-stream", limit: "2mb" }), (req, res, next) => {
  try {
    const uploadId = String(req.headers["x-upload-id"] || "").replace(/[^a-zA-Z0-9-]/g, "");
    const index = Number(req.headers["x-chunk-index"]);
    const total = Number(req.headers["x-chunk-total"]);
    const originalName = path.basename(decodeURIComponent(String(req.headers["x-file-name"] || "file.bin")));
    const fileType = decodeURIComponent(String(req.headers["x-file-type"] || "application/octet-stream"));
    if (!uploadId || !Number.isInteger(index) || !Number.isInteger(total) || index < 0 || index >= total || total > 1024) {
      return res.status(400).json({ success: false, message: "Upload chunk details invalid hain." });
    }
    const userUpload = path.join(chunkDirectory, `${req.user.id}-${uploadId}`);
    fs.mkdirSync(userUpload, { recursive: true });
    fs.writeFileSync(path.join(userUpload, `${index}.part`), req.body);
    const received = fs.readdirSync(userUpload).filter((name) => /^\d+\.part$/.test(name)).length;
    if (received < total) return res.json({ success: true, data: { complete: false, received, total } });

    const extension = path.extname(originalName).slice(0, 12).toLowerCase();
    const finalName = `${Date.now()}-${crypto.randomUUID()}${extension}`;
    const finalPath = path.join(uploadDirectory, finalName);
    let fileSize = 0;
    const output = fs.openSync(finalPath, "w");
    try {
      for (let part = 0; part < total; part += 1) {
        const bytes = fs.readFileSync(path.join(userUpload, `${part}.part`));
        fileSize += bytes.length;
        if (fileSize > maximumUploadSize) throw new Error("File maximum upload size se bari hai.");
        fs.writeSync(output, bytes);
      }
    } catch (error) {
      fs.closeSync(output);
      fs.rmSync(finalPath, { force: true });
      throw error;
    }
    fs.closeSync(output);
    fs.rmSync(userUpload, { recursive: true, force: true });
    return res.status(201).json({ success: true, message: "File upload ho gayi.", data: {
      complete: true, file: `/uploads/messages/${finalName}`, fileType, fileName: originalName, fileSize,
    } });
  } catch (error) { return next(error); }
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
