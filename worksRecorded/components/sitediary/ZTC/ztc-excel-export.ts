const ZTC_EXCEL_COLUMNS = [
  ["Date", "Sākums"],
  ["Location", "Projekts"],
  ["Location_Custom_1", "Elements"],
  ["Location_Custom_2", "Likme"],
  ["Works", "Darbi"],
  ["Works_Custom_1", "Rasējuma darbi"],
  ["Works_Custom_2", "Koef."],
  ["Comments", "Komentāri"],
  ["Amounts", "Daudzums"],
  ["WorkersInvolved", "Sarežģītība"],
  ["TimeInvolved", "Stundas"],
  ["createdBy", "Darbinieks"],
] as const;

export function formatZtcRowsForExcel<T extends Record<string, any>>(rows: T[]) {
  return rows.map((row) =>
    Object.fromEntries(
      ZTC_EXCEL_COLUMNS.map(([field, label]) => [label, row[field] ?? ""]),
    ),
  );
}
