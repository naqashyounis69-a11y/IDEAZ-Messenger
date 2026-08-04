const express = require("express");

const userController = require(
  "../controllers/user.controller"
);

const {
  protect,
} = require(
  "../middleware/auth.middleware"
);

const router = express.Router();

/*
  Sare user routes protected hain.
  Valid Bearer token required hoga.
*/
router.use(protect);

/*
  GET /api/users
  Doosre tamam users ki limited list.
*/
router.get(
  "/",
  userController.getAllUsers
);

/*
  GET /api/users/search?q=ahmed
  Username ya full name se users search karega.
*/
router.get(
  "/search",
  userController.searchUsers
);

/*
  PATCH /api/users/presence
  Body:
  {
    "online": true
  }
*/
router.patch(
  "/presence",
  userController.updatePresence
);

/*
  GET /api/users/:userId
  Kisi specific user ki public profile.
*/
router.get(
  "/:userId",
  userController.getUserById
);

module.exports = router;