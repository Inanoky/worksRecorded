"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { saveUserPhone } from "@/server/actions/shared-actions";
import { Loader2 } from "lucide-react";


type Props = {
  needsPhone: boolean;
};

export function PhoneRequiredDialog({ needsPhone }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [phone, setPhone] = useState(""); // stored WITHOUT "+"

  if (!needsPhone) return null;

  return (
    <Dialog open={true}>
      <DialogContent
        className="sm:max-w-md [&>button]:hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>
            <span className="block">Add your phone number</span>
            <span className="block">Pievienojiet savu tālruņa numuru</span>
          </DialogTitle>
          <DialogDescription>
            <span className="block">
              Required for WhatsApp timesheets and notifications.
            </span>
            <span className="block">
              Nepieciešams WhatsApp darba laika uzskaitēm un paziņojumiem.
            </span>
          </DialogDescription>
        </DialogHeader>

        <form
          action={() => {
            setError(null);
            startTransition(async () => {
              try {
                const fd = new FormData();
                fd.append("phone", phone);
                await saveUserPhone(fd);
                window.location.reload();
              } catch (err: any) {
                setError(err?.message || "Something went wrong / Radās kļūda");
              }
            });
          }}
          className="mt-4 space-y-4"
          aria-busy={pending}
        >
          <fieldset disabled={pending} className="space-y-4">
            <PhoneInput
              disabled={pending}
              country={"lv"} // default Latvia
              value={phone}
              onChange={(value) => setPhone(value)} // value = "37120000000"
              inputProps={{
                name: "phone",
                required: true,
              }}
              inputClass="!w-full !h-11 !text-sm"
              buttonClass="!h-11"
              containerClass="!w-full"
            />

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button
              type="submit"
              className="w-full"
              disabled={pending}
              aria-disabled={pending}
            >
              {pending ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving... /
                  Saglabā...
                </span>
              ) : (
                "Continue / Turpināt"
              )}
            </Button>
          </fieldset>
        </form>
      </DialogContent>
    </Dialog>
  );
}
