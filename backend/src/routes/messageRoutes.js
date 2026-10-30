import { Router } from "express";
import auth from "../middleware/auth.js";
import { conversations, thread, sendMessage } from "../controllers/messageController.js";
const router = Router();
router.use(auth);
router.get("/conversations", conversations);
router.get("/:userId", thread);
router.post("/:userId", sendMessage);
export default router;
