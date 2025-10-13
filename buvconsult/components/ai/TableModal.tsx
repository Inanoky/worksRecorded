import {useMemo, useState} from "react";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {exportToExcel, getUniqueValues} from "@/components/shared/utils";




// -- Table modal component --


export function TableModal({ data, onClose }) {
  if (!Array.isArray(data) || data.length === 0) return null;
  const hideFields = ["id", "accepted", "itemDescription"];
  const headers = Array.from(
    new Set(
      data.flatMap(row => Object.keys(row))
    )
  ).filter(h => !hideFields.includes(h));
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({});

  // Filtering and searching
  const filteredData = useMemo(() => {
    return data.filter(row =>
      headers.every(
        (h) =>
          (!filters[h] || filters[h] === "" || row[h] === filters[h]) &&
          (search === "" ||
            Object.values(row)
              .join(" ")
              .toLowerCase()
              .includes(search.toLowerCase()))
      )
    );
  }, [data, filters, search, headers]);

  // Find all "sum" columns (case-insensitive)
  const sumHeaders = headers.filter(h => h.toLowerCase() === "sum");
  const sumTotals = {};
  for (const sumKey of sumHeaders) {
    sumTotals[sumKey] = filteredData.reduce(
      (acc, row) => acc + (parseFloat(row[sumKey]) || 0),
      0
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-[99] flex items-center justify-center">
      <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-2xl max-w-8xl w-full mx-4 relative border border-gray-200 dark:border-gray-700">
        <button
          className="absolute right-4 top-4 text-3xl text-gray-700 dark:text-gray-200 hover:text-red-500 font-bold"
          onClick={onClose}
        >
          ×
        </button>
        <h3 className="mb-4 text-2xl font-bold dark:text-gray-100">RESULTS</h3>
        <div className="flex flex-wrap gap-2 mb-2">
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <Button
            onClick={() => exportToExcel(headers, filteredData)}
            variant="outline"
          >
            Export to Excel
          </Button>
        </div>
        <div className="overflow-x-auto max-h-[80vh]">
          <table className="min-w-full border border-gray-300 dark:border-gray-700 text-base">
            <thead>
              <tr>
                {headers.map((h) => (
                  <th
                    key={h}
                    className="border-b px-4 py-3 text-left font-semibold bg-gray-50 dark:bg-gray-800 dark:text-gray-100 border-gray-300 dark:border-gray-700 max-w-xs break-words whitespace-pre-line"
                    style={{ wordBreak: "break-word" }}
                  >
                    <div className="flex flex-col">
                      <span>{h}</span>
                      <select
                        className="mt-1 text-xs px-1 py-0.5 border rounded bg-white dark:bg-gray-800 dark:text-gray-100 border-gray-300 dark:border-gray-700"
                        value={filters[h] || ""}
                        onChange={(e) =>
                          setFilters((f) => ({ ...f, [h]: e.target.value }))
                        }
                      >
                        <option value="">All</option>
                        {getUniqueValues(data, h).map((v) => (
                          <option key={v} value={v}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredData.map((row, i) => (
                <tr key={i}>
                  {headers.map((h) => (
                    <td
                      key={h}
                      className="border-b px-4 py-2 border-gray-300 dark:border-gray-700 dark:text-gray-100 max-w-xs break-words whitespace-pre-line"
                      style={{ wordBreak: "break-word" }}
                    >
                      {row[h]}
                    </td>
                  ))}
                </tr>
              ))}
              {/* Subtotal row */}
              <tr className="bg-gray-100 dark:bg-gray-800 font-bold">
                {headers.map((h) =>
                  sumHeaders.includes(h) ? (
                    <td
                      key={h}
                      className="px-4 py-2 border-t border-b border-gray-400 dark:border-gray-600 text-right dark:text-gray-100 max-w-xs break-words whitespace-pre-line"
                      style={{ wordBreak: "break-word" }}
                    >
                      Subtotal:{" "}
                      {sumTotals[h].toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                  ) : (
                    <td
                      key={h}
                      className="px-4 py-2 border-t border-b border-gray-400 dark:border-gray-600 max-w-xs break-words whitespace-pre-line"
                      style={{ wordBreak: "break-word" }}
                    ></td>
                  )
                )}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
