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
          <DialogTitle className="space-y-1 leading-tight">
            <span className="block">Add your phone number</span>
            <span className="block text-base font-medium text-muted-foreground">
              Pievienojiet savu tālruņa numuru
            </span>
          </DialogTitle>
          <DialogDescription className="space-y-2 pt-1 text-left">
            <span className="flex items-start gap-2">
              <span className="mt-0.5 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                EN
              </span>
              <span>Required for WhatsApp timesheets and notifications.</span>
            </span>
            <span className="flex items-start gap-2">
              <span className="mt-0.5 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                LV
              </span>
              <span>
                Nepieciešams WhatsApp darba laika uzskaitēm un paziņojumiem.
              </span>
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
              className="h-auto w-full py-3"
              disabled={pending}
              aria-disabled={pending}
            >
              {pending ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="flex flex-col leading-tight">
                    <span>Saving...</span>
                    <span className="text-xs font-normal opacity-80">
                      Saglabā...
                    </span>
                  </span>
                </span>
              ) : (
                <span className="flex flex-col leading-tight">
                  <span>Continue</span>
                  <span className="text-xs font-normal opacity-80">
                    Turpināt
                  </span>
                </span>
              )}
            </Button>
          </fieldset>
        </form>
      </DialogContent>
    </Dialog>
  );
}
