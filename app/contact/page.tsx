export default function ContactPage() {
  return (
    <div className="max-w-xl mx-auto px-6 py-16">
      <h1 className="font-serif text-3xl text-ink">Contact us</h1>
      <p className="text-ink-soft mt-4">
        Questions about a report, a match, or setting CampusFind up for
        your campus — reach out and we'll get back to you.
      </p>
      <div className="mt-8 ticket p-6 ml-4">
        <p className="text-sm text-ink-soft">Email</p>
        <a
          href="mailto:hello@campusfind.app"
          className="text-ink font-medium hover:text-brass"
        >
          hello@campusfind.app
        </a>
        <div className="ticket-perforation my-4" />
        <p className="text-sm text-ink-soft">
          For urgent claim disputes, include your report reference number
          (the CF-XXXXX code shown on your ticket) so we can pull up the
          audit trail directly.
        </p>
      </div>
    </div>
  );
}
