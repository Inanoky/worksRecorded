// components/landing/ContactSection.tsx
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { sendGAEvent, sendGTMEvent} from '@next/third-parties/google'

export default function ContactForm() {
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<null | { ok: boolean; msg: string }>(null);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setStatus(null);

    const fd = new FormData(e.currentTarget);
    const payload = {
      firstName: String(fd.get("firstName") || ""),
      lastName: String(fd.get("lastName") || ""),
      email: String(fd.get("email") || ""),
      subject: String(fd.get("subject") || ""),
      message: String(fd.get("message") || ""),
      hp: String(fd.get("hp") || ""), // honeypot
    };

    const res = await fetch("/api/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setPending(false);

    if (res.ok) {
    // Fire Google Ads conversion before redirect (optional)

    sendGAEvent('event', 'conversion', { value:  {'send_to': 'AW-17670426077/3OXOCMXV7rUbEN2b9elB'} })
    sendGTMEvent({ event: 'conversion', value: { 'send_to': 'AW-17670426077/3OXOCMXV7rUbEN2b9elB' }}) 

    router.push("/Landing/ThankYou");
    return;
}else {
      const data = await res.json().catch(() => ({}));
      setStatus({
        ok: false,
        msg: data?.error ? String(data.error) : "Something went wrong. Please try again.",
      });
    }
  }

  return (
    <section className="mx-auto max-w-6xl rounded-2xl border bg-background p-15 sm:p-10">
      <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
        {/* Left: Intro + details */}
        <div className="space-y-8">
          <div className="space-y-4">
            <h1 className="text-5xl font-bold tracking-tight">Contact Us</h1>
            <p className="text-muted-foreground max-w-[46ch]">
              Call us, send an email, write in whatsapp or fill the form and we will get in touch the same day!
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Contact Details</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <span className="font-medium">Phone:</span> +371 24885690
              </li>
              <li>
                <span className="font-medium">Email:</span>{" "}
                <a href="mailto:hello@buvconsult.com" className="underline">
                  hello@buvconsult.com
                </a>
              </li>
              <li>
                <span className="font-medium">Web:</span>{" "}
                <a
                  href="https://www.buvconsult.com"
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  buvconsult.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Right: Form */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="sr-only">Send Message</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={onSubmit}>
              {/* Honeypot (hidden to humans, visible to bots) */}
              <input type="text" name="hp" className="hidden" tabIndex={-1} autoComplete="off" />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" name="firstName" placeholder="First Name" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" name="lastName" placeholder="Last Name" required />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" placeholder="Email" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input id="subject" name="subject" placeholder="Subject" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  name="message"
                  placeholder="Type your message here."
                  className="min-h-32"
                  required
                />
              </div>

              {status && (
                <p className={status.ok ? "text-green-600 text-sm" : "text-destructive text-sm"}>
                  {status.msg}
                </p>
              )}

              <Button type="submit" className="w-full h-11 text-base" disabled={pending}>
                {pending ? "Sending…" : "Send Message"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
