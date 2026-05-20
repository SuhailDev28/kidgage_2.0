import express from "express";
import {
  googleLogin,
  appleLogin,
} from "../controllers/socialAuth.controller.js";

const router = express.Router();

router.post("/google", googleLogin);
router.post("/apple", appleLogin);

export default router;
