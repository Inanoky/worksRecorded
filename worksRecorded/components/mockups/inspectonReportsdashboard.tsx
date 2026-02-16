"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter, FileText } from "lucide-react";

// ---------------- Types ----------------
type ReportRow = {
  id: string;
  date: string;
  site: string;
  location: string;
  inspector: string;
  reportType: string;
};

// ---------------- Helpers ----------------
function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

// ---------------- Mock Data ----------------
const MOCK_REPORTS: ReportRow[] = Array.from({ length: 100 }).map((_, i) => {
  const sites = ["Site 1", "Site 2", "Site 3"];
  const inspectors = [
    "Vjaceslavs Gromatovics",
    "John Smith",
    "Alex Jones",
    "Mark Taylor",
  ];

  return {
    id: uid(),
    date: `2026-02-${String((i % 28) + 1).padStart(2, "0")}`,
    site: sites[i % sites.length],
    location: `Block ${String.fromCharCode(65 + (i % 4))}`,
    inspector: inspectors[i % inspectors.length],
    reportType: "Electrical Installations",
  };
});

const ALL_SITES = ["Site 1", "Site 2", "Site 3"];
const ALL_INSPECTORS = [
  "Vjaceslavs Gromatovics",
  "John Smith",
  "Alex Jones",
  "Mark Taylor",
];

// ---------------- Component ----------------
export default function InspectionReportsSummaryMockup() {
  const [siteFilter, setSiteFilter] = React.useState("__ALL__");
  const [inspectorFilter, setInspectorFilter] = React.useState("__ALL__");
  const [search, setSearch] = React.useState("");

  // ---------------- Filtering ----------------
  const rows = React.useMemo(() => {
    return MOCK_REPORTS.filter((r) => {
      if (siteFilter !== "__ALL__" && r.site !== siteFilter) return false;
      if (inspectorFilter !== "__ALL__" && r.inspector !== inspectorFilter)
        return false;

      if (search) {
        const q = search.toLowerCase();
        if (
          !r.site.toLowerCase().includes(q) &&
          !r.location.toLowerCase().includes(q) &&
          !r.inspector.toLowerCase().includes(q)
        )
          return false;
      }

      return true;
    });
  }, [siteFilter, inspectorFilter, search]);

  const clearFilters = () => {
    setSiteFilter("__ALL__");
    setInspectorFilter("__ALL__");
    setSearch("");
  };

  return (
    <div className="w-full mx-auto px-3 py-4 max-w-[1500px]">
      <Card className="shadow-sm">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-2xl font-semibold tracking-tight">
              Inspection Reports List
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Simple list of all inspection reports
            </p>
          </div>

          <div className="text-xs text-muted-foreground">
            Total reports: <span className="font-medium">{rows.length}</span>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Filters */}
          <Card className="border-muted bg-muted/30">
            <CardContent className="py-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Filter className="h-4 w-4" /> Filters
                </div>

                <div className="flex flex-1 flex-wrap gap-2">
                  {/* Search */}
                  <Input
                    placeholder="Search site, block, inspector"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-9 w-full sm:w-[240px]"
                  />

                  {/* Site */}
                  <Select value={siteFilter} onValueChange={setSiteFilter}>
                    <SelectTrigger className="h-9 w-full sm:w-[160px]">
                      <SelectValue placeholder="Site" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__ALL__">All sites</SelectItem>
                      {ALL_SITES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Inspector */}
                  <Select
                    value={inspectorFilter}
                    onValueChange={setInspectorFilter}
                  >
                    <SelectTrigger className="h-9 w-full sm:w-[220px]">
                      <SelectValue placeholder="Inspector" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__ALL__">All inspectors</SelectItem>
                      {ALL_INSPECTORS.map((i) => (
                        <SelectItem key={i} value={i}>
                          {i}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button size="sm" variant="ghost" onClick={clearFilters}>
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <div className="rounded-md border bg-background">
            <ScrollArea className="h-[72vh]">
              <Table className="min-w-[900px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Site</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Inspector</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-center">View</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.date}</TableCell>
                      <TableCell className="font-medium">{r.site}</TableCell>
                      <TableCell>{r.location}</TableCell>
                      <TableCell>{r.inspector}</TableCell>
                      <TableCell>{r.reportType}</TableCell>
                      <TableCell className="text-center">
                        <Button size="sm" variant="ghost">
                          <FileText className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}

                  {rows.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="py-10 text-center text-sm text-muted-foreground"
                      >
                        No reports match filters
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
