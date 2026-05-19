"use client";

import Link from "next/link";
import { useState } from "react";
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
  title: string;
  description: string;
  continueLabel?: string;
  openInNewTab?: boolean;
};

export function BisConnectionTutorialDialog({
  connectHref,
  triggerLabel,
  title,
  description,
  continueLabel = "Continue",
  openInNewTab = false,
}: BisConnectionTutorialDialogProps) {
  const [tutorialImageSrc, setTutorialImageSrc] = useState(
    "/frontend/pages/Settings/ExplanationBisConnection.png"
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button">{triggerLabel}</Button>
      </DialogTrigger>
      <DialogContent className="max-w-none w-[70vw]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="overflow-auto rounded-md border max-h-[75vh]">
          <img
            src={tutorialImageSrc}
            alt="BIS connection tutorial"
            className="h-auto w-full"
            onError={() => {
              if (tutorialImageSrc !== "/logos/bislogo.png") {
                setTutorialImageSrc("/logos/bislogo.png");
              }
            }}
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
