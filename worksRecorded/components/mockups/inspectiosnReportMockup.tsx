// app/(whatever)/components/SiteInspectionReportElectricalSimpleMockup.tsx
"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";

type Report = {
  siteName: string;
  siteNumber: string;
  location: string;

  date: string;
  completedBy: string;

  description: string;
  comments: string;
  findingsSummary: string;

  introduction: string;

  offices: string;
  siteAccessAndTraffic: string;
  facilities: string;
  slipsTripsFalls: string;
  subcontractorsOnSite: string;
  environmentalWaste: string;

  conclusion: string;
  additionalCommentsFollowUp: string;

  signatureName: string;
  signatureDate: string;

  // ✅ NEW: what operator actually sent (raw WhatsApp / voice transcript)
  originalComment: string;
};

// ✅ Operator sends one messy daily message (what you store in "original comment")
// ✅ GPT “extracts” and fills the fields below (mocked here)
const ORIGINAL_COMMENT = `Eleventh of February at site two Riverside Apartments Block A and Plant Room.
Went around with U Fix electrical subcontractor. Office is tidy. Drawings and permits on the wall. PAT labels on laptops and chargers.
Access routes generally okay but delivery bay was very busy today. Traffic was heavy and a couple of pallets were left on the pedestrian route during delivery.
Welfare area clean. Tool charging station looks fine. No obvious overloading.
Noticed two one hundred and ten volt leads trailing across Stair Core A landing. This is a trip hazard and needs rerouting or cable ramps or tape.
Temporary distribution board near Plant Room. RCD is installed but the RCD test record was not visible. It might be in a folder but should be displayed clearly.
Waste mostly segregated but cable insulation scraps were seen in the mixed waste bin.
Overall acceptable to continue electrical works. Fix the leads. Update the distribution board record. Keep the walkway clear.`
const MOCK: Report = {
  siteName: "Riverside Apartments",
  siteNumber: "Site 2",
  location: "Block A / Plant Room",

  date: "2026-02-11",
  completedBy: "John Smith",

  // ✅ Filled “as if extracted by GPT” from ORIGINAL_COMMENT
  description:
    "Electrical installations inspection covering temporary electrics, distribution boards, cable routing/management, and housekeeping in Block A and Plant Room.",
  comments:
    "Overall acceptable to continue electrical works. Minor issues noted: trailing leads at Stair Core A and missing visible RCD test record for Temp DB-03. Delivery bay traffic caused occasional pedestrian route obstruction.",
  findingsSummary:
    "General condition good. Improve cable management and temporary board documentation. Reinforce pedestrian route controls during deliveries.",

  introduction:
    "This inspection covers electrical installation areas and related site conditions including access, welfare, housekeeping, and waste handling.",

  offices:
    "Office area tidy. Drawings/permits available and displayed. PAT labels visible on office equipment.",
  siteAccessAndTraffic:
    "Access routes generally clear; delivery bay traffic heavy and pallets were temporarily placed on pedestrian route during deliveries.",
  facilities:
    "Welfare clean. Tool charging station set up safely; no obvious overloading observed.",
  slipsTripsFalls:
    "Trip hazard identified: two 110V leads trailing across Stair Core A landing. Recommend re-route or use cable ramps/taping.",
  subcontractorsOnSite:
    "Electrical subcontractor on site: U-FIX. Walked the areas together.",
  environmentalWaste:
    "Waste mostly segregated. Cable insulation scraps observed in mixed waste bin; remind team to use electrical waste container.",

  conclusion:
    "Site in acceptable condition to continue electrical works. Address the actions listed to maintain compliance and reduce risk.",
  additionalCommentsFollowUp:
    "1) Secure / re-route trailing leads at Stair Core A.\n2) Display updated RCD test record on Temp DB-03.\n3) Keep delivery bay pedestrian walkway clear during deliveries.",

  signatureName: "John Smith",
  signatureDate: "2026-02-11",

  // ✅ NEW raw input stored for auditability
  originalComment: ORIGINAL_COMMENT,
};

export default function SiteInspectionReportElectricalSimpleMockup() {
  const r = MOCK;

  return (
    <div className="w-full mx-auto px-2 sm:px-4 py-4 max-w-[98vw] 2xl:max-w-[1200px]">
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="py-3 px-3 sm:px-4">
          <CardTitle className="text-xl sm:text-2xl font-semibold tracking-tight">
            Site Inspection Report (Electrical Installations) 
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Simple “Word-like” layout. Fields below are filled as if GPT extracted them from the “Original comment” at the bottom.
          </p>
        </CardHeader>

        <CardContent className="px-3 pb-3 sm:px-4">
          <div className="rounded-md border bg-background">
            <ScrollArea className="h-[78vh]">
              <div className="p-3 sm:p-4 space-y-4">
                {/* Header fields (like Word top table) */}
                <Table className="w-full">
                  <TableBody>
                    <TableRow>
                      <TableCell className="w-[240px] text-xs text-muted-foreground">
                        Site Name
                      </TableCell>
                      <TableCell className="py-2">
                        <Input value={r.siteName} readOnly />
                      </TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell className="text-xs text-muted-foreground">
                        Site Number
                      </TableCell>
                      <TableCell className="py-2">
                        <Input value={r.siteNumber} readOnly />
                      </TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell className="text-xs text-muted-foreground">
                        Location
                      </TableCell>
                      <TableCell className="py-2">
                        <Input value={r.location} readOnly />
                      </TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell className="text-xs text-muted-foreground">
                        Date
                      </TableCell>
                      <TableCell className="py-2">
                        <Input value={r.date} readOnly />
                      </TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell className="text-xs text-muted-foreground">
                        Report Completed by
                      </TableCell>
                      <TableCell className="py-2">
                        <Input value={r.completedBy} readOnly />
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>

                <Section title="Description">{r.description}</Section>
                <Section title="Comments">{r.comments}</Section>
                <Section title="Findings Summary">{r.findingsSummary}</Section>

                <Section title="Introduction">{r.introduction}</Section>

                <Section title="Offices">{r.offices}</Section>
                <Section title="Site access and traffic">{r.siteAccessAndTraffic}</Section>
                <Section title="Facilities">{r.facilities}</Section>
                <Section title="Slips, Trips and Falls">{r.slipsTripsFalls}</Section>
                <Section title="Subcontractors on site">{r.subcontractorsOnSite}</Section>
                <Section title="Environmental Waste">{r.environmentalWaste}</Section>

                <Section title="Conclusion">{r.conclusion}</Section>

                <Section title="Any additional comments including follow up action">
                  <div className="whitespace-pre-line">{r.additionalCommentsFollowUp}</div>
                </Section>

                {/* Signature (like Word bottom table) */}
                <Table className="w-full">
                  <TableBody>
                    <TableRow>
                      <TableCell className="w-[240px] text-xs text-muted-foreground">
                        Signature of inspector
                      </TableCell>
                      <TableCell className="py-2">
                        <Input value={r.signatureName} readOnly />
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-xs text-muted-foreground">
                        Signature date
                      </TableCell>
                      <TableCell className="py-2">
                        <Input value={r.signatureDate} readOnly />
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>

                {/* ✅ NEW: Original comment (raw operator input) */}
                <div className="space-y-1 pt-2">
                  <div className="text-sm font-semibold">Original comment</div>
                  <Textarea
                    value={r.originalComment}
                    readOnly
                    className="min-h-[180px] leading-relaxed"
                  />
                  <div className="text-xs text-muted-foreground">
                    Store this raw text for auditability. Your extraction pipeline should map it into the fields above.
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="text-sm font-semibold">{title}</div>
      <div className="rounded-md border bg-muted/20 p-3 text-sm text-muted-foreground leading-relaxed">
        {children}
      </div>
    </div>
  );
}
