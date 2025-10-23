import { z } from "zod";

export const ContactSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email"),
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(1, "Message is required"),
  hp: z.string().optional(), // honeypot
});

export type ContactInput = z.infer<typeof ContactSchema>;