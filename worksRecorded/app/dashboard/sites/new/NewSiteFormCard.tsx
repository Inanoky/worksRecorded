"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useActionState } from "react";
import { CreateSiteAction } from "@/server/actions/shared-actions";
import { useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import { siteSchema } from "@/lib/utils/zodSchemas";
import { SubmitButton } from "@/components/dashboard/SubmitButtons";
import TourRunner from "@/components/joyride/TourRunner";
import { getJoyRideSteps } from "@/components/joyride/JoyRideSteps";
import { getDashboardMessages, normalizeOrganizationLanguage } from "@/lib/dashboard-i18n";

type Props = {
  organizationLanguage?: string | null;
};

export default function NewSiteFormCard({ organizationLanguage }: Props) {
  const language = normalizeOrganizationLanguage(organizationLanguage);
  const t = getDashboardMessages(language);
  const joyrideSteps = getJoyRideSteps(language);

  const [lastResult, action] = useActionState(CreateSiteAction, undefined);
  const [form, fields] = useForm({
    lastResult,
    onValidate({ formData }) {
      return parseWithZod(formData, {
        schema: siteSchema,
      });
    },
    shouldValidate: "onBlur",
    shouldRevalidate: "onInput",
  });

  return (
    <div className="flex flex-col flex-1 items-center justify-center">
      <TourRunner steps={joyrideSteps.steps_dashboard_sites_new} />
      <Card className="max-w-[450px]" data-tour="sites/new/card">
        <CardHeader>
          <CardTitle>{t.createProject}</CardTitle>
          <CardDescription>
            {language === "lv" ? "Ievadiet projekta informāciju" : "Enter project information"}
          </CardDescription>
        </CardHeader>
        <form id={form.id} onSubmit={form.onSubmit} action={action}>
          <CardContent>
            <div className="flex flex-col gap-y-6">
              <div className="grid gap-2">
                <Label>{language === "lv" ? "Projekta nosaukums" : "Project name"}</Label>
                <Input
                  name={fields.name.name}
                  key={fields.name.key}
                  defaultValue={fields.name.initialValue}
                  maxLength={100}
                  placeholder={language === "lv" ? "Projekta nosaukums" : "Project name"}
                />
                <p className="text-red-500 text-small">{fields.name.errors}</p>
              </div>
              <div className="grid gap-2">
                <Label>{language === "lv" ? "Projekta adrese" : "Project address"}</Label>
                <Input
                  name={fields.subdirectory.name}
                  key={fields.subdirectory.key}
                  defaultValue={fields.subdirectory.initialValue}
                  placeholder={language === "lv" ? "Adrese" : "Address"}
                />
                <p className="text-red-500 text-small"> {fields.subdirectory.errors}</p>
              </div>
              <div className="grid gap-2">
                <Label>{language === "lv" ? "Apraksts" : "Description"}</Label>
                <Textarea
                  name={fields.description.name}
                  key={fields.description.key}
                  defaultValue={fields.description.initialValue}
                  placeholder={language === "lv" ? "Īss projekta apraksts" : "Small description for your site"}
                />
                <p className="text-red-500 text-sm">{fields.description.errors}</p>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <SubmitButton text={t.createProject} />
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
