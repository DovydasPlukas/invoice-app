"use client";

import { useEffect } from "react";
import Link from "next/link";
import Container from "@/components/Container";
import { Button } from "@/components/ui/button";

export default function InvoiceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Invoice Error]", error);
  }, [error]);

  return (
    <main className="h-full">
      <Container>
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
          <h2 className="text-2xl font-semibold text-red-600">
            Sąskaita faktūra nerasta arba įvyko klaida
          </h2>
          <p className="text-slate-500 max-w-md">
            Nepavyko įkelti šios sąskaitos faktūros. Ji gali neegzistuoti arba
            įvyko duomenų bazės klaida.
          </p>
          {error.message && (
            <p className="text-xs text-slate-400 font-mono bg-slate-100 px-3 py-2 rounded max-w-lg break-all">
              {error.message}
            </p>
          )}
          <div className="flex gap-3">
            <Button onClick={reset} variant="outline">
              Bandyti dar kartą
            </Button>
            <Button asChild>
              <Link href="/dashboard">Grįžti į skydelį</Link>
            </Button>
          </div>
        </div>
      </Container>
    </main>
  );
}
