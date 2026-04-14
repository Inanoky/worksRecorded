// server/actions/pdfBuilderForFrontend.ts
"use server";

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import {
  getSiteDiaryRecord,
  getPhotosByDate,
  getSiteDayWeather,
} from "@/server/actions/site-diary-actions";

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function toDayRangeISO(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { startISO: start.toISOString(), endISO: end.toISOString() };
}

function wrapText(text: string, maxLen: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const w of words) {
    if ((current + " " + w).trim().length > maxLen) {
      if (current) lines.push(current.trim());
      current = w;
    } else {
      current += " " + w;
    }
  }
  if (current) lines.push(current.trim());
  return lines;
}

// pdf-lib Helvetica is WinAnsi only – strip diacritics / fancy quotes
function sanitizeForWinAnsi(input: unknown): string {
  const text = input == null ? "" : String(input);

  return text
    .normalize("NFD") // base + diacritics
    .replace(/[\u0300-\u036f]/g, "") // remove diacritics (ā → a, ē → e)
    .replace(/[“”„]/g, '"')
    .replace(/[’‘]/g, "'"); // curly quotes → plain
}

/* ------------------------------------------------------------------ */
/* Field normalisers (DB → logical fields)                            */
/* ------------------------------------------------------------------ */

function getLocation(r: any): string | undefined {
  return (
    r.Location ??
    r.location ??
    r.LocationName ??
    r.location_name ??
    undefined
  );
}

function getWorks(r: any): string | undefined {
  return (
    r.Works ??
    r.works ??
    r.Work ??
    r.work ??
    r.WorkType ??
    r.workType ??
    r.work_type ??
    undefined
  );
}

function getUnits(r: any): string | undefined {
  return r.Units ?? r.units ?? undefined;
}

function getAmounts(r: any): number | string | undefined {
  return r.Amounts ?? r.amounts ?? r.Qty ?? r.qty ?? undefined;
}

function getWorkers(r: any): number | undefined {
  return (
    r.WorkersInvolved ??
    r.workersInvolved ??
    r.Workers ??
    r.workers ??
    undefined
  );
}

function getHours(r: any): number | undefined {
  return (
    r.TimeInvolved ??
    r.timeInvolved ??
    r.Hours ??
    r.hours ??
    undefined
  );
}

function getComments(r: any): string | undefined {
  return r.Comments ?? r.comments ?? undefined;
}

/* ------------------------------------------------------------------ */
/* Main server action                                                 */
/* ------------------------------------------------------------------ */

export async function generateSiteDiaryPdf(args: {
  siteId: string;
  dateISO: string;
}) {
  const { siteId, dateISO } = args;

  if (!siteId) throw new Error("Missing siteId");
  const date = new Date(dateISO);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid date");

  // 1) Load diary rows for that day
  const isoDate = date.toISOString();
  const rows = await getSiteDiaryRecord({ siteId, date: isoDate });

  // 2) Load photos for that day
  const { startISO, endISO } = toDayRangeISO(date);
  const photos = await getPhotosByDate({ siteId, startISO, endISO });
  const dayISO = date.toISOString().slice(0, 10);
  const weather = await getSiteDayWeather({ siteId, dayISO }).catch(() => null);
  const weatherRows = [...(weather?.hours ?? [])]
    .filter((h: any) => Number.isFinite(h?.hour))
    .sort((a: any, b: any) => Number(a.hour) - Number(b.hour));

  // 3) Create PDF
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const margin = 40;
  const pageWidth = 595;
  const tableWidth = pageWidth - margin * 2;
  let y = 800;

  const drawText = (text: string, size = 10, bold = false) => {
    const usedFont = bold ? fontBold : font;
    page.drawText(sanitizeForWinAnsi(text), {
      x: margin,
      y,
      size,
      font: usedFont,
      color: rgb(0, 0, 0),
    });
    y -= size + 4;
  };

  const drawRowText = (x: number, text: string) => {
    page.drawText(sanitizeForWinAnsi(text), {
      x,
      y,
      size: 8,
      font,
      color: rgb(0, 0, 0),
    });
  };

  /* --------------------------- Header --------------------------------- */

  drawText("Site Diary Report", 20, true);
  drawText(
    date.toLocaleDateString("en-GB", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short",
    }),
    12
  );
  y -= 2;

  // Summary box
  const totalTasks = rows.length;
  const totalHours = rows.reduce(
    (sum: number, r: any) => sum + (getHours(r) ?? 0),
    0
  );
  const totalWorkers = rows.reduce(
    (sum: number, r: any) => sum + (getWorkers(r) ?? 0),
    0
  );

  const boxTop = y;
  const boxHeight = 40;
  page.drawRectangle({
    x: margin,
    y: boxTop - boxHeight,
    width: tableWidth,
    height: boxHeight,
    color: rgb(0.96, 0.96, 0.96),
  });

  // Summary text inside box (do not move global y yet)
  const summaryY1 = boxTop - 12;
  const summaryY2 = boxTop - 22;
  const summaryY3 = boxTop - 32;

  page.drawText("Summary", {
    x: margin + 6,
    y: summaryY1,
    size: 9,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  });

  page.drawText(
    sanitizeForWinAnsi(`• Total tasks: ${totalTasks}`),
    { x: margin + 6, y: summaryY2, size: 8, font }
  );
  page.drawText(
    sanitizeForWinAnsi(`• Total worker entries: ${totalWorkers}`),
    { x: margin + 180, y: summaryY2, size: 8, font }
  );
  page.drawText(
    sanitizeForWinAnsi(`• Total hours: ${totalHours}`),
    { x: margin + 6, y: summaryY3, size: 8, font }
  );

  y = boxTop - boxHeight - 16;

  // Divider
  page.drawLine({
    start: { x: margin, y },
    end: { x: pageWidth - margin, y },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8),
  });
  y -= 14;

  /* --------------------------- Table header --------------------------- */

  const colX = {
    location: margin,
    works: margin + 120,
    units: margin + 280,
    amount: margin + 320,
    workers: margin + 370,
    hours: margin + 410,
  };

  // Grey band for header
  page.drawRectangle({
    x: margin,
    y: y - 4,
    width: tableWidth,
    height: 16,
    color: rgb(0.94, 0.94, 0.94),
  });

  page.drawText("Location", {
    x: colX.location,
    y,
    size: 8,
    font: fontBold,
  });
  page.drawText("Works", {
    x: colX.works,
    y,
    size: 8,
    font: fontBold,
  });
  page.drawText("U", {
    x: colX.units,
    y,
    size: 8,
    font: fontBold,
  });
  page.drawText("Qty", {
    x: colX.amount,
    y,
    size: 8,
    font: fontBold,
  });
  page.drawText("W", {
    x: colX.workers,
    y,
    size: 8,
    font: fontBold,
  });
  page.drawText("H", {
    x: colX.hours,
    y,
    size: 8,
    font: fontBold,
  });

  y -= 16;

  /* --------------------------- Table rows ----------------------------- */

  let rowIndex = 0;

  for (const r of rows as any[]) {
    if (y < 140) {
      // not doing multi-page yet – stop before photos section
      break;
    }

    const location = getLocation(r) ?? "—";
    const works = getWorks(r) ?? "—";
    const units = getUnits(r) ?? "—";
    const amounts = getAmounts(r);
    const workers = getWorkers(r);
    const hours = getHours(r);
    const comments = getComments(r);

    // subtle alternating row background
    if (rowIndex % 2 === 0) {
      page.drawRectangle({
        x: margin,
        y: y - 2,
        width: tableWidth,
        height: 14,
        color: rgb(0.985, 0.985, 0.985),
      });
    }

    drawRowText(colX.location, String(location).slice(0, 22));
    drawRowText(colX.works, String(works).slice(0, 32));
    drawRowText(colX.units, String(units));
    drawRowText(colX.amount, amounts != null ? String(amounts) : "—");
    drawRowText(colX.workers, workers != null ? String(workers) : "—");
    drawRowText(colX.hours, hours != null ? String(hours) : "—");
    y -= 14;

    // Comments block
    if (comments && y > 140) {
      const sanitizedComment = sanitizeForWinAnsi(comments);
      // Remove leading "Comment:" if present to avoid repetition
      const cleaned = sanitizedComment.replace(/^Comment:\s*/i, "");
      const wrapped = wrapText(cleaned, 95);

      wrapped.forEach((line, idx) => {
        if (y < 140) return;
        const prefix = idx === 0 ? "• " : "  ";
        page.drawText(prefix + line, {
          x: colX.location + 8,
          y,
          size: 7,
          font,
          color: rgb(0.15, 0.15, 0.15),
        });
        y -= 9;
      });

      y -= 4;
    }

    rowIndex += 1;
  }

  /* --------------------------- Photos section ------------------------- */

  // Weather details are rendered on a dedicated page below.

  if (photos && photos.length > 0) {
    if (y < 200) y = 200;
    y -= 24;

    page.drawText("Photos", {
      x: margin,
      y,
      size: 12,
      font: fontBold,
      color: rgb(0, 0, 0),
    });

    y -= 6;
    page.drawLine({
      start: { x: margin, y },
      end: { x: pageWidth - margin, y },
      thickness: 0.6,
      color: rgb(0.8, 0.8, 0.8),
    });

    y -= 12;

    const maxThumbHeight = 80;
    let xPhoto = margin;

    for (const p of (photos as any[]).slice(0, 8)) {
      const src: string | null = p.URL ?? p.fileUrl;
      if (!src) continue;

      try {
        const imgRes = await fetch(src);
        const imgBuf = await imgRes.arrayBuffer();

        let pdfImg;
        if (src.toLowerCase().includes(".png")) {
          pdfImg = await pdfDoc.embedPng(imgBuf);
        } else {
          pdfImg = await pdfDoc.embedJpg(imgBuf);
        }

        const scale = maxThumbHeight / pdfImg.height;
        const width = pdfImg.width * scale;
        const height = pdfImg.height * scale;

        if (xPhoto + width > pageWidth - margin) {
          xPhoto = margin;
          y -= height + 16;
        }

        page.drawImage(pdfImg, {
          x: xPhoto,
          y: y - height,
          width,
          height,
        });

        xPhoto += width + 10;
      } catch {
        // ignore single photo failure
      }
    }
  }

  if (weatherRows.length > 0) {
    const weatherPage = pdfDoc.addPage([595, 842]);
    const weatherMargin = 40;
    const weatherPageWidth = 595;
    let weatherY = 800;

    weatherPage.drawText("Weather for this day", {
      x: weatherMargin,
      y: weatherY,
      size: 18,
      font: fontBold,
      color: rgb(0, 0, 0),
    });
    weatherY -= 24;

    weatherPage.drawText(
      sanitizeForWinAnsi(
        date.toLocaleDateString("en-GB", {
          year: "numeric",
          month: "long",
          day: "numeric",
          weekday: "short",
        }),
      ),
      {
        x: weatherMargin,
        y: weatherY,
        size: 10,
        font,
      },
    );
    weatherY -= 18;

    const chartX = weatherMargin;
    const chartY = weatherY - 220;
    const chartW = weatherPageWidth - weatherMargin * 2;
    const chartH = 200;
    const chartInnerPad = 28;
    const chartInnerW = chartW - chartInnerPad * 2;
    const chartInnerH = chartH - chartInnerPad * 2;

    weatherPage.drawRectangle({
      x: chartX,
      y: chartY,
      width: chartW,
      height: chartH,
      color: rgb(0.98, 0.98, 0.99),
      borderColor: rgb(0.85, 0.85, 0.9),
      borderWidth: 1,
    });

    const temps = weatherRows
      .map((h: any) => h.temperatureC)
      .filter((v: any): v is number => typeof v === "number" && Number.isFinite(v));
    const winds = weatherRows
      .map((h: any) => h.windSpeedMs)
      .filter((v: any): v is number => typeof v === "number" && Number.isFinite(v));
    const minTemp = temps.length ? Math.min(...temps) : 0;
    const maxTemp = temps.length ? Math.max(...temps) : 1;
    const minWind = winds.length ? Math.min(...winds) : 0;
    const maxWind = winds.length ? Math.max(...winds) : 1;
    const spanTemp = Math.max(maxTemp - minTemp, 1);
    const spanWind = Math.max(maxWind - minWind, 1);

    const pointX = (index: number) =>
      chartX + chartInnerPad + (index / Math.max(weatherRows.length - 1, 1)) * chartInnerW;
    const pointYTemp = (value: number) =>
      chartY + chartInnerPad + ((value - minTemp) / spanTemp) * chartInnerH;
    const pointYWind = (value: number) =>
      chartY + chartInnerPad + ((value - minWind) / spanWind) * chartInnerH;

    for (let i = 0; i <= 4; i += 1) {
      const yy = chartY + chartInnerPad + (i / 4) * chartInnerH;
      weatherPage.drawLine({
        start: { x: chartX + chartInnerPad, y: yy },
        end: { x: chartX + chartW - chartInnerPad, y: yy },
        thickness: 0.5,
        color: rgb(0.86, 0.86, 0.9),
      });
    }

    for (let i = 0; i < weatherRows.length; i += 3) {
      const xTick = pointX(i);
      weatherPage.drawLine({
        start: { x: xTick, y: chartY + chartInnerPad },
        end: { x: xTick, y: chartY + chartH - chartInnerPad },
        thickness: 0.4,
        color: rgb(0.86, 0.86, 0.9),
      });
      weatherPage.drawText(`${String(weatherRows[i].hour).padStart(2, "0")}:00`, {
        x: xTick - 10,
        y: chartY + 8,
        size: 6,
        font,
      });
    }

    for (let i = 1; i < weatherRows.length; i += 1) {
      const prev = weatherRows[i - 1];
      const curr = weatherRows[i];
      if (typeof prev.temperatureC === "number" && typeof curr.temperatureC === "number") {
        weatherPage.drawLine({
          start: { x: pointX(i - 1), y: pointYTemp(prev.temperatureC) },
          end: { x: pointX(i), y: pointYTemp(curr.temperatureC) },
          thickness: 1.4,
          color: rgb(0.88, 0.24, 0.24),
        });
      }
      if (typeof prev.windSpeedMs === "number" && typeof curr.windSpeedMs === "number") {
        weatherPage.drawLine({
          start: { x: pointX(i - 1), y: pointYWind(prev.windSpeedMs) },
          end: { x: pointX(i), y: pointYWind(curr.windSpeedMs) },
          thickness: 1.4,
          color: rgb(0.2, 0.42, 0.86),
        });
      }
    }

    weatherPage.drawText("Temperature (°C)", {
      x: chartX + 10,
      y: chartY + chartH - 14,
      size: 7,
      font,
      color: rgb(0.88, 0.24, 0.24),
    });
    weatherPage.drawText("Wind (m/s)", {
      x: chartX + 110,
      y: chartY + chartH - 14,
      size: 7,
      font,
      color: rgb(0.2, 0.42, 0.86),
    });

    weatherY = chartY - 16;

    const tableX = weatherMargin;
    const tableW = weatherPageWidth - weatherMargin * 2;
    const rowHeight = 16;
    const headerY = weatherY;
    const colX = [tableX + 8, tableX + 90, tableX + 210, tableX + 320];

    weatherPage.drawRectangle({
      x: tableX,
      y: headerY - rowHeight + 2,
      width: tableW,
      height: rowHeight,
      color: rgb(0.94, 0.94, 0.95),
    });
    weatherPage.drawText("Hour", { x: colX[0], y: headerY - 10, size: 8, font: fontBold });
    weatherPage.drawText("Temperature (°C)", { x: colX[1], y: headerY - 10, size: 8, font: fontBold });
    weatherPage.drawText("Wind (m/s)", { x: colX[2], y: headerY - 10, size: 8, font: fontBold });
    weatherPage.drawText("Precipitation (mm)", { x: colX[3], y: headerY - 10, size: 8, font: fontBold });

    let rowY = headerY - rowHeight;
    for (const row of weatherRows.slice(0, 24)) {
      rowY -= rowHeight;
      weatherPage.drawLine({
        start: { x: tableX, y: rowY + 2 },
        end: { x: tableX + tableW, y: rowY + 2 },
        thickness: 0.4,
        color: rgb(0.85, 0.85, 0.88),
      });
      weatherPage.drawText(`${String(row.hour).padStart(2, "0")}:00`, {
        x: colX[0],
        y: rowY + 6,
        size: 7,
        font,
      });
      weatherPage.drawText(
        row.temperatureC == null ? "—" : String(Number(row.temperatureC).toFixed(1)),
        {
          x: colX[1],
          y: rowY + 6,
          size: 7,
          font,
        },
      );
      weatherPage.drawText(
        row.windSpeedMs == null ? "—" : String(Number(row.windSpeedMs).toFixed(1)),
        {
          x: colX[2],
          y: rowY + 6,
          size: 7,
          font,
        },
      );
      weatherPage.drawText(
        row.precipitationMm == null ? "0" : String(Number(row.precipitationMm).toFixed(1)),
        {
          x: colX[3],
          y: rowY + 6,
          size: 7,
          font,
        },
      );
    }
  }

  const pdfBytes = await pdfDoc.save();
  const base64 = Buffer.from(pdfBytes).toString("base64");
  const fileName = `SiteDiary_${date.toISOString().slice(0, 10)}.pdf`;

  return { fileName, base64 };
}
