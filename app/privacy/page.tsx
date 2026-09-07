export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <h1 className="font-serif text-3xl text-ink">Privacy policy</h1>
      <p className="text-ink-soft mt-4 leading-relaxed">
        CampusFind collects the information you provide when reporting a
        lost or found item — a description, location, date, colour, and
        an optional photo — along with your university email for sign-in
        and match notifications.
      </p>
      <h2 className="font-serif text-xl text-ink mt-8">What we store</h2>
      <p className="text-ink-soft mt-2 leading-relaxed">
        Report details, uploaded photos, and a log of actions taken on
        your reports (created, matched, claimed) so there's a record if a
        claim is ever disputed. Row-level security ensures only you and
        campus admins can see who filed a given report.
      </p>
      <h2 className="font-serif text-xl text-ink mt-8">
        What we don't do
      </h2>
      <p className="text-ink-soft mt-2 leading-relaxed">
        We don't sell or share report data with third parties, and we
        don't use it for anything beyond matching and notifying you about
        your own items.
      </p>
      <p className="text-ink-soft mt-8 text-sm">
        This is a placeholder policy for a student project. A production
        deployment should have this reviewed against your institution's
        actual data-handling requirements.
      </p>
    </div>
  );
}
