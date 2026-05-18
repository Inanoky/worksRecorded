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
          <DialogTitle>
            <span className="block">Choose your organization language</span>
            <span className="block">Izvēlieties organizācijas valodu</span>
          </DialogTitle>
          <DialogDescription>
            <span className="block">
              Pick one language for shared organization UI across your team.
            </span>
            <span className="block">
              Izvēlieties vienu valodu kopīgajai organizācijas saskarnei visai
              komandai.
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
