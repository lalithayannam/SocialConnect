import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import authRoutes from "./routes/authRoutes.js";
import postRoutes from "./routes/postRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import callRoutes from "./routes/callRoutes.js";
import fundraiserRoutes from "./routes/fundraiserRoutes.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use("/uploads", express.static(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../uploads")));

app.get("/api/health", (req, res) => {
  res.json({ message: "SocialConnect API is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/users", userRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/calls", callRoutes);
app.use("/api/fundraisers", fundraiserRoutes);

app.use((err, _req, res, _next) => {
  if (err?.name === "MulterError") return res.status(400).json({ message: err.code === "LIMIT_FILE_SIZE" ? "Media must be 50 MB or smaller." : err.message });
  if (err) return res.status(400).json({ message: err.message || "Request failed" });
  res.status(500).json({ message: "Unexpected server error" });
});


const PORT = process.env.PORT || 5003;

async function startServer() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing. Check Render environment variables.");
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected");

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`SocialConnect API running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Server startup failed:", err.message);
    process.exit(1);
  }
}

startServer();
