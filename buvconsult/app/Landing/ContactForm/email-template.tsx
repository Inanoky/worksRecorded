// app/Landing/ContactForm/email-template.tsx
import * as React from "react";

export function EmailTemplate(props: {
  firstName: string;
  lastName: string;
  email: string;
  subject: string;
  message: string;
}) {
  const { firstName, lastName, email, subject, message } = props;
  return (
    <div style={{ fontFamily: "sans-serif", lineHeight: 1.5 }}>
      <h2>New contact form submission</h2>
      <p>
        <strong>From:</strong> {firstName} {lastName} &lt;{email}&gt;
      </p>
      <p>
        <strong>Subject:</strong> {subject}
      </p>
      <p style={{ whiteSpace: "pre-wrap" }}>{message}</p>
    </div>
  );
}
