import { Router, Request, Response } from "express";
import { randomBytes } from "crypto";
import { prisma } from "../../lib/prisma.js";
import { hashPassword, verifyPassword, hashString } from "../../lib/password.js";
import { requireAuth } from "../middleware.js";

const router = Router();

// POST /api/auth/login
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username dan password wajib diisi" });
    }

    const trimmedUsername = String(username).trim();
    let user = await prisma.user.findUnique({
      where: { username: trimmedUsername },
      include: { customRole: true },
    });

    const masterEnvPass = process.env.MASTER_PASSWORD || "admin";
    const adminEnvPass = process.env.ADMIN_PASSWORD || "admin";

    let isValid = false;

    // 1. Check database user password if user exists & active
    if (user && user.isActive) {
      isValid = verifyPassword(password, user.passwordHash);
    }

    // 2. Break-glass fallback from .env
    if (!isValid) {
      if (trimmedUsername === "master" && password === masterEnvPass) {
        user = await prisma.user.upsert({
          where: { username: "master" },
          update: { role: "master", isActive: true, passwordHash: hashPassword(masterEnvPass) },
          create: {
            username: "master",
            displayName: "Master Admin",
            role: "master",
            passwordHash: hashPassword(masterEnvPass),
            isActive: true,
          },
          include: { customRole: true },
        });
        isValid = true;
      } else if (trimmedUsername === "admin" && password === adminEnvPass) {
        user = await prisma.user.upsert({
          where: { username: "admin" },
          update: { isActive: true },
          create: {
            username: "admin",
            displayName: "Staff Admin",
            role: "admin",
            passwordHash: hashPassword(adminEnvPass),
            isActive: true,
          },
          include: { customRole: true },
        });
        isValid = true;
      }
    }

    if (!isValid || !user || !user.isActive) {
      return res.status(401).json({ error: "Username atau password salah" });
    }

    // Update lastLoginAt
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate secure session token
    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = hashString(rawToken);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await prisma.session.create({
      data: {
        tokenHash,
        userId: user.id,
        username: user.username,
        role: user.role,
        ip: (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || null,
        userAgent: req.headers["user-agent"] || null,
        expiresAt,
      },
    });

    res.cookie("auth_token", rawToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: expiresAt,
    });

    // Log Activity
    await prisma.activityLog.create({
      data: {
        role: `${user.role}:${user.username}`,
        action: "AUTH_LOGIN",
        detail: `Login berhasil sebagai tingkatan ${user.role.toUpperCase()} (@${user.username})`,
        ip: (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || null,
      },
    });

    res.json({
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName || user.username,
        role: user.role,
        permissions: user.customRole?.permissions || [],
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Gagal memproses login" });
  }
});

// GET /api/auth/me
router.get("/me", requireAuth, async (req: Request, res: Response) => {
  res.json({
    user: req.user,
  });
});

// POST /api/auth/logout
router.post("/logout", async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.auth_token;
    if (token) {
      const tokenHash = hashString(token);
      await prisma.session.deleteMany({ where: { tokenHash } });
    }
    res.clearCookie("auth_token");
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Gagal logout" });
  }
});

// POST /api/auth/change-password
router.post("/change-password", requireAuth, async (req: Request, res: Response) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: "Password lama dan baru wajib diisi" });
    }

    const userId = req.user!.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: "Akun tidak ditemukan" });
    }

    if (!verifyPassword(oldPassword, user.passwordHash)) {
      return res.status(400).json({ error: "Password lama tidak sesuai" });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hashPassword(newPassword) },
    });

    await prisma.activityLog.create({
      data: {
        role: `${user.role}:${user.username}`,
        action: "AUTH_CHANGE_PASSWORD",
        detail: `User @${user.username} memperbarui password`,
        ip: (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || null,
      },
    });

    res.json({ success: true, message: "Password berhasil diperbarui" });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Gagal mengganti password" });
  }
});

export default router;
