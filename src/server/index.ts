import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { ensureDefaults } from "../lib/ensureDefaults.js";
import authRoutes from "./routes/auth.js";
import dashboardRoutes from "./routes/dashboard.js";
import purchasesRoutes from "./routes/purchases.js";
import salesRoutes from "./routes/sales.js";
import targetRoutes from "./routes/target.js";
import pointsRoutes from "./routes/points.js";
import masterItemsRoutes from "./routes/masterItems.js";
import importRoutes from "./routes/imports.js";
import settingsRoutes from "./routes/settings.js";
import categoriesRoutes from "./routes/categories.js";
import outletsRoutes from "./routes/outlets.js";
import employeesRoutes from "./routes/employees.js";
import dataExplorerRoutes from "./routes/dataExplorer.js";
import activityLogRoutes from "./routes/activityLog.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Security & Middlewares
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Initialize defaults on start
ensureDefaults("BANDUNG").catch((err) => {
  console.error("Failed to ensure defaults:", err);
});

// Health check
app.get("/api/health", (req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date(), port: PORT });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/purchases", purchasesRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/target", targetRoutes);
app.use("/api/points", pointsRoutes);
app.use("/api/master-items", masterItemsRoutes);
app.use("/api/imports", importRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/outlets", outletsRoutes);
app.use("/api/employees", employeesRoutes);
app.use("/api/data-explorer", dataExplorerRoutes);
app.use("/api/activity-log", activityLogRoutes);

// Static frontend in production
const distPath = fs.existsSync(path.resolve(process.cwd(), "dist"))
  ? path.resolve(process.cwd(), "dist")
  : path.resolve(__dirname, "../dist");

app.use(express.static(distPath));

app.get("*", (req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith("/api")) {
    return next();
  }
  res.sendFile(path.join(distPath, "index.html"), (err) => {
    if (err) {
      res.status(200).send("API Running on Port " + PORT + ". Frontend build not found.");
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT} (http://localhost:${PORT})`);
});
