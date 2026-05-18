import Link from "next/link";

export default function PayoutsPage() {
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
        <span className="eyebrow">Payouts</span>
        <h1>Automated settlement history.</h1>
        <p>
          StelSure settles from the prefunded vault and then surfaces those payout events through the live dashboard
          and this dedicated history route.
        </p>
      </section>
    </main>
  );
}
