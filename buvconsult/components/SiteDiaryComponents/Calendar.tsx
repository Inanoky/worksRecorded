"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import DialogWindow from "@/components/SiteDiaryComponents/DialogWindow";
import { getFilledDays } from "@/app/siteDiaryActions";

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
  const monthName = new Date(currentYear, currentMonth).toLocaleString("default", { month: "long" });

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
    return () => { cancelled = true; }
  }, [siteId, currentMonth, currentYear]);

  return (
    <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 py-4">
      <h2 className="text-xl sm:text-2xl font-semibold mb-2">Site Diary</h2>
      
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
            } else setCurrentMonth(m => m - 1);
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
            } else setCurrentMonth(m => m + 1);
          }}
        >
          &gt;
        </Button>
      </div>

      {/* Days of Week Header */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-1">
        {daysOfWeek.map(day => (
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
          week.map((date, j) => (
            <Card
              key={`${i}-${j}`}
              className={cn(
                "aspect-square min-h-[32px] sm:min-h-[64px] flex items-center justify-center transition-all",
                !date && "bg-transparent border-0 shadow-none",
                date && filledDays.includes(date.getDate()) && "bg-green-50",
                date && "hover:shadow-md cursor-pointer"
              )}
              onClick={() => {
                if(date){
                  setDialogOpen(true);
                  setDate(date);
                }
              }}
            >
              <CardContent className="flex items-center justify-center p-0 h-full w-full">
                {date && (
                  <span className={cn(
                    "text-xs sm:text-sm",
                    filledDays.includes(date.getDate()) ? "text-green-700" : "text-gray-700"
                  )}>
                    {date.getDate()}
                    {filledDays.includes(date.getDate()) && (
                      <span className="hidden sm:inline ml-1">✓</span>
                    )}
                  </span>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <DialogWindow
        open={dialogOpen}
        setOpen={setDialogOpen}
        date={date}
        siteId={siteId}
        onSaved={reloadFilledDays}
      >
        <div className="grid gap-3">
          {/* Your dialog content here */}
        </div>
      </DialogWindow>
    </div>
  );
}