
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

import { verifyEmailConnection } from "./utils/email.js";

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: "2mb" }));

// Static uploads
app.use(
  "/uploads",
  express.static(
    path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "../uploads"
    )
  )
);

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    message: "SocialConnect API is running"
  });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/users", userRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/calls", callRoutes);
app.use("/api/fundraisers", fundraiserRoutes);

// Error handling
app.use((err, _req, res, _next) => {
  if (err?.name === "MulterError") {
    return res.status(400).json({
      message:
        err.code === "LIMIT_FILE_SIZE"
          ? "Media must be 50 MB or smaller."
          : err.message
    });
  }

  if (err) {
    return res.status(400).json({
      message: err.message || "Request failed"
    });
  }

  return res.status(500).json({
    message: "Unexpected server error"
  });
});

// Render provides PORT automatically
const PORT = process.env.PORT || 5003;

// Start server
async function startServer() {
  try {
    // Check MongoDB configuration
    if (!process.env.MONGODB_URI) {
      throw new Error(
        "MONGODB_URI is missing. Check Render environment variables."
      );
    }

    // Connect MongoDB
    await mongoose.connect(process.env.MONGODB_URI);

    console.log("MongoDB connected successfully.");

    // Verify Gmail SMTP connection
    console.log("Checking Gmail SMTP connection...");

    const emailReady = await verifyEmailConnection();

    if (emailReady) {
      console.log("Donation email service is ready.");
    } else {
      console.warn(
        "Donation email service is unavailable. Check SMTP settings."
      );
    }

    // Start Express server even if email is unavailable
    app.listen(PORT, "0.0.0.0", () => {
      console.log(
        `SocialConnect API running on port ${PORT}`
      );
    });

  } catch (error) {
    console.error(
      "Server startup failed:",
      error.message
    );

    process.exit(1);
  }
}

startServer();
