import "dotenv/config";
import path from "path";
import express from "express";
import { app } from "./app.js";
import { connectDB } from "./config/db.js";

const port = Number(process.env.PORT) || 5001;

/* ---------------------------------
 * Static uploads
 * -------------------------------- */
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

async function start() {
  try {
    console.log("Starting KidGage server...");

    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is required");
    }

    await connectDB();
    console.log("MongoDB connected");

    app.listen(port, () => {
      console.log(`KidGage server running on port ${port}`);
    });
  } catch (error) {
    console.error("Server failed to start:", error);
    process.exit(1);
  }
}

start();
