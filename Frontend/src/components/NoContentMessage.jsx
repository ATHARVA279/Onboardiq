import { Link } from "react-router-dom";
import { Lock, Home, ArrowRight } from "lucide-react";
import Button from "./ui/Button";
import Card from "./ui/Card";

export default function NoContentMessage({ feature = "this feature" }) {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="max-w-2xl mx-auto text-center">
        <Card className="p-12 border-emerald-500/20 bg-zinc-900/50">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/30">
            <Lock className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-zinc-100 mb-4 tracking-tight">
            Content Not Found
          </h2>
          <p className="text-zinc-400 text-lg">
            You need to extract content first before using {feature}.
          </p>
          <div className="space-y-6">
            <p className="text-zinc-500 text-sm py-4">
              Extract content from any article, documentation, or educational website to unlock all AI-powered learning features.
            </p>
            <Link to="/">
              <Button variant="gradient" size="lg" className="w-full sm:w-auto">
                <Home className="w-5 h-5 mr-2" />
                Go to Home & Extract Content
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </Card>

        <div className="mt-8 text-zinc-500 text-sm">
          <p className="mb-2 font-medium text-zinc-400">💡 Quick Start:</p>
          <ol className="text-left max-w-xs mx-auto space-y-2">
            <li className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center text-xs">1</span>
              Go to Home page
            </li>
            <li className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center text-xs">2</span>
              Enter any educational URL
            </li>
            <li className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center text-xs">3</span>
              Click "Extract & Learn"
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
