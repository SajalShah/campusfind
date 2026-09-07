const FAQS = [
  {
    q: "How do I report something I lost or found?",
    a: "Sign in with your university email, then go to Report an item. Pick lost or found, fill in a category, description, location and date — a photo is optional.",
  },
  {
    q: "How does matching work?",
    a: "Every new report is compared against open reports of the opposite type, scored on category, description, location, date and colour. Likely matches go to an admin for confirmation before either party is contacted.",
  },
  {
    q: "I got a code by email but it's not working",
    a: "Codes expire after a few minutes — go back to Sign in and request a new one. Make sure you're entering the most recent code sent.",
  },
  {
    q: "How do I know if my report was actually saved?",
    a: "Check My reports — it should appear there immediately. You'll also get an email confirmation with your claim ticket reference.",
  },
];

export default function HelpPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <h1 className="font-serif text-3xl text-ink">Help</h1>
      <p className="text-ink-soft mt-3">
        Common questions about reporting, matching, and signing in.
      </p>

      <div className="mt-8 space-y-6">
        {FAQS.map((f) => (
          <div key={f.q} className="border-l-2 border-brass pl-5">
            <h3 className="font-medium text-ink">{f.q}</h3>
            <p className="text-ink-soft text-sm mt-1.5">{f.a}</p>
          </div>
        ))}
      </div>

      <p className="text-ink-soft text-sm mt-10">
        Still stuck?{" "}
        <a href="/contact" className="text-ink underline hover:text-brass">
          Contact us
        </a>{" "}
        and we'll help directly.
      </p>
    </div>
  );
}
