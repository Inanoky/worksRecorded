import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="mx-auto max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle>Choose your organization language</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={setLanguage} className="flex gap-3">
            <Button type="submit" name="language" value="en">English</Button>
            <Button type="submit" name="language" value="lv" variant="outline">Latviešu</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
