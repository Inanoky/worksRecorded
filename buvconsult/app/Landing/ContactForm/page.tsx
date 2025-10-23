// components/landing/ContactSection.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export default function ContactForm() {
  return (
    <section className="mx-auto max-w-6xl rounded-2xl border bg-background p-6 sm:p-10">
      <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
        {/* Left: Intro + details */}
        <div className="space-y-8">
          <div className="space-y-4">
            <h1 className="text-5xl font-bold tracking-tight">Contact Us</h1>
            <p className="text-muted-foreground max-w-[46ch]">
              We are available for questions, feedback, or collaboration opportunities.
              Let us know how we can help!
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Contact Details</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <span className="font-medium">Phone:</span> (123) 34567890
              </li>
              <li>
                <span className="font-medium">Email:</span>{" "}
                <a href="mailto:email@example.com" className="underline">
                  email@example.com
                </a>
              </li>
              <li>
                <span className="font-medium">Web:</span>{" "}
                <a
                  href="https://shadcnblocks.com"
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  shadcnblocks.com
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
            <form className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" placeholder="First Name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" placeholder="Last Name" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="Email" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input id="subject" placeholder="Subject" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea id="message" placeholder="Type your message here." className="min-h-32" />
              </div>

              <Button type="submit" className="w-full h-11 text-base">
                Send Message
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
