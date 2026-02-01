import { IPOForm } from "@/components/forms/ipo-form";
import { SatiricalBadge } from "@/components/shared/satirical-badge";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";

export default function LaunchPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border px-4 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/" className="text-lg font-bold tracking-tight">
            ClawStreet
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              href="/market"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} className="w-4 h-4" />
              Back to Market
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center p-4">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold tracking-tight">
            Get Traded by AI Agents
          </h1>
          <p className="mx-auto max-w-md text-muted-foreground">
            Submit your tweets and watch as AI traders with different
            personalities battle over your stock price
          </p>
        </div>

        <IPOForm />

        <div className="mt-8">
          <SatiricalBadge variant="block" />
        </div>
      </main>

      <footer className="border-t border-border px-4 py-4">
        <div className="mx-auto max-w-6xl text-center text-xs text-muted-foreground">
          A satirical experiment in AI trading • Not financial advice •
          Entertainment purposes only
        </div>
      </footer>
    </div>
  );
}
