import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

/**
 * Format tanggal lokal ke format YYYY-MM-DD
 */
export const getLocalYMD = (d: Date = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Menghitung periode bulanan Petshop dengan aturan cutoff: Tanggal 29 s/d Tanggal 28.
 * - Jika tanggal saat ini >= 29: Mulai tanggal 29 bulan ini s/d tanggal 28 bulan depan
 * - Jika tanggal saat ini < 29 (1 s/d 28): Mulai tanggal 29 bulan lalu s/d tanggal 28 bulan ini
 */
export const getCycleRange = (d: Date = new Date()) => {
  const year = d.getFullYear();
  const month = d.getMonth();
  const date = d.getDate();

  let startYear = year;
  let startMonth = month;
  let endYear = year;
  let endMonth = month;

  if (date >= 29) {
    // Memasuki siklus baru (29 bulan ini s/d 28 bulan depan)
    startYear = year;
    startMonth = month;
    const nextMonth = new Date(year, month + 1, 1);
    endYear = nextMonth.getFullYear();
    endMonth = nextMonth.getMonth();
  } else {
    // Masih dalam siklus berjalan (29 bulan kemarin s/d 28 bulan ini)
    const prevMonth = new Date(year, month - 1, 1);
    startYear = prevMonth.getFullYear();
    startMonth = prevMonth.getMonth();
    endYear = year;
    endMonth = month;
  }

  // Handle jumlah hari aman untuk bulan pendek/Februari
  const startMaxDays = new Date(startYear, startMonth + 1, 0).getDate();
  const startDay = Math.min(29, startMaxDays);
  const endMaxDays = new Date(endYear, endMonth + 1, 0).getDate();
  const endDay = Math.min(28, endMaxDays);

  const startMonthStr = String(startMonth + 1).padStart(2, "0");
  const endMonthStr = String(endMonth + 1).padStart(2, "0");

  return {
    from: `${startYear}-${startMonthStr}-${String(startDay).padStart(2, "0")}`,
    to: `${endYear}-${endMonthStr}-${String(endDay).padStart(2, "0")}`,
  };
};

/**
 * Menghitung periode siklus bulanan sebelumnya (29 s/d 28 bulan lalu)
 */
export const getLastCycleRange = (d: Date = new Date()) => {
  const current = getCycleRange(d);
  const startDate = new Date(current.from);
  // Mundur 15 hari dari tanggal mulai siklus saat ini untuk masuk ke siklus sebelumnya
  const prevDate = new Date(startDate.getTime() - 15 * 24 * 60 * 60 * 1000);
  return getCycleRange(prevDate);
};

// Alias untuk kompatibilitas kode yang sudah ada
export const getCurrentMonthRange = (d: Date = new Date()) => getCycleRange(d);
export const getLastMonthRange = (d: Date = new Date()) => getLastCycleRange(d);

export type DatePreset = "today" | "yesterday" | "last7" | "last30" | "this-month" | "last-month" | "all";

interface DateRangeContextType {
  fromDate: string;
  toDate: string;
  setFromDate: (date: string) => void;
  setToDate: (date: string) => void;
  setDateRange: (from: string, to: string) => void;
  setPreset: (preset: DatePreset) => void;
}

const DateRangeContext = createContext<DateRangeContextType | undefined>(undefined);

// Default range selalu menampilkan periode bulan berjalan (Cutoff: Tanggal 29 s/d Tanggal 28)
export const DateRangeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const defaultCycle = getCycleRange();
  const [fromDate, setFromDate] = useState<string>(defaultCycle.from);
  const [toDate, setToDate] = useState<string>(defaultCycle.to);

  // Auto-detect: Jika database memiliki dataset terbaru (misal 2026-08-29 s/d 2026-09-28)
  // dan siklus saat ini belum ada data sama sekali, arahkan default awal ke siklus data tersebut
  useEffect(() => {
    fetch("/api/imports/periods")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        const maxDateStr = data.sales?.maxDate || data.purchases?.maxDate;
        if (maxDateStr) {
          const maxD = new Date(maxDateStr);
          const currentCycle = getCycleRange(new Date());
          const maxCycle = getCycleRange(maxD);

          // Jika data di database adalah periode sebelumnya yang belum masuk siklus sekarang,
          // sesuaikan initial range agar pengguna langsung melihat datanya (29 ke 28).
          if (maxD < new Date(currentCycle.from)) {
            setFromDate((prev) => (prev === currentCycle.from ? maxCycle.from : prev));
            setToDate((prev) => (prev === currentCycle.to ? maxCycle.to : prev));
          }
        }
      })
      .catch(() => {});
  }, []);

  const setDateRange = (from: string, to: string) => {
    setFromDate(from);
    setToDate(to);
  };

  const setPreset = (preset: DatePreset) => {
    const now = new Date();

    if (preset === "today") {
      const todayStr = getLocalYMD(now);
      setFromDate(todayStr);
      setToDate(todayStr);
    } else if (preset === "yesterday") {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yStr = getLocalYMD(y);
      setFromDate(yStr);
      setToDate(yStr);
    } else if (preset === "last7") {
      const d = new Date(now);
      d.setDate(d.getDate() - 6);
      setFromDate(getLocalYMD(d));
      setToDate(getLocalYMD(now));
    } else if (preset === "last30" || preset === "this-month") {
      // Periode Bulan Berjalan (Tanggal 29 s/d Tanggal 28)
      const range = getCycleRange(now);
      setFromDate(range.from);
      setToDate(range.to);
    } else if (preset === "last-month") {
      // Periode Bulan Lalu (Tanggal 29 s/d Tanggal 28 bulan sebelumnya)
      const range = getLastCycleRange(now);
      setFromDate(range.from);
      setToDate(range.to);
    } else if (preset === "all") {
      // Semua Data: reset filter kosong agar mengambil seluruh data historis
      setFromDate("");
      setToDate("");
    }
  };

  return (
    <DateRangeContext.Provider
      value={{
        fromDate,
        toDate,
        setFromDate,
        setToDate,
        setDateRange,
        setPreset,
      }}
    >
      {children}
    </DateRangeContext.Provider>
  );
};

export const useDateRange = () => {
  const context = useContext(DateRangeContext);
  if (!context) {
    throw new Error("useDateRange must be used within a DateRangeProvider");
  }
  return context;
};
