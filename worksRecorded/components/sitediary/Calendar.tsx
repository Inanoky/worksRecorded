"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/utils";
import DialogWindow from "@/components/sitediary/DialogWindow";
import { getFilledDays, getSitediaryRecordsBySiteIdForExcel } from "@/server/actions/site-diary-actions";
import * as XLSX from "xlsx";
import { Label } from "@/components/ui/label";
import { MessageCircle } from "lucide-react";
import TourRunner from "@/components/joyride/TourRunner";
import { steps_dashboard_siteid_site_diary_completed } from "@/components/joyride/JoyRideSteps";

const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WhatsAppIcon = ({ size = 22 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 32 32"
  >
    <path
      d="M16 3C9.383 3 4 8.383 4 15c0 2.383.699 4.699 2.016 6.699L4 29l7.516-1.984C13.301 28.301 14.699 29 17 29c6.617 0 12-5.383 12-12S22.617 3 16 3z"
      fill="#e0e0e0"
    />
    <path
      d="M16 5C10.477 5 6 9.477 6 15c0 2.148.668 4.172 1.926 5.918l.309.414-1.223 4.602 4.711-1.234.402.238A9.89 9.89 0 0016 25c5.523 0 10-4.477 10-10S21.523 5 16 5z"
      fill="#fff"
    />
    <path
      d="M16 7C11.589 7 8 10.589 8 15c0 1.91.637 3.773 1.781 5.25l.285.371-.73 2.738 2.797-.734.359.211A8.02 8.02 0 0016 23c4.411 0 8-3.589 8-8s-3.589-8-8-8z"
      fill="#25D366"
    />
    <path
      d="M21.395 17.695c-.309-.152-1.828-.914-2.113-1.016-.285-.102-.492-.152-.699.152-.207.309-.801 1.016-.984 1.223-.18.207-.363.234-.672.086-.309-.152-1.305-.48-2.484-1.53-.918-.812-1.539-1.812-1.723-2.121-.18-.309-.02-.484.133-.636.137-.137.309-.359.465-.539.156-.18.207-.309.309-.512.102-.203.051-.383-.024-.539-.078-.156-.699-1.68-.957-2.297-.254-.617-.512-.531-.699-.539-.18-.008-.383-.008-.586-.008-.203 0-.52.074-.793.359-.27.285-1.043 1.02-1.043 2.484 0 1.465 1.066 2.879 1.215 3.074.152.195 2.09 3.195 5.074 4.488.711.305 1.266.488 1.699.625.711.223 1.352.191 1.863.117.57-.082 1.828-.742 2.086-1.453.258-.711.258-1.324.18-1.453-.078-.133-.285-.207-.609-.359z"
      fill="#fff"
    />
  </svg>
);

function getCalendarGrid(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const weeks = [];
  let week = [];
  for (let i = 0; i < firstDay.getDay(); i++) week.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) {
    week.push(new Date(Date.UTC(year, month, d)));
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  while (week.length && week.length < 7) week.push(null);
  if (week.length) weeks.push(week);
  return weeks;
}

export default function SiteDiaryCalendar({ siteId }) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const today = new Date();
  const [currentMonth, setCurrentMonth] = React.useState(today.getMonth());
  const [currentYear, setCurrentYear] = React.useState(today.getFullYear());
  const [date, setDate] = React.useState(null);
  const [filledDays, setFilledDays] = React.useState<number[]>([]);

  const weeks = getCalendarGrid(currentYear, currentMonth);
  const monthName = new Date(currentYear, currentMonth).toLocaleString("default", {
    month: "long",
  });

  async function exportToExcel() {
    const rows = await getSitediaryRecordsBySiteIdForExcel(siteId);
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Site diary records");
    XLSX.writeFile(workbook, "SiteDiaryRecords.xlsx");
  }

  const reloadFilledDays = React.useCallback(() => {
    if (!siteId) return setFilledDays([]);
    getFilledDays({ siteId, year: currentYear, month: currentMonth }).then(setFilledDays);
  }, [siteId, currentMonth, currentYear]);

  React.useEffect(() => {
    let cancelled = false;
    async function fetchFilledDays() {
      if (!siteId) return setFilledDays([]);
      const days = await getFilledDays({ siteId, year: currentYear, month: currentMonth });
      if (!cancelled) setFilledDays(days);
    }
    fetchFilledDays();
    return () => {
      cancelled = true;
    };
  }, [siteId, currentMonth, currentYear]);

  const hasFilledDays = filledDays.length > 0;

  // this flag is reset on every render – used to mark only the first green day
  let firstFilledMarked = false;

  return (
    <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 py-4">
      {/* 👇 Run the "completed day" tour only when we know there is at least one filled day */}
      {hasFilledDays && (
        <TourRunner
          steps={steps_dashboard_siteid_site_diary_completed}
          stepName="steps_dashboard_siteid_site_diary_completed"
        />
      )}

      <div className="flex flex-row justify-between">
        <h2 className="text-xl sm:text-2xl gap-5 font-semibold mb-2">Site Diary</h2>
<div>
  <button
    type="button"
    onClick={() => window.open("https://wa.me/13135131153", "_blank")}
    className="flex items-center gap-2 text-sm font-medium
               text-green-600 hover:text-green-700 
               cursor-pointer px-2 py-1 rounded-md 
               hover:bg-green-50 transition"
  >
    <WhatsAppIcon />
    Click here to record site work via WhatsApp
  </button>
</div>
        <div>
          <Button className="ml-2" variant="outline" onClick={exportToExcel}>
            Export to Excel
          </Button>
        </div>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="outline"
          size="sm"
          className="text-sm p-2 sm:px-4 sm:py-2"
          onClick={() => {
            if (currentMonth === 0) {
              setCurrentMonth(11);
              setCurrentYear(currentYear - 1);
            } else setCurrentMonth((m) => m - 1);
          }}
        >
          &lt;
        </Button>
        <div className="text-lg sm:text-xl font-medium px-2 text-center">
          {monthName} {currentYear}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="text-sm p-2 sm:px-4 sm:py-2"
          onClick={() => {
            if (currentMonth === 11) {
              setCurrentMonth(0);
              setCurrentYear(currentYear + 1);
            } else setCurrentMonth((m) => m + 1);
          }}
        >
          &gt;
        </Button>
      </div>

      {/* Days of Week Header */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-1">
        {daysOfWeek.map((day) => (
          <div
            key={day}
            className="text-xs sm:text-sm text-center font-medium text-gray-500 truncate"
          >
            {day.substring(0, 2)}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {weeks.map((week, i) =>
          week.map((dateObj, j) => {
            const isFilled =
              !!dateObj && filledDays.includes(dateObj.getDate());

            let dataTour: string | undefined;
            if (isFilled && !firstFilledMarked) {
              dataTour = "first-completed-diary-record";
              firstFilledMarked = true;
            }

            return (
              <Card
                key={`${i}-${j}`}
                data-tour={dataTour}
                className={cn(
                  "aspect-square min-h-[32px] sm:min-h-[64px] flex items-center justify-center transition-all",
                  !dateObj && "bg-transparent border-0 shadow-none",
                  isFilled && "bg-green-50",
                  dateObj && "hover:shadow-md cursor-pointer"
                )}
                onClick={() => {
                  if (dateObj) {
                    setDialogOpen(true);
                    setDate(dateObj);
                  }
                }}
              >
                <CardContent className="flex items-center justify-center p-0 h-full w-full">
                  {dateObj && (
                    <span
                      className={cn(
                        "text-xs sm:text-sm",
                        isFilled ? "text-green-700" : "text-gray-700"
                      )}
                    >
                      {dateObj.getDate()}
                      {isFilled && (
                        <span className="hidden sm:inline ml-1">✓</span>
                      )}
                    </span>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <DialogWindow
        open={dialogOpen}
        setOpen={setDialogOpen}
        date={date}
        siteId={siteId}
        onSaved={reloadFilledDays}
      >
        <div className="grid gap-3">{/* dialog content */}</div>
      </DialogWindow>
    </div>
  );
}
