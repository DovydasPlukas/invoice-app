"use client";

import { useEffect } from "react";
import Container from "@/components/Container";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Dashboard Error]", error);
  }, [error]);

  return (
    <main className="h-full">
      <Container>
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
          <h2 className="text-2xl font-semibold text-red-600">
            Nepavyko įkelti sąskaitų faktūrų
          </h2>
          <p className="text-slate-500 max-w-md">
            Įvyko klaida bandant gauti duomenis iš duomenų bazės. Patikrinkite
            ryšį ir bandykite dar kartą.
          </p>
          {error.message && (
            <p className="text-xs text-slate-400 font-mono bg-slate-100 px-3 py-2 rounded max-w-lg break-all">
              {error.message}
            </p>
          )}
          <Button onClick={reset} variant="outline">
            Bandyti dar kartą
          </Button>
        </div>
      </Container>
    </main>
  );
}
