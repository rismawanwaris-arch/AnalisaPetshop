import { Router, Request, Response } from "express";
import { prisma } from "../../lib/prisma.js";
import { hashPassword, verifyPassword, hashString } from "../../lib/password.js";

const router = Router();

router.post("/login", async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username dan password wajib diisi" });
    }

    const user = await prisma.user.findUnique({
      where: { username },
      include: { customRole: true },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: "Kredensial tidak valid" });
    }

    const isMatch = verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: "Kredensial tidak valid" });
    }

    // Create session
    const token = hashString(`${user.id}_${Date.now()}_${Math.random()}`);
    const tokenHash = hashString(token);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await prisma.session.create({
      data: {
        tokenHash,
        userId: user.id,
        username: user.username,
        role: user.role,
        expiresAt,
      },
    });

    res.cookie("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: expiresAt,
    });

    res.json({
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        permissions: user.customRole?.permissions || [],
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Gagal login" });
  }
});

router.get("/me", async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.auth_token;
    if (!token) {
      return res.status(401).json({ error: "Belum login" });
    }

    const tokenHash = hashString(token);
    const session = await prisma.session.findUnique({
      where: { tokenHash },
      include: { user: { include: { customRole: true } } },
    });

    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      return res.status(401).json({ error: "Sesi telah berakhir" });
    }

    const user = session.user;
    if (!user || !user.isActive) {
      return res.status(401).json({ error: "Akun dinonaktifkan" });
    }

    res.json({
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        permissions: user.customRole?.permissions || [],
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Gagal memverifikasi sesi" });
  }
});

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
    res.status(500).json({ error: err.message });
  }
});

export default router;
