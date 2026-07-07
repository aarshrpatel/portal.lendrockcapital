"use client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="card p-8 max-w-md text-center">
        <p className="font-mono text-2xs uppercase tracking-[0.16em] text-oxide mb-2">Something broke</p>
        <h1 className="h-serif text-[22px] font-semibold">That didn&apos;t work.</h1>
        <p className="text-[13.5px] text-muted mt-2 leading-relaxed">
          The error is logged{error.digest ? <> (ref <span className="font-mono text-[12px]">{error.digest}</span>)</> : null}.
          Your data is safe — nothing half-committed.
        </p>
        <button onClick={reset} className="btn btn-primary mt-5">
          Try again
        </button>
      </div>
    </div>
  );
}
