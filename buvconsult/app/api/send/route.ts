// app/api/contact/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { Resend } from "resend";
import { EmailTemplate } from "@/app/Landing/ContactForm/email-template"; // your path

const ContactSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  subject: z.string().min(1),
  message: z.string().min(1),
  hp: z.string().optional(), // honeypot
});

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = ContactSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // bot trap
    if (parsed.data.hp && parsed.data.hp.length > 0) {
      return NextResponse.json({ ok: true });
    }

    const { firstName, lastName, email, subject, message } = parsed.data;

    const { data, error } = await resend.emails.send({
      from: "BUVCONSULT <noreply@buvconsult.com>", // use your verified domain
      to: ["hello@buvconsult.com"],                   // where you receive leads
      replyTo: email,
      subject: `[Contact] ${subject}`,
      react: EmailTemplate({
        firstName,
        lastName,
        email,
        subject,
        message,
      }),
    });

    if (error) return NextResponse.json({ error }, { status: 500 });
    return NextResponse.json({ ok: true, id: data?.id });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
