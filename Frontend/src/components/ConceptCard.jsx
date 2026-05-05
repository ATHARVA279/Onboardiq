import React from 'react';
import { Target } from 'lucide-react';
import Card from './ui/Card';

export default function ConceptCard({ concept }) {
  const name = typeof concept === 'string' ? concept : concept.name || concept.title;
  const extractedAt = typeof concept === 'object' && concept.extracted_at
    ? new Date(concept.extracted_at).toLocaleDateString()
    : null;

  return (
    <Card hover className="group h-full flex flex-col justify-between p-5 border-zinc-800/50 hover:border-emerald-500/30">
      <div>
        <div className="flex justify-between items-start mb-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg group-hover:bg-emerald-500/20 transition-colors">
            <Target className="w-5 h-5 text-emerald-400" strokeWidth={2} />
          </div>
          {extractedAt && (
            <span className="text-xs text-zinc-500 font-mono">{extractedAt}</span>
          )}
        </div>

        <h3 className="text-lg font-semibold text-zinc-200 group-hover:text-emerald-300 transition-colors mb-2">
          {name}
        </h3>
      </div>

      <div className="flex items-center text-sm text-zinc-500 group-hover:text-emerald-400 transition-colors mt-4 font-medium">
        Extracted concept
      </div>
    </Card>
  );
}
