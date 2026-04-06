"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function ClockInClient() {
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);

  const [status, setStatus] = useState<string>("Press button to share GPS and clock in.");
  const [busy, setBusy] = useState(false);

  const handleClockIn = async () => {
    if (!token) {
      setStatus("Invalid clock-in link.");
      return;
    }

    if (!navigator.geolocation) {
      setStatus("Geolocation is not available on this device/browser.");
      return;
    }

    setBusy(true);
    setStatus("Getting GPS location...");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          setStatus("Validating location...");
          const res = await fetch("/api/clock-in/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              token,
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            }),
          });

          const data = await res.json().catch(() => null);
          setStatus(data?.message || "Unexpected response.");

          if (res.ok && data?.ok && typeof data?.redirectUrl === "string") {
            setTimeout(() => {
              window.location.href = data.redirectUrl;
            }, 1200);
          }
        } catch {
          setStatus("Could not reach server. Please try again.");
        } finally {
          setBusy(false);
        }
      },
      (err) => {
        setBusy(false);
        setStatus(`Failed to get location: ${err.message}`);
      },
      {
        enableHighAccuracy: true,
        timeout: 20_000,
      }
    );
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border p-6 space-y-4">
        <h1 className="text-xl font-semibold">Clock in</h1>
        <p className="text-sm text-muted-foreground">{status}</p>
        <button
          type="button"
          onClick={handleClockIn}
          disabled={busy}
          className="w-full rounded-lg bg-black text-white py-2 disabled:opacity-60"
        >
          {busy ? "Working..." : "Clock in now"}
        </button>
      </div>
    </main>
  );
}
