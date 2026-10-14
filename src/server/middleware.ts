import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma.js";
import { hashString } from "../lib/password.js";

export interface AuthenticatedUser {
  id: number;
  username: string;
  displayName: string | null;
  role: string; // "master" | "admin"
  permissions: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.auth_token;
    if (!token) {
      return res.status(401).json({ error: "Sesi tidak ditemukan. Silakan login kembali." });
    }

    const tokenHash = hashString(token);
    const session = await prisma.session.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: { customRole: true },
        },
      },
    });

    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      return res.status(401).json({ error: "Sesi telah berakhir atau tidak valid. Silakan login kembali." });
    }

    const user = session.user;
    if (!user || !user.isActive) {
      return res.status(401).json({ error: "Akun ini telah dinonaktifkan." });
    }

    // Attach authenticated user to request
    req.user = {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      permissions: user.customRole?.permissions || [],
    };

    next();
  } catch (err: any) {
    return res.status(500).json({ error: "Gagal memverifikasi autentikasi" });
  }
}

export function requireMaster(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: "Belum terautentikasi" });
  }
  if (req.user.role !== "master") {
    return res.status(403).json({ error: "Akses ditolak: Hanya tingkat Master yang diizinkan." });
  }
  next();
}

export function requireFeature(featureKey: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Belum terautentikasi" });
    }
    // Master has full access to everything
    if (req.user.role === "master") {
      return next();
    }
    // Admin with customRole permissions restriction
    if (req.user.permissions && req.user.permissions.length > 0) {
      if (!req.user.permissions.includes(featureKey)) {
        return res.status(403).json({
          error: `Akses ditolak: Fitur '${featureKey}' tidak diizinkan untuk peran Anda.`,
        });
      }
    }
    next();
  };
}
