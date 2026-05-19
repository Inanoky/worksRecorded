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
  connectLabel: string;
};

export function BisConnectionTutorialDialog({
  connectHref,
  connectLabel,
}: BisConnectionTutorialDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>{connectLabel}</Button>
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
            <Link href={connectHref}>{connectLabel}</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
