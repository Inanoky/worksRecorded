"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { normalizeOrganizationLanguage } from "@/lib/dashboard-i18n";

type ReminderLogRow = {
  id: string;
  targetType: string;
  targetName: string;
  siteName: string | null;
  localDate: string | null;
  timezone: string | null;
  scheduledHHmm: string | null;
  source: string;
  status: string;
  reason: string | null;
  recipientPhoneMasked: string | null;
  metaMessageId: string | null;
  metaStatus: number | null;
  errorMessage: string | null;
  sentAt: string | null;
  createdAt: string;
};

type Props = {
  logs: ReminderLogRow[];
  organizationLanguage?: string | null;
};

const MESSAGES = {
  en: {
    title: "Reminder logs",
    empty: "No reminder attempts yet.",
    createdAt: "Created",
    recipient: "Recipient",
    site: "Project",
    date: "Local date",
    time: "Time",
    source: "Source",
    status: "Status",
    reason: "Reason",
    phone: "Phone",
    meta: "Meta",
    allStatuses: "All statuses",
    allTypes: "All recipients",
    user: "Manager",
    worker: "Worker",
  },
  lv: {
    title: "Atgādinājumu žurnāls",
    empty: "Atgādinājumi vēl nav mēģināti.",
    createdAt: "Izveidots",
    recipient: "Saņēmējs",
    site: "Projekts",
    date: "Lokālais datums",
    time: "Laiks",
    source: "Avots",
    status: "Statuss",
    reason: "Iemesls",
    phone: "Tālrunis",
    meta: "Meta",
    allStatuses: "Visi statusi",
    allTypes: "Visi saņēmēji",
    user: "Vadītājs",
    worker: "Darbinieks",
  },
} as const;

const STATUS_LABELS = {
  en: {
    pending: "Pending",
    sent: "Sent",
    skipped: "Skipped",
    failed: "Failed",
  },
  lv: {
    pending: "Gaida",
    sent: "Nosūtīts",
    skipped: "Izlaists",
    failed: "Neizdevās",
  },
} as const;

const REASON_LABELS = {
  en: {
    sent: "Sent",
    invalid_phone: "Invalid phone",
    missing_reminder_text: "Missing text",
    missing_reminder_time: "Missing time",
    outside_business_hours: "Outside work hours",
    diary_already_submitted: "Diary already submitted",
    missing_site: "Missing project",
    missing_meta_env: "Meta not configured",
    meta_send_failed: "Meta send failed",
  },
  lv: {
    sent: "Nosūtīts",
    invalid_phone: "Nederīgs tālrunis",
    missing_reminder_text: "Trūkst teksts",
    missing_reminder_time: "Trūkst laiks",
    outside_business_hours: "Ārpus darba laika",
    diary_already_submitted: "Žurnāls jau aizpildīts",
    missing_site: "Trūkst projekts",
    missing_meta_env: "Meta nav konfigurēta",
    meta_send_failed: "Meta sūtīšana neizdevās",
  },
} as const;

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function getLabel(
  map: Record<string, Record<string, string>>,
  language: "en" | "lv",
  value: string | null,
) {
  if (!value) return "-";
  return map[language]?.[value] ?? value;
}

export function WhatsappReminderLogsTable({ logs, organizationLanguage }: Props) {
  const language = normalizeOrganizationLanguage(organizationLanguage);
  const t = MESSAGES[language];
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [typeFilter, setTypeFilter] = React.useState("all");
  const filteredLogs = React.useMemo(
    () =>
      logs.filter((log) => {
        const statusMatches = statusFilter === "all" || log.status === statusFilter;
        const typeMatches = typeFilter === "all" || log.targetType === typeFilter;
        return statusMatches && typeMatches;
      }),
    [logs, statusFilter, typeFilter],
  );

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle>{t.title}</CardTitle>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[170px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.allStatuses}</SelectItem>
              {Object.entries(STATUS_LABELS[language]).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[170px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.allTypes}</SelectItem>
              <SelectItem value="user">{t.user}</SelectItem>
              <SelectItem value="worker">{t.worker}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="w-full overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.createdAt}</TableHead>
                <TableHead>{t.recipient}</TableHead>
                <TableHead>{t.site}</TableHead>
                <TableHead>{t.date}</TableHead>
                <TableHead>{t.time}</TableHead>
                <TableHead>{t.source}</TableHead>
                <TableHead>{t.status}</TableHead>
                <TableHead>{t.reason}</TableHead>
                <TableHead>{t.phone}</TableHead>
                <TableHead>{t.meta}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length ? (
                filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap">{formatDateTime(log.createdAt)}</TableCell>
                    <TableCell>
                      <div className="font-medium">{log.targetName}</div>
                      <div className="text-xs text-muted-foreground">
                        {log.targetType === "worker" ? t.worker : t.user}
                      </div>
                    </TableCell>
                    <TableCell>{log.siteName ?? "-"}</TableCell>
                    <TableCell className="whitespace-nowrap">{log.localDate ?? "-"}</TableCell>
                    <TableCell>{log.scheduledHHmm ?? "-"}</TableCell>
                    <TableCell>{log.source}</TableCell>
                    <TableCell>{getLabel(STATUS_LABELS, language, log.status)}</TableCell>
                    <TableCell>{getLabel(REASON_LABELS, language, log.reason)}</TableCell>
                    <TableCell>{log.recipientPhoneMasked ?? "-"}</TableCell>
                    <TableCell>
                      {log.metaMessageId || log.metaStatus ? (
                        <span className="whitespace-nowrap">
                          {log.metaStatus ?? "-"} {log.metaMessageId ?? ""}
                        </span>
                      ) : (
                        log.errorMessage ?? "-"
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={10} className="text-center">
                    {t.empty}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
