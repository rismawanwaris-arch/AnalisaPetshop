import { prisma } from "../src/lib/prisma.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const jsonPath = path.resolve(__dirname, "import_points_data.json");
  const rawData = fs.readFileSync(jsonPath, "utf-8");
  const data: [string, number][] = JSON.parse(rawData);

  console.log(`Menyiapkan input ${data.length} aturan poin item ke database...`);

  const startDate = new Date("2026-01-01");
  let inserted = 0;
  let updated = 0;

  for (const [pattern, points] of data) {
    const existing = await prisma.itemPoint.findFirst({
      where: { pattern },
    });

    if (existing) {
      await prisma.itemPoint.update({
        where: { id: existing.id },
        data: { points },
      });
      updated++;
    } else {
      await prisma.itemPoint.create({
        data: {
          pattern,
          points,
          startDate,
          isDefault: true,
        },
      });
      inserted++;
    }
  }

  const total = await prisma.itemPoint.count();
  console.log(`Selesai! Dimasukkan baru: ${inserted}, Diperbarui: ${updated}, Total aturan poin di DB: ${total}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Gagal import poin:", err);
  process.exit(1);
});
