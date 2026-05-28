"use client";

import { Dispatch, SetStateAction, useState } from "react";
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
import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";

type Props = {
  needsPhone: boolean;
  action: (formData: FormData) => void | Promise<void>;
};

function PhoneFormControls({
  phone,
  setPhone,
}: {
  phone: string;
  setPhone: Dispatch<SetStateAction<string>>;
}) {
  const { pending } = useFormStatus();

  return (
    <>
      {pending && (
        <div className="absolute inset-0 z-50 grid place-items-center bg-background/85 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 text-sm font-medium text-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span>Saving...</span>
            <span className="text-xs font-normal text-muted-foreground">
              Saglabā...
            </span>
          </div>
        </div>
      )}

      <fieldset disabled={pending} className="space-y-4">
        <PhoneInput
          disabled={pending}
          country="lv"
          value={phone}
          onChange={(value) => setPhone(value)}
          inputProps={{
            name: "phone",
            required: true,
          }}
          inputClass="!w-full !h-11 !text-sm"
          buttonClass="!h-11"
          containerClass="!w-full"
        />

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
    </>
  );
}

export function PhoneRequiredDialog({ needsPhone, action }: Props) {
  const [phone, setPhone] = useState("");

  if (!needsPhone) return null;

  return (
    <Dialog open={true}>
      <DialogContent
        className="overflow-hidden sm:max-w-md [&>button]:hidden"
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

        <form action={action} className="mt-4 space-y-4">
          <PhoneFormControls phone={phone} setPhone={setPhone} />
        </form>
      </DialogContent>
    </Dialog>
  );
}
