"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type BisConnectionTutorialDialogProps = {
  connectHref: string;
  triggerLabel: string;
  continueLabel?: string;
  openInNewTab?: boolean;
};

export function BisConnectionTutorialDialog({
  connectHref,
  triggerLabel,
  continueLabel = "Continue",
  openInNewTab = false,
}: BisConnectionTutorialDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button">{triggerLabel}</Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>BIS authentication tutorial</DialogTitle>
          <DialogDescription>
            Please review the tutorial before continuing to BIS authentication.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-hidden rounded-md border">
          <Image
            src="/frontend/pages/Settings/ExplanationBisConnection.png"
            alt="BIS connection tutorial"
            width={1200}
            height={800}
            className="h-auto w-full"
            priority
          />
        </div>

        <DialogFooter>
          <Button asChild>
            <Link
              href={connectHref}
              target={openInNewTab ? "_blank" : undefined}
              rel={openInNewTab ? "noreferrer" : undefined}
            >
              {continueLabel}
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
