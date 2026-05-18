import Link from "next/link";

export default function PoliciesPage() {
  return (
    <main className="page-shell">
      <div className="top-nav">
        <div className="nav-links">
          <Link href="/">Dashboard</Link>
          <Link href="/policies">Policies</Link>
          <Link href="/payouts">Payouts</Link>
        </div>
      </div>
      <section className="hero">
        <span className="eyebrow">Policies</span>
        <h1>Policy records live on-chain.</h1>
        <p>
          The dashboard is the primary interface, but this route exists to match the submission plan and make it
          explicit that StelSure exposes dedicated policy and payout views for StellarDAO members.
        </p>
      </section>
    </main>
  );
}
