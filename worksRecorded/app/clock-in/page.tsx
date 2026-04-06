import { Suspense } from "react";
import ClockInClient from "./ClockInClient";

export default function ClockInPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center p-6">
          <div className="w-full max-w-md rounded-xl border p-6 space-y-4">
            <h1 className="text-xl font-semibold">Clock in</h1>
            <p className="text-sm text-muted-foreground">Loading clock-in page...</p>
          </div>
        </main>
      }
    >
      <ClockInClient />
    </Suspense>
  );
}
