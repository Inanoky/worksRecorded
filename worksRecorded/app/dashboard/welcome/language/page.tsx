import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { completeOnboardingLanguage } from "@/server/actions/onboarding-actions";
import { redirect } from "next/navigation";

async function setLanguage(formData: FormData) {
  "use server";
  const language = formData.get("language");
  if (language !== "en" && language !== "lv") return;
  await completeOnboardingLanguage(language);
  redirect("/dashboard/welcome");
}

export default function WelcomeLanguagePage() {
  return (
    <Dialog open={true}>
      <DialogContent
        className="sm:max-w-md [&>button]:hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Choose your organization language</DialogTitle>
          <DialogDescription>
            Pick one language for shared organization UI across your team.
          </DialogDescription>
        </DialogHeader>

        <form action={setLanguage} className="mt-4 grid gap-3">
          <Button type="submit" name="language" value="en" className="justify-start gap-2">
            <span aria-hidden>🇬🇧</span>
            <span>English</span>
          </Button>
          <Button type="submit" name="language" value="lv" variant="outline" className="justify-start gap-2">
            <span aria-hidden>🇱🇻</span>
            <span>Latviešu</span>
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
