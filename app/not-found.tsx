import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="card p-8 max-w-md text-center">
        <p className="font-mono text-2xs uppercase tracking-[0.16em] text-muted mb-2">404</p>
        <h1 className="h-serif text-[22px] font-semibold">Nothing filed here.</h1>
        <p className="text-[13.5px] text-muted mt-2">
          The record may have been merged, or the link is stale.
        </p>
        <Link href="/" className="btn btn-primary mt-5 inline-flex">
          Back to My Day
        </Link>
      </div>
    </div>
  );
}
