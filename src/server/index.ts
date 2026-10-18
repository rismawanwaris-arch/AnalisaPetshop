import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { ensureDefaults } from "../lib/ensureDefaults.js";
import { requireAuth } from "./middleware.js";
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
app.set("trust proxy", 1);
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

// API Routes (Public: /api/auth, /api/points; Semi-public: /api/imports/periods)
app.use("/api/auth", authRoutes);
app.use("/api/points", pointsRoutes);
app.use("/api/imports", importRoutes);

// Protected API Routes
app.use("/api/dashboard", requireAuth, dashboardRoutes);
app.use("/api/purchases", requireAuth, purchasesRoutes);
app.use("/api/sales", requireAuth, salesRoutes);
app.use("/api/target", requireAuth, targetRoutes);
app.use("/api/master-items", requireAuth, masterItemsRoutes);
app.use("/api/settings", requireAuth, settingsRoutes);
app.use("/api/categories", requireAuth, categoriesRoutes);
app.use("/api/outlets", requireAuth, outletsRoutes);
app.use("/api/employees", requireAuth, employeesRoutes);
app.use("/api/data-explorer", requireAuth, dataExplorerRoutes);
app.use("/api/activity-log", requireAuth, activityLogRoutes);

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
