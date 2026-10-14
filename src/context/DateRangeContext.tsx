import React, { createContext, useContext, useState, ReactNode } from "react";

interface DateRangeContextType {
  fromDate: string;
  toDate: string;
  setFromDate: (date: string) => void;
  setToDate: (date: string) => void;
  setDateRange: (from: string, to: string) => void;
  setPreset: (preset: "today" | "yesterday" | "last7" | "last30" | "all") => void;
}

const DateRangeContext = createContext<DateRangeContextType | undefined>(undefined);

// Default range matching the petshop transaction records (2026-08-29 to 2026-09-28)
export const DateRangeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [fromDate, setFromDate] = useState<string>("2026-08-29");
  const [toDate, setToDate] = useState<string>("2026-09-28");

  const setDateRange = (from: string, to: string) => {
    setFromDate(from);
    setToDate(to);
  };

  const setPreset = (preset: "today" | "yesterday" | "last7" | "last30" | "all") => {
    if (preset === "all") {
      setFromDate("2026-08-29");
      setToDate("2026-09-28");
      return;
    }

    const maxDate = new Date("2026-09-28");
    const d = new Date(maxDate);

    if (preset === "today") {
      const str = maxDate.toISOString().split("T")[0];
      setFromDate(str);
      setToDate(str);
    } else if (preset === "yesterday") {
      d.setDate(d.getDate() - 1);
      const str = d.toISOString().split("T")[0];
      setFromDate(str);
      setToDate(str);
    } else if (preset === "last7") {
      d.setDate(d.getDate() - 6);
      setFromDate(d.toISOString().split("T")[0]);
      setToDate(maxDate.toISOString().split("T")[0]);
    } else if (preset === "last30") {
      d.setDate(d.getDate() - 29);
      setFromDate(d.toISOString().split("T")[0]);
      setToDate(maxDate.toISOString().split("T")[0]);
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
