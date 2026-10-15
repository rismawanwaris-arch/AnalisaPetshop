import React from "react";
import { Calendar } from "lucide-react";
import { DatePreset } from "../context/DateRangeContext.js";

interface DateRangePickerProps {
  fromDate: string;
  toDate: string;
  onFromChange: (date: string) => void;
  onToChange: (date: string) => void;
  onPreset?: (preset: DatePreset) => void;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  fromDate,
  toDate,
  onFromChange,
  onToChange,
  onPreset,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-2 bg-slate-50 dark:bg-slate-900/90 p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs transition-colors">
      <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-semibold px-1">
        <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
        <span>Periode:</span>
      </div>

      <div className="flex items-center gap-1.5">
        <input
          type="date"
          value={fromDate}
          onChange={(e) => onFromChange(e.target.value)}
          className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 text-slate-700 dark:text-slate-200 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer shadow-2xs"
        />
        <span className="text-slate-400 font-medium">s/d</span>
        <input
          type="date"
          value={toDate}
          onChange={(e) => onToChange(e.target.value)}
          className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 text-slate-700 dark:text-slate-200 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer shadow-2xs"
        />
      </div>

      {onPreset && (
        <div className="flex items-center gap-1 pl-1 border-l border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => onPreset("today")}
            className="px-2 py-1 rounded-md bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-[11px] font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors shadow-2xs cursor-pointer"
          >
            Hari Ini
          </button>
          <button
            type="button"
            onClick={() => onPreset("last7")}
            className="px-2 py-1 rounded-md bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-[11px] font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors shadow-2xs cursor-pointer"
          >
            7 Hari
          </button>
          <button
            type="button"
            onClick={() => onPreset("this-month")}
            className="px-2 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition-colors shadow-2xs cursor-pointer"
          >
            Bulan Ini
          </button>
          <button
            type="button"
            onClick={() => onPreset("last-month")}
            className="px-2 py-1 rounded-md bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-[11px] font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors shadow-2xs cursor-pointer"
          >
            Bulan Lalu
          </button>
          <button
            type="button"
            onClick={() => onPreset("all")}
            className="px-2 py-1 rounded-md bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-[11px] font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors shadow-2xs cursor-pointer"
          >
            Semua
          </button>
        </div>
      )}
    </div>
  );
};
