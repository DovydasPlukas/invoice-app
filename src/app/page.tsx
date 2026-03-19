import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-col justify-center h-full text-center gap-6 max-w-5xl mx-auto">
      <h1 className="text-5xl font-bold">Sąskaitos faktūra</h1>
      <p>
        <Button
          asChild
          className="px-6 py-4 text-sm font-medium flex items-center gap-2 transition-all duration-300 hover:scale-105 hover:shadow-md"
        >
          <Link href="/dashboard">Prisijungti</Link>
        </Button>
      </p>
    </main>
  );
}