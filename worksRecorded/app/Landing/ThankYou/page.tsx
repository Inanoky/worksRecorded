"use client";
import { useEffect } from "react";

export default function ThankYouPage() {
  useEffect(() => {
    // Fire once when the page is shown
    window.gtag?.("event", "conversion", {
      send_to: "AW-17670426077/3OXOCMXV7rUbEN2b9elB",
    });
  }, []);

  return <div>Thanks! We received your request.</div>;
}