"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function ClockInClient() {
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);

  const [status, setStatus] = useState<string>("Press button to share GPS and clock in.");
  const [busy, setBusy] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [challengeId, setChallengeId] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    const initChallenge = async () => {
      if (!token) {
        setStatus("Invalid clock-in link.");
        setInitializing(false);
        return;
      }

      try {
        const res = await fetch("/api/clock-in/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json().catch(() => null);
        if (!cancelled) {
          if (!res.ok || !data?.challengeId) {
            setStatus(data?.message || "Could not initialize clock-in session.");
            return;
          }
          setChallengeId(data.challengeId);
        }
      } catch {
        if (!cancelled) {
          setStatus("Could not initialize clock-in session.");
        }
      } finally {
        if (!cancelled) {
          setInitializing(false);
        }
      }
    };

    initChallenge();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleClockIn = async () => {
    if (!token) {
      setStatus("Invalid clock-in link.");
      return;
    }
    if (!challengeId) {
      setStatus("Clock-in session is missing. Reopen the link from WhatsApp.");
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
              challengeId,
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
          disabled={busy || initializing || !challengeId}
          className="w-full rounded-lg bg-black text-white py-2 disabled:opacity-60"
        >
          {initializing ? "Preparing..." : busy ? "Working..." : "Clock in now"}
        </button>
      </div>
    </main>
  );
}
