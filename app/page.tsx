import Link from "next/link";

const FEATURES = [
  {
    title: "Passwordless, logged sign-in",
    body: "Email OTP replaces the password box entirely — a 6-digit code, every sign-in recorded.",
  },
  {
    title: "Weighted matching engine",
    body: "Category, description, location, date and colour, each scored and combined into one confidence number.",
  },
  {
    title: "Photos are optional",
    body: "A good description is enough to start a match. Add a photo when you have one, skip it when you don't.",
  },
  {
    title: "Every action, emailed",
    body: "Reports, matches and claims are logged and confirmed by email — a record that outlives the front-desk box.",
  },
];

export default function HomePage() {
  return (
    <div>
      <div className="max-w-5xl mx-auto px-6">
        <section className="py-20 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h1 className="font-serif text-5xl leading-tight text-ink">
              Lost it on campus?
              <br />
              Log it. Match it. Get it back.
            </h1>
            <p className="mt-6 text-ink-soft text-lg max-w-md">
              CampusFind replaces the front-desk lost-property box with a
              record that never gets buried: report an item in two minutes,
              and every step — from report to match to claim — is
              timestamped and emailed to you as proof.
            </p>
            <div className="mt-8 flex gap-4">
              <Link
                href="/report"
                className="bg-lost text-paper px-5 py-3 rounded-tag font-medium hover:bg-lost/90 focus-ring"
              >
                Report a lost item
              </Link>
              <Link
                href="/browse"
                className="border border-ink px-5 py-3 rounded-tag font-medium hover:bg-ink hover:text-paper focus-ring"
              >
                Browse found items
              </Link>
            </div>
          </div>

          <div className="ticket ml-4 p-6">
            <p className="text-xs text-ink-soft tracking-wide">
              CLAIM TICKET · CF-00184
            </p>
            <div className="ticket-perforation my-4" />
            <p className="font-serif text-2xl text-ink">Grey water bottle</p>
            <p className="text-sm text-ink-soft mt-1">
              Found near Building 5, Level 2
            </p>
            <p className="mt-4 inline-block bg-found-soft text-found text-xs font-medium px-2 py-1 rounded-tag">
              Match confirmed — emailed to owner
            </p>
          </div>
        </section>
      </div>

      <div className="border-y border-line bg-white/60 py-6">
        <div className="max-w-5xl mx-auto px-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-2 text-sm text-ink-soft">
          <span>Built on</span>
          <span className="font-medium text-ink">Next.js</span>
          <span className="font-medium text-ink">Supabase</span>
          <span className="font-medium text-ink">Vercel</span>
          <span className="hidden sm:inline">·</span>
          <span>Row-level security enforced at the database</span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6">
        <section className="py-16 grid sm:grid-cols-2 gap-x-10 gap-y-10">
          {FEATURES.map((f) => (
            <div key={f.title} className="border-l-2 border-brass pl-5">
              <h3 className="font-medium text-ink">{f.title}</h3>
              <p className="text-ink-soft text-sm mt-1.5">{f.body}</p>
            </div>
          ))}
        </section>

        <section className="py-16 border-t border-line grid md:grid-cols-3 gap-8">
          <div>
            <p className="font-serif text-3xl text-brass">1</p>
            <h3 className="font-medium mt-2 text-ink">Report</h3>
            <p className="text-ink-soft text-sm mt-1">
              Describe what you lost or found. A photo is optional, not
              required — a good description is enough to start a match.
            </p>
          </div>
          <div>
            <p className="font-serif text-3xl text-brass">2</p>
            <h3 className="font-medium mt-2 text-ink">Match</h3>
            <p className="text-ink-soft text-sm mt-1">
              The matching engine scores every lost/found pair on category,
              description, location, date and colour, and flags likely
              matches for an admin to confirm.
            </p>
          </div>
          <div>
            <p className="font-serif text-3xl text-brass">3</p>
            <h3 className="font-medium mt-2 text-ink">Claim</h3>
            <p className="text-ink-soft text-sm mt-1">
              Once confirmed, both parties get an emailed record — a
              timestamped proof trail if a dispute ever comes up later.
            </p>
          </div>
        </section>
      </div>

      <div className="bg-brass py-14 mt-4">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="font-serif text-2xl text-ink">
              Ready to retire the lost-property box?
            </h2>
            <p className="text-ink/70 text-sm mt-1">
              Set up CampusFind for your campus in an afternoon.
            </p>
          </div>
          <Link
            href="/login"
            className="bg-ink text-paper px-6 py-3 rounded-tag font-medium hover:bg-ink/90 focus-ring whitespace-nowrap"
          >
            Get started
          </Link>
        </div>
      </div>
    </div>
  );
}
