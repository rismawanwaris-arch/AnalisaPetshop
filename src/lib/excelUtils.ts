import * as xlsx from "xlsx";

/**
 * Safely parse numbers from any string/number format, including:
 * - "48000"
 * - "48.000" or "48,000" (thousands separator)
 * - "48.000,50" or "48,000.50" (decimal)
 * - "Rp 48.000" or "IDR 48.000"
 * - "(48.000)" or "-48000" (negative numbers)
 * - null / undefined / "" -> fallback (0)
 */
export function parseCleanNumber(val: any, fallback = 0): number {
  if (val === null || val === undefined || val === "") return fallback;
  if (typeof val === "number") return isNaN(val) ? fallback : val;

  let str = String(val).trim();
  if (!str) return fallback;

  let isNegative = false;
  if (str.startsWith("(") && str.endsWith(")")) {
    isNegative = true;
    str = str.slice(1, -1).trim();
  } else if (str.startsWith("-")) {
    isNegative = true;
    str = str.slice(1).trim();
  }

  // Remove non-numeric prefixes like "Rp", "IDR", spaces
  str = str.replace(/^[^\d,.-]+/, "").trim();

  // If both dots and commas exist
  if (str.includes(".") && str.includes(",")) {
    if (str.lastIndexOf(",") > str.lastIndexOf(".")) {
      // "1.234,50" -> Indonesian format: dots are thousands, comma is decimal
      str = str.replace(/\./g, "").replace(",", ".");
    } else {
      // "1,234.50" -> US format: commas are thousands, dot is decimal
      str = str.replace(/,/g, "");
    }
  } else if (str.includes(".")) {
    const parts = str.split(".");
    // If multiple dots ("1.000.000") or 3 digits after dot ("48.000") -> thousands separator
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
      str = str.replace(/\./g, "");
    }
  } else if (str.includes(",")) {
    const parts = str.split(",");
    // If multiple commas or 3 digits after comma ("48,000") -> thousands separator
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
      str = str.replace(/,/g, "");
    } else {
      str = str.replace(",", ".");
    }
  }

  const num = parseFloat(str);
  if (isNaN(num)) return fallback;
  return isNegative ? -num : num;
}

/**
 * Safely parse date from Excel serial number, DD/MM/YYYY, YYYY-MM-DD, or Date object
 */
export function parseCleanDate(val: any): Date {
  if (!val) return new Date();
  if (val instanceof Date && !isNaN(val.getTime())) return val;

  if (typeof val === "number") {
    // Excel base date: 1899-12-30
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (!isNaN(d.getTime())) return d;
    return new Date();
  }

  const str = String(val).trim();
  if (!str) return new Date();

  // Excel serial number as string: e.g. "46263"
  if (/^\d{5}$/.test(str)) {
    const d = new Date(Math.round((parseFloat(str) - 25569) * 86400 * 1000));
    if (!isNaN(d.getTime())) return d;
  }

  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmyMatch = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1; // 0-indexed
    let year = parseInt(dmyMatch[3], 10);
    if (year < 100) year += 2000;
    const d = new Date(Date.UTC(year, month, day));
    if (!isNaN(d.getTime())) return d;
  }

  // YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = str.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);
    const d = new Date(Date.UTC(year, month, day));
    if (!isNaN(d.getTime())) return d;
  }

  const d = new Date(str);
  if (!isNaN(d.getTime())) return d;

  return new Date();
}

/**
 * Flexible field extractor that matches aliases regardless of case, punctuation, or spaces
 */
export function getField(row: Record<string, any>, ...aliases: string[]): any {
  if (!row || typeof row !== "object") return undefined;

  // 1. Direct exact match
  for (const a of aliases) {
    if (row[a] !== undefined && row[a] !== null && String(row[a]).trim() !== "") {
      return row[a];
    }
  }

  // 2. Normalized alphanumeric match
  const rowKeys = Object.keys(row);
  for (const a of aliases) {
    const target = a.toLowerCase().replace(/[^a-z0-9]/g, "");
    for (const k of rowKeys) {
      const normalizedKey = k.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (normalizedKey === target) {
        const val = row[k];
        if (val !== undefined && val !== null && String(val).trim() !== "") {
          return val;
        }
      }
    }
  }

  return undefined;
}

/**
 * Automatically locate the best sheet and header row in case of title banners or empty rows
 */
export function extractRowsWithHeaders(
  wb: xlsx.WorkBook,
  signatures: string[]
): Record<string, any>[] {
  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    if (!sheet) continue;

    // Convert sheet to array of rows (2D array)
    const rawMatrix: any[][] = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: "" });
    if (!rawMatrix || rawMatrix.length === 0) continue;

    // Find the header row (within first 15 rows)
    let headerRowIdx = -1;
    for (let i = 0; i < Math.min(15, rawMatrix.length); i++) {
      const row = rawMatrix[i];
      if (!Array.isArray(row)) continue;

      const normalizedRow = row.map((cell) =>
        String(cell).toLowerCase().replace(/[^a-z0-9]/g, "")
      );

      // Count signature matches
      const matchCount = signatures.filter((sig) => {
        const target = sig.toLowerCase().replace(/[^a-z0-9]/g, "");
        return normalizedRow.some((cell) => cell.includes(target));
      }).length;

      if (matchCount >= 2 || (signatures.length === 1 && matchCount >= 1)) {
        headerRowIdx = i;
        break;
      }
    }

    if (headerRowIdx !== -1) {
      const headers = rawMatrix[headerRowIdx].map((h) => String(h || "").trim());
      const dataRows: Record<string, any>[] = [];

      for (let r = headerRowIdx + 1; r < rawMatrix.length; r++) {
        const row = rawMatrix[r];
        if (!Array.isArray(row) || row.every((c) => String(c || "").trim() === "")) continue;

        const obj: Record<string, any> = {};
        for (let c = 0; c < headers.length; c++) {
          const headerName = headers[c] || `col_${c}`;
          obj[headerName] = row[c] !== undefined ? row[c] : "";
        }
        dataRows.push(obj);
      }

      if (dataRows.length > 0) {
        return dataRows;
      }
    }

    // Fallback: standard sheet_to_json
    const standardRows: any[] = xlsx.utils.sheet_to_json(sheet, { defval: "" });
    if (standardRows.length > 0) {
      return standardRows;
    }
  }

  return [];
}
