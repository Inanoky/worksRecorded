// app/api/contact/route.ts
import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { Resend } from "resend";
import { EmailTemplate } from "@/app/Landing/ContactForm/email-template";

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
  const t = () => new Date().toISOString();

  try {
    console.log(`[${t()}] [/api/contact] Incoming request`);

    // Basic env sanity check (don’t log actual key)
    console.log(
      `[${t()}] [/api/contact] RESEND_API_KEY present:`,
      Boolean(process.env.RESEND_API_KEY)
    );

    // Read JSON
    const body = await req.json();
    console.log(`[${t()}] [/api/contact] Raw body:`, body);

    // Validate
    const parsed = ContactSchema.parse(body);
    console.log(`[${t()}] [/api/contact] Parsed + validated:`, {
      firstName: parsed.firstName,
      lastName: parsed.lastName,
      email: parsed.email,
      subject: parsed.subject,
      // don't log message content in prod; here we show length only
      messageLength: parsed.message?.length ?? 0,
      hasHoneypot: Boolean(parsed.hp && parsed.hp.length > 0),
    });

    // Honeypot check
    if (parsed.hp && parsed.hp.length > 0) {
      console.log(`[${t()}] [/api/contact] Honeypot triggered — bot likely. Silently accepting.`);
      return NextResponse.json({ ok: true });
    }

    // Prepare email
    const { firstName, lastName, email, subject, message } = parsed;
    console.log(`[${t()}] [/api/contact] Sending email via Resend...`, {
      to: "hello@buvconsult.com",
      from: "Acme <onboarding@resend.dev>", // NOTE: replace with your verified domain in prod
      replyTo: email,
      subject: `[Contact] ${subject}`,
    });

    const { data, error } = await resend.emails.send({
      from: "Acme <onboarding@resend.dev>", // replace with "BUVCONSULT <noreply@buvconsult.com>" in prod
      to: ["hello@buvconsult.com"],
      replyTo: email,
      subject: `[Contact] ${subject}`,
      react: EmailTemplate({ firstName, lastName, email, subject, message }),
    });

    if (error) {
      console.error(`[${t()}] [/api/contact] Resend error:`, error);
      return NextResponse.json({ error }, { status: 500 });
    }

    console.log(`[${t()}] [/api/contact] Email sent OK. Resend id:`, data?.id);
    return NextResponse.json({ ok: true, id: data?.id });
  } catch (err) {
    if (err instanceof ZodError) {
      console.warn(`[${t()}] [/api/contact] Validation failed:`, err.flatten());
      return NextResponse.json(
        { error: "Validation failed", issues: err.flatten() },
        { status: 400 }
      );
    }
    console.error(`[${t()}] [/api/contact] Unhandled error:`, err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
