import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-card-border bg-background">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center text-black font-bold text-xs">
                df
              </div>
              <span className="text-lg font-bold">
                De<span className="text-accent">Flaky</span>
              </span>
            </div>
            <p className="text-sm text-muted">
              Detect, track, and eliminate flaky tests. Open-source CLI + paid dashboard.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-semibold text-sm mb-3">Product</h4>
            <ul className="space-y-2 text-sm text-muted">
              <li><Link href="/#features" className="hover:text-foreground transition">Features</Link></li>
              <li><Link href="/pricing" className="hover:text-foreground transition">Pricing</Link></li>
              <li><Link href="/dashboard" className="hover:text-foreground transition">Dashboard</Link></li>
              <li><Link href="/docs" className="hover:text-foreground transition">CLI Docs</Link></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-semibold text-sm mb-3">Resources</h4>
            <ul className="space-y-2 text-sm text-muted">
              <li><Link href="/blog" className="hover:text-foreground transition">Blog</Link></li>
              <li><Link href="/changelog" className="hover:text-foreground transition">Changelog</Link></li>
              <li><a href="https://github.com/PramodDutta/deflaky" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition">GitHub</a></li>
              <li><a href="https://www.npmjs.com/package/deflaky-cli" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition">npm</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold text-sm mb-3">Legal</h4>
            <ul className="space-y-2 text-sm text-muted">
              <li><Link href="/privacy" className="hover:text-foreground transition">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-foreground transition">Terms of Service</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-card-border flex flex-col md:flex-row justify-between items-center gap-3 text-xs text-muted">
          <p>&copy; {new Date().getFullYear()} DeFlaky. Built by <a href="https://thetestingacademy.com" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition">The Testing Academy</a>.</p>
          <p>Made with flaky determination.</p>
        </div>
      </div>
    </footer>
  );
}
