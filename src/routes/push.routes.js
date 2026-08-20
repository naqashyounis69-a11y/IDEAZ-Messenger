const express = require("express");
const { protect } = require("../middleware/auth.middleware");
const push = require("../services/push.service");
const router = express.Router();
router.use(protect);
router.get("/public-key", async (_req, res, next) => { try { res.json({ success: true, data: { publicKey: await push.getPublicKey() } }); } catch (e) { next(e); } });
router.post("/subscribe", async (req, res, next) => { try { await push.subscribe(req.user.id, req.body.subscription); res.status(201).json({ success: true, message: "Background notifications active hain." }); } catch (e) { next(e); } });
router.delete("/subscribe", async (req, res, next) => { try { await push.unsubscribe(req.user.id, req.body.endpoint); res.json({ success: true }); } catch (e) { next(e); } });
module.exports = router;
