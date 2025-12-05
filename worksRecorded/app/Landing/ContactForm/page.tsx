// components/landing/ContactSection.tsx
"use client";

import { useState } from "react";
// Import motion and useInView from framer-motion
import { motion, useInView } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { sendGAEvent, sendGTMEvent } from '@next/third-parties/google';
import { Mail, Phone, Globe, Send } from 'lucide-react'; // Added icons for detail section
import { useRef } from "react"; // Added useRef

// --- Helper component to wrap items in animation ---
const AnimatedWrapper = motion.div;

// --- Animation Variants ---
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1, // Stagger delay between children
      delayChildren: 0.3,   // Initial delay
    },
  },
};

const itemVariants = {
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
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<null | { ok: boolean; msg: string }>(null);
  const router = useRouter();

  // Setup ref and useInView to trigger animation when the component scrolls into view
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 }); // Only trigger once

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
      sendGAEvent('event', 'conversion', { value: {'send_to': 'AW-17670426077/3OXOCMXV7rUbEN2b9elB'} })
      sendGTMEvent({ event: 'conversion', value: { 'send_to': 'AW-17670426077/3OXOCMXV7rUbEN2b9elB' }}) 

      router.push("/Landing/ThankYou");
      return;
    } else {
      const data = await res.json().catch(() => ({}));
      setStatus({
        ok: false,
        msg: data?.error ? String(data.error) : "Something went wrong. Please try again.",
      });
    }
  }

  return (
    <section ref={ref} className="mx-auto max-w-6xl rounded-2xl border bg-background p-8 sm:p-10">
      <AnimatedWrapper
        className="grid grid-cols-1 gap-10 md:grid-cols-2"
        variants={containerVariants}
        initial="hidden"
        animate={isInView ? "visible" : "hidden"} // Start animation when in view
      >
        {/* Left: Intro + details - Animated */}
        <div className="space-y-8">
          <AnimatedWrapper variants={itemVariants} className="space-y-4">
            <h1 className="text-5xl font-extrabold tracking-tight text-primary">Let's Connect! 🚀</h1>
            <p className="text-muted-foreground max-w-[46ch] text-lg">
              Call us, send an email, write on WhatsApp, or fill out the form. We guarantee to get in touch with you **the same day**!
            </p>
          </AnimatedWrapper>

          <AnimatedWrapper variants={itemVariants} className="space-y-4">
            <h2 className="text-2xl font-bold">Quick Details</h2>
            <ul className="list-none space-y-3">
              <li className="flex items-center space-x-3">
                <Phone className="h-5 w-5 text-primary flex-shrink-0" />
                <span className="font-medium">Phone:</span> +371 24885690
              </li>
              <li className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-primary flex-shrink-0" />
                <span className="font-medium">Email:</span>{" "}
                <a href="mailto:hello@buvconsult.com" className="underline hover:text-primary transition-colors">
                  hello@buvconsult.com
                </a>
              </li>
              <li className="flex items-center space-x-3">
                <Globe className="h-5 w-5 text-primary flex-shrink-0" />
                <span className="font-medium">Web:</span>{" "}
                <a
                  href="https://www.buvconsult.com"
                  target="_blank"
                  rel="noreferrer"
                  className="underline hover:text-primary transition-colors"
                >
                  buvconsult.com
                </a>
              </li>
            </ul>
          </AnimatedWrapper>
        </div>

        {/* Right: Form - Animated Card */}
        <AnimatedWrapper variants={itemVariants} className="rounded-2xl border bg-card text-card-foreground shadow-2xl">
          <Card className="rounded-2xl border-none shadow-none">
            <CardHeader className="p-6">
              <CardTitle className="text-3xl font-bold">Send us a Message</CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <form className="space-y-5" onSubmit={onSubmit}>
                {/* Honeypot (hidden to humans, visible to bots) */}
                <input type="text" name="hp" className="hidden" tabIndex={-1} autoComplete="off" />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <AnimatedWrapper variants={itemVariants} className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" name="firstName" placeholder="First Name" required />
                  </AnimatedWrapper>
                  <AnimatedWrapper variants={itemVariants} className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" name="lastName" placeholder="Last Name" required />
                  </AnimatedWrapper>
                </div>

                <AnimatedWrapper variants={itemVariants} className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" placeholder="Your best email" required />
                </AnimatedWrapper>

                <AnimatedWrapper variants={itemVariants} className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input id="subject" name="subject" placeholder="Project Inquiry, Consultation, etc." required />
                </AnimatedWrapper>

                <AnimatedWrapper variants={itemVariants} className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    name="message"
                    placeholder="Tell us about your project or inquiry..."
                    className="min-h-32"
                    required
                  />
                </AnimatedWrapper>

                {status && (
                  <p className={status.ok ? "text-green-600 text-sm font-semibold" : "text-destructive text-sm font-semibold"}>
                    {status.msg}
                  </p>
                )}

                <Button type="submit" className="w-full h-11 text-base group" disabled={pending}>
                  {pending ? (
                    "Sending…"
                  ) : (
                    <>
                      Send Message
                      <Send className="h-4 w-4 ml-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" /> {/* Button animation */}
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