"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/utils";
import DialogWindow from "@/components/sitediary/DialogWindow";
import { getFilledDays, getSitediaryRecordsBySiteIdForExcel } from "@/server/actions/site-diary-actions";
import * as XLSX from "xlsx";
import { Label } from "@/components/ui/label";

import TourRunner from "@/components/joyride/TourRunner";
import { steps_dashboard_siteid_site_diary_completed } from "@/components/joyride/JoyRideSteps";

const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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
          <Label> Start talking to AI +13135131153 (Whatsapp) </Label>
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
