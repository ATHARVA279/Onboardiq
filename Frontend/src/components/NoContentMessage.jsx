import { Link } from "react-router-dom";
import { Lock, Home, ArrowRight } from "lucide-react";
import Button from "./ui/Button";
import Card from "./ui/Card";

export default function NoContentMessage({ feature = "this feature" }) {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="max-w-2xl mx-auto text-center">
        <Card className="p-12 border-[var(--bg-hover)] bg-[var(--bg-surface)]/50">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-primary-hover)] flex items-center justify-center mx-auto mb-6 shadow-lg shadow-[var(--accent-glow)]">
            <Lock className="w-10 h-10 text-[var(--bg-base)]" />
          </div>
          <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-4 tracking-tight">
            Content Not Found
          </h2>
          <p className="text-[var(--text-secondary)] text-lg">
            You need to extract content first before using {feature}.
          </p>
          <div className="space-y-6">
            <p className="text-[var(--text-tertiary)] text-sm py-4">
              Extract content from any article, documentation, or educational website to unlock all AI-powered learning features.
            </p>
            <Link to="/new">
              <Button variant="gradient" size="lg" className="w-full sm:w-auto">
                <Home className="w-5 h-5 mr-2" />
                Go to Extract Content
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </Card>

        <div className="mt-8 text-[var(--text-tertiary)] text-sm">
              <p className="mb-2 font-medium text-[var(--text-secondary)]">Quick Start:</p>
          <ol className="text-left max-w-xs mx-auto space-y-2">
            <li className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-[var(--bg-hover)] flex items-center justify-center text-xs font-bold text-[var(--accent-primary)]">1</span>
              Go to extract page
            </li>
            <li className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-[var(--bg-hover)] flex items-center justify-center text-xs font-bold text-[var(--accent-primary)]">2</span>
              Enter any educational URL
            </li>
            <li className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-[var(--bg-hover)] flex items-center justify-center text-xs font-bold text-[var(--accent-primary)]">3</span>
              Click "Extract & Learn"
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
