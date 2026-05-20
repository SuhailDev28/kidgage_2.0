import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { login, me, registerParent } from "../controllers/auth.controller.js";

const router = Router();
router.post("/register-parent", registerParent);
router.post("/login", login);
router.get("/me", auth, me);
export default router;
