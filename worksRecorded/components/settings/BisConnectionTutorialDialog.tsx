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
