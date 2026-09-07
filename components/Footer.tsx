import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-ink mt-12">
      <div className="max-w-5xl mx-auto px-6 py-14 grid sm:grid-cols-2 md:grid-cols-4 gap-10">
        <div>
          <div className="flex items-center gap-2.5">
            <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
              <path
                d="M9 3H21C22.1 3 23 3.9 23 5V19.5L16 25L9 19.5V5C9 3.9 9.9 3 11 3H9Z"
                fill="#F5F4EF"
              />
              <circle cx="16" cy="8.5" r="2.5" fill="#1C2531" />
            </svg>
            <span className="font-serif text-lg text-paper">CampusFind</span>
          </div>
          <p className="text-sm text-paper/60 mt-3 max-w-[220px]">
            A logged, matched, emailed record for everything lost and found
            on campus.
          </p>
        </div>

        <div>
          <h4 className="text-sm font-medium text-paper">Platform</h4>
          <ul className="mt-3 space-y-2 text-sm text-paper/60">
            <li>
              <Link href="/browse" className="hover:text-paper">
                Browse items
              </Link>
            </li>
            <li>
              <Link href="/report" className="hover:text-paper">
                Report an item
              </Link>
            </li>
            <li>
              <Link href="/my-reports" className="hover:text-paper">
                My reports
              </Link>
            </li>
            <li>
              <Link href="/admin" className="hover:text-paper">
                Admin portal
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-medium text-paper">Company</h4>
          <ul className="mt-3 space-y-2 text-sm text-paper/60">
            <li>
              <Link href="/about" className="hover:text-paper">
                About
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-paper">
                Contact
              </Link>
            </li>
            <li>
              <Link href="/help" className="hover:text-paper">
                Help
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-medium text-paper">Legal</h4>
          <ul className="mt-3 space-y-2 text-sm text-paper/60">
            <li>
              <Link href="/privacy" className="hover:text-paper">
                Privacy policy
              </Link>
            </li>
            <li>
              <Link href="/terms" className="hover:text-paper">
                Terms of service
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-paper/10">
        <div className="max-w-5xl mx-auto px-6 py-5 text-xs text-paper/50 flex flex-col sm:flex-row justify-between gap-2">
          <span>© {new Date().getFullYear()} CampusFind. All rights reserved.</span>
          <span>Every report, match and claim is logged and emailed for your records.</span>
        </div>
      </div>
    </footer>
  );
}
