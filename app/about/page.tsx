export default function AboutPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <h1 className="font-serif text-3xl text-ink">About CampusFind</h1>
      <p className="text-ink-soft mt-4 leading-relaxed">
        CampusFind started from a simple observation: most campus lost
        property still lives in a cardboard box at a front desk, tracked
        by memory rather than by record. Nothing is searchable, nothing
        is matched automatically, and there's no proof trail if a claim
        is ever disputed.
      </p>
      <p className="text-ink-soft mt-4 leading-relaxed">
        We built CampusFind to replace that box with a system: every
        report, every match, and every claim is logged and confirmed by
        email, and a matching engine does the work of comparing lost and
        found items so students don't have to scroll through a physical
        shelf.
      </p>
      <p className="text-ink-soft mt-4 leading-relaxed">
        The platform is designed to be run by a single admin team per
        campus, with students accessing it directly — no extra software,
        no separate accounts to manage.
      </p>
    </div>
  );
}
