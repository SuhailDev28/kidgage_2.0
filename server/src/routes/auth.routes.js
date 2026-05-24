import { Router } from "express";
import { auth } from "../middleware/auth.js";
import {
  forgotPassword,
  login,
  me,
  registerParent,
  resetPassword,
} from "../controllers/auth.controller.js";

const router = Router();

router.post("/register-parent", registerParent);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/login", login);
router.get("/me", auth, me);

export default router;
