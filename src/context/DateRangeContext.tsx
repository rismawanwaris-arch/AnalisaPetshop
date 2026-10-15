import React, { createContext, useContext, useState, ReactNode } from "react";

export const getLocalYMD = (d: Date = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const getCurrentMonthRange = (d: Date = new Date()) => {
  const year = d.getFullYear();
  const month = d.getMonth();
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  return {
    from: getLocalYMD(start),
    to: getLocalYMD(end),
  };
};

export const getLastMonthRange = (d: Date = new Date()) => {
  const year = d.getFullYear();
  const month = d.getMonth();
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  return {
    from: getLocalYMD(start),
    to: getLocalYMD(end),
  };
};

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

// Default range selalu menampilkan data bulan berjalan (tanggal 1 s/d akhir bulan berjalan)
export const DateRangeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const currentMonth = getCurrentMonthRange();
  const [fromDate, setFromDate] = useState<string>(currentMonth.from);
  const [toDate, setToDate] = useState<string>(currentMonth.to);

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
      // Bulan Berjalan (Tanggal 1 s/d Akhir Bulan Berjalan)
      const range = getCurrentMonthRange(now);
      setFromDate(range.from);
      setToDate(range.to);
    } else if (preset === "last-month") {
      // Bulan Lalu (Tanggal 1 s/d Akhir Bulan Lalu)
      const range = getLastMonthRange(now);
      setFromDate(range.from);
      setToDate(range.to);
    } else if (preset === "all") {
      // Semua Data: reset filter kosong agar mengambil seluruh data
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
