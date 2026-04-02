import Link from "next/link";

const nav = [
  { href: "/", label: "Dashboard" },
  { href: "/today", label: "Today" },
  { href: "/goals", label: "Goals" },
  { href: "/settings", label: "Settings" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col px-6 py-10 pb-20 sm:px-8">
      <div className="mx-auto w-full max-w-4xl flex-1">
        <header className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-purple mb-2">
              Local tracker
            </p>
            <h1 className="text-3xl font-extrabold tracking-tight text-text sm:text-4xl">
              Goals <span className="text-purple">&</span> progress
            </h1>
          </div>
          <nav className="flex flex-wrap gap-2 font-mono text-[11px] uppercase tracking-wider">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded border border-border2 px-3 py-1.5 text-muted2 transition-colors hover:border-purple hover:text-purple"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>
        {children}
      </div>
    </div>
  );
}
