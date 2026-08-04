const express = require("express");

const authController = require("../controllers/auth.controller");
const {
  protect,
} = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/", function authApiStatus(req, res) {
  return res.status(200).json({
    success: true,
    message: "IDEAZ Messenger Auth API running hai.",
    endpoints: {
      register: "POST /api/auth/register",
      login: "POST /api/auth/login",
      pinLogin: "POST /api/auth/pin-login",
      profile: "GET /api/auth/profile",
      logout: "POST /api/auth/logout",
      checkUsername:
        "GET /api/auth/check-username/:username",
    },
  });
});

router.post(
  "/register",
  authController.register
);

router.post(
  "/login",
  authController.login
);

router.post(
  "/pin-login",
  authController.pinLogin
);

router.get(
  "/check-username/:username",
  authController.checkUsername
);

router.get(
  "/profile",
  protect,
  authController.profile
);

router.post(
  "/logout",
  protect,
  authController.logout
);

module.exports = router;