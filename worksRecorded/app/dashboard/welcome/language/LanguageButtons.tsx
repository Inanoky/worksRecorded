"use client";

import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";

export default function LanguageButtons() {
  const { pending } = useFormStatus();

  return (
    <>
      <Button
        type="submit"
        name="language"
        value="en"
        className="justify-start gap-2"
        disabled={pending}
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <span aria-hidden>🇬🇧</span>}
        <span>{pending ? "Saving language..." : "English"}</span>
      </Button>
      <Button
        type="submit"
        name="language"
        value="lv"
        variant="outline"
        className="justify-start gap-2"
        disabled={pending}
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <span aria-hidden>🇱🇻</span>}
        <span>Latviešu</span>
      </Button>
    </>
  );
}
