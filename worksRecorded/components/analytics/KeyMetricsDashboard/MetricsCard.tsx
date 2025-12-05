"use client";

import * as React from "react";
import { RefreshCw, Dot } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { ReasonHover } from "./HooverCardMetrics";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter as DialogFooterUI,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type WeeklyTarget = { amounts: number; units: string };
type TargetsJson = {
  byWeek?: Record<string, WeeklyTarget>;
  records?: Record<string, WeeklyTarget>;
};

type Props = {
  cardName: "Current week progress" | "Previous week progress" | string;
  siteId: string;
  currentWeekData: any;
  onRefresh?: (siteId: string) => Promise<void>;
  /** Full JSON from backend */
  targets?: TargetsJson | null;
  /** Server action */
  saveTargetAction?: (formData: FormData) => Promise<void>;
  /** Resolved week keys from parent (optional) */
  currentWeekKey?: string;
  previousWeekKey?: string;
};

export default function MetricsCard({
  cardName,
  siteId,
  currentWeekData,
  onRefresh,
  targets,
  saveTargetAction,
  currentWeekKey,
  previousWeekKey,
}: Props) {
  const [onCardRefresh, setOnCardRefresh] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  console.log(`from Metrics card ${JSON.stringify(targets)}`)
  // Decide which week-key this card represents
  const weekKey =
    cardName === "Previous week progress" ? previousWeekKey : currentWeekKey;

 

  const stored = weekKey ? targets?.byWeek?.[weekKey] : undefined;

  console.log(`stored ${stored}`)

  const [amount, setAmount] = React.useState<number>(stored?.amounts ?? 0);
  const [units, setUnits] = React.useState<string>(stored?.units ?? "");

  React.useEffect(() => {
    // keep local state in sync if targets update
    if (stored) {
      setAmount(stored.amounts ?? 0);
      setUnits(stored.units ?? "");
    }
  }, [stored?.amounts, stored?.units]);

  const weeklyTarget = amount || stored?.amounts || 0;
  console.log(`Weekly targets : ${weeklyTarget}`)
  const weeklyUnits = units || stored?.units || "";
  const assembled = Number(currentWeekData?.elementsAssembled ?? 0);
  const weeklyRatio = weeklyTarget > 0 ? assembled / weeklyTarget : 0;

  return (
    <Card className="@container/card relative overflow-hidden" data-slot="card">
      {onCardRefresh && (
        <div className="absolute inset-0 z-10 grid place-items-center bg-background/60 backdrop-blur-xs rounded-inherit">
          <Spinner className="size-8" />
        </div>
      )}

      <CardHeader className={onCardRefresh ? "opacity-100 pointer-events-none" : ""}>
        <CardDescription>{cardName}</CardDescription>

        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
          Target: {weeklyTarget} {weeklyUnits}
          <p>
            Completed:{" "}
            <span
              className={
                weeklyRatio > 0.8
                  ? "text-green-600"
                  : weeklyRatio > 0.5
                  ? "text-yellow-500"
                  : "text-red-600"
              }
            >
              {assembled}
            </span>
          </p>
        </CardTitle>

        <CardAction className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-300 hover:bg-green-100 inline-flex items-center gap-1.5"
          >
            <Dot className="size-4 text-green-600 fill-current" />
            LIVE
          </Badge>

          {/* Set Target to the left of ReasonHover (ReasonHover is in the footer row) */}
          {cardName === "Current week progress" && (
            <Button variant="outline" onClick={() => setOpen(true)}>
              Set target
            </Button>
          )}
        </CardAction>
      </CardHeader>

      <CardFooter className="flex-col items-start gap-1.5 text-sm">
        <div className="line-clamp-1 flex gap-2 font-medium">
          Total hours worked: {currentWeekData?.hoursWorked ?? 0} manhours
        </div>
        <div className="line-clamp-1 flex gap-2 font-medium">
          Additional works: {currentWeekData?.additionalHoursWorked ?? 0} manhours
        </div>
        <div className="flex items-center text-muted-foreground w-full">
          <span>Delays hours worked {currentWeekData?.delayedHours ?? 0}</span>
          <div className="flex flex-row gap-2 items-center size-14 ml-auto">
            <ReasonHover markdown={currentWeekData?.reason} title="How this was calculated" />
            <RefreshCw
              className="hover:animate-spin cursor-pointer size-12"
              onClick={async () => {
                if (!onRefresh) return;
                setOnCardRefresh(true);
                await onRefresh(siteId);
                setOnCardRefresh(false);
              }}
            />
          </div>
        </div>
      </CardFooter>

      {/* Dialog to set weekly target (numbers only for amounts) */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set weekly target</DialogTitle>
          </DialogHeader>

          <form
            action={async (formData) => {
              if (!saveTargetAction) return;
              const payload = { amounts: Number(amount) || 0, units: units || "" };
              formData.set("siteId", siteId);
              formData.set("targets", JSON.stringify(payload));
              await saveTargetAction(formData);
              toast.success("Target saved successfully");
              setOpen(false);
            }}
          >
            <input type="hidden" name="siteId" value={siteId} />
            <input type="hidden" name="targets" value="" />

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="amount">Weekly amount</Label>
                  <Input
                    id="amount"
                    name="amounts"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={Number.isFinite(amount) ? String(amount) : ""}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^\d]/g, "");
                      setAmount(v === "" ? 0 : Number(v));
                    }}
                    placeholder="e.g. 80"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="units">Units</Label>
                  <Input
                    id="units"
                    name="units"
                    value={units}
                    onChange={(e) => setUnits(e.target.value)}
                    placeholder="e.g. elements, m², pcs"
                  />
                </div>
              </div>
            </div>

            <DialogFooterUI className="mt-6">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">OK</Button>
            </DialogFooterUI>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
