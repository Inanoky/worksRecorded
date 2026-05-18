import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { completeOnboardingLanguage } from "@/server/actions/onboarding-actions";
import { redirect } from "next/navigation";
import LanguageButtons from "./LanguageButtons";

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
      <DialogContent className="sm:max-w-md [&>button]:hidden">
        <DialogHeader>
          <DialogTitle className="space-y-1 leading-tight">
            <span className="block">Choose your organization language</span>
            <span className="block text-base font-medium text-muted-foreground">
              Izvēlieties organizācijas valodu
            </span>
          </DialogTitle>
          <DialogDescription className="space-y-2 pt-1 text-left">
            <span className="flex items-start gap-2">
              <span className="mt-0.5 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                EN
              </span>
              <span>
                Pick one language for shared organization UI across your team.
              </span>
            </span>
            <span className="flex items-start gap-2">
              <span className="mt-0.5 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                LV
              </span>
              <span>
                Izvēlieties vienu valodu kopīgajai organizācijas saskarnei visai
                komandai.
              </span>
            </span>
          </DialogDescription>
        </DialogHeader>

        <form action={setLanguage} className="mt-4 grid gap-3">
          <LanguageButtons />
        </form>
      </DialogContent>
    </Dialog>
  );
}
