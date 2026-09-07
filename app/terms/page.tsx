export default function TermsPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <h1 className="font-serif text-3xl text-ink">Terms of service</h1>
      <p className="text-ink-soft mt-4 leading-relaxed">
        By using CampusFind, you agree to report items honestly and to
        only claim items that genuinely belong to you. False reports or
        fraudulent claims may be logged and referred to campus
        administration.
      </p>
      <h2 className="font-serif text-xl text-ink mt-8">Matching</h2>
      <p className="text-ink-soft mt-2 leading-relaxed">
        Match suggestions are generated automatically and reviewed by an
        admin before any contact is made between parties. CampusFind
        doesn't guarantee a match will be found, or that a found item
        will be returned.
      </p>
      <h2 className="font-serif text-xl text-ink mt-8">Account access</h2>
      <p className="text-ink-soft mt-2 leading-relaxed">
        You're responsible for keeping access to your university email
        secure, since sign-in codes are sent there.
      </p>
      <p className="text-ink-soft mt-8 text-sm">
        This is a placeholder for a student project and not binding legal
        text. A production deployment should have this drafted or
        reviewed by someone qualified to do so.
      </p>
    </div>
  );
}
