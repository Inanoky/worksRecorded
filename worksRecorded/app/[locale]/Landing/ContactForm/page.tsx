// components/landing/ContactSection.tsx
"use client";

import { motion, useInView, type Variants } from "framer-motion";
import { Globe, Mail, Phone, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trackGenerateLeadOnce } from "@/lib/analytics/marketing-events";

// --- Helper component to wrap items in animation ---
const AnimatedWrapper = motion.div;

// --- Animation Variants ---
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.3,
    },
  },
};

const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100,
    },
  },
};

export default function ContactForm() {
  const t = useTranslations("Contact");
  const locale = useLocale();

  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<null | { ok: boolean; msg: string }>(
    null,
  );
  const router = useRouter();
  const submissionInFlight = useRef(false);
  const emailId = useId();
  const firstNameId = useId();
  const lastNameId = useId();
  const messageId = useId();
  const subjectId = useId();

  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submissionInFlight.current) return;

    submissionInFlight.current = true;
    setPending(true);
    setStatus(null);

    const fd = new FormData(e.currentTarget);
    const payload = {
      firstName: String(fd.get("firstName") || ""),
      lastName: String(fd.get("lastName") || ""),
      email: String(fd.get("email") || ""),
      subject: String(fd.get("subject") || ""),
      message: String(fd.get("message") || ""),
      hp: String(fd.get("hp") || ""),
    };

    try {
      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        if (data.accepted === true && typeof data.id === "string") {
          trackGenerateLeadOnce(data.id);
        }

        router.push(`/${locale}/Landing/ThankYou`);
        return;
      }

      setStatus({
        ok: false,
        msg: data?.error ? String(data.error) : t("status.errorDefault"),
      });
    } catch {
      setStatus({ ok: false, msg: t("status.errorDefault") });
    } finally {
      submissionInFlight.current = false;
      setPending(false);
    }
  }

  return (
    <section
      ref={ref}
      className="mx-auto max-w-6xl rounded-2xl border bg-background p-8 sm:p-10"
    >
      <AnimatedWrapper
        className="grid grid-cols-1 gap-10 md:grid-cols-2"
        variants={containerVariants}
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
      >
        {/* Left */}
        <div className="space-y-8">
          <AnimatedWrapper variants={itemVariants} className="space-y-4">
            <h1 className="text-5xl font-extrabold tracking-tight text-primary">
              {t("heroTitle")}
            </h1>
            <p className="text-muted-foreground max-w-[46ch] text-lg">
              {t("heroDescription")}
            </p>
          </AnimatedWrapper>

          <AnimatedWrapper variants={itemVariants} className="space-y-4">
            <h2 className="text-2xl font-bold">{t("quickDetailsTitle")}</h2>
            <ul className="list-none space-y-3">
              <li className="flex items-center space-x-3">
                <Phone className="h-5 w-5 text-primary flex-shrink-0" />
                <span className="font-medium">{t("phoneLabel")}</span> +371
                24885690
              </li>

              <li className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-primary flex-shrink-0" />
                <span className="font-medium">{t("emailLabel")}</span>{" "}
                <a
                  href="mailto:vjaceslavs@worksrecorded.com"
                  className="underline hover:text-primary transition-colors"
                >
                  vjaceslavs@worksrecorded.com
                </a>
              </li>

              <li className="flex items-center space-x-3">
                <Globe className="h-5 w-5 text-primary flex-shrink-0" />
                <span className="font-medium">{t("webLabel")}</span>{" "}
                <a
                  href="https://www.worksrecorded.com"
                  target="_blank"
                  rel="noreferrer"
                  className="underline hover:text-primary transition-colors"
                >
                  worksrecorded.com
                </a>
              </li>
            </ul>
          </AnimatedWrapper>
        </div>

        {/* Right */}
        <AnimatedWrapper
          variants={itemVariants}
          className="rounded-2xl border bg-card text-card-foreground shadow-2xl"
        >
          <Card className="rounded-2xl border-none shadow-none">
            <CardHeader className="p-6">
              <CardTitle className="text-3xl font-bold">
                {t("formTitle")}
              </CardTitle>
            </CardHeader>

            <CardContent className="p-6 pt-0">
              <form className="space-y-5" onSubmit={onSubmit}>
                <input
                  type="text"
                  name="hp"
                  className="hidden"
                  tabIndex={-1}
                  autoComplete="off"
                />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <AnimatedWrapper
                    variants={itemVariants}
                    className="space-y-2"
                  >
                    <Label htmlFor={firstNameId}>{t("firstNameLabel")}</Label>
                    <Input
                      id={firstNameId}
                      name="firstName"
                      placeholder={t("firstNamePlaceholder")}
                      required
                    />
                  </AnimatedWrapper>

                  <AnimatedWrapper
                    variants={itemVariants}
                    className="space-y-2"
                  >
                    <Label htmlFor={lastNameId}>{t("lastNameLabel")}</Label>
                    <Input
                      id={lastNameId}
                      name="lastName"
                      placeholder={t("lastNamePlaceholder")}
                      required
                    />
                  </AnimatedWrapper>
                </div>

                <AnimatedWrapper variants={itemVariants} className="space-y-2">
                  <Label htmlFor={emailId}>{t("emailFieldLabel")}</Label>
                  <Input
                    id={emailId}
                    name="email"
                    type="email"
                    placeholder={t("emailPlaceholder")}
                    required
                  />
                </AnimatedWrapper>

                <AnimatedWrapper variants={itemVariants} className="space-y-2">
                  <Label htmlFor={subjectId}>{t("subjectLabel")}</Label>
                  <Input
                    id={subjectId}
                    name="subject"
                    placeholder={t("subjectPlaceholder")}
                    required
                  />
                </AnimatedWrapper>

                <AnimatedWrapper variants={itemVariants} className="space-y-2">
                  <Label htmlFor={messageId}>{t("messageLabel")}</Label>
                  <Textarea
                    id={messageId}
                    name="message"
                    placeholder={t("messagePlaceholder")}
                    className="min-h-32"
                    required
                  />
                </AnimatedWrapper>

                {status && (
                  <p
                    className={
                      status.ok
                        ? "text-green-600 text-sm font-semibold"
                        : "text-destructive text-sm font-semibold"
                    }
                  >
                    {status.msg}
                  </p>
                )}

                <Button
                  type="submit"
                  className="w-full h-11 text-base group"
                  disabled={pending}
                >
                  {pending ? (
                    t("sending")
                  ) : (
                    <>
                      {t("sendMessage")}
                      <Send className="h-4 w-4 ml-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </AnimatedWrapper>
      </AnimatedWrapper>
    </section>
  );
}
