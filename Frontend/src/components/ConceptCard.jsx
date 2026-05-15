import React from 'react';
import { Target } from 'lucide-react';
import Card from './ui/Card';

export default function ConceptCard({ concept }) {
  const name = typeof concept === 'string' ? concept : concept.name || concept.title;
  const extractedAt = typeof concept === 'object' && concept.extracted_at
    ? new Date(concept.extracted_at).toLocaleDateString()
    : null;

  return (
    <Card hover className="group h-full flex flex-col justify-between p-5 border-[var(--bg-hover)] bg-[var(--bg-surface)] hover:border-[var(--accent-primary)]/30">
      <div>
        <div className="flex justify-between items-start mb-3">
          <div className="p-2 bg-[var(--accent-muted)] rounded-lg group-hover:bg-[var(--accent-glow)] transition-colors">
            <Target className="w-5 h-5 text-[var(--accent-primary)]" strokeWidth={2} />
          </div>
          {extractedAt && (
            <span className="text-xs text-[var(--text-tertiary)] font-mono">{extractedAt}</span>
          )}
        </div>

        <h3 className="text-lg font-semibold text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors mb-2">
          {name}
        </h3>
      </div>

      <div className="flex items-center text-sm text-[var(--text-tertiary)] group-hover:text-[var(--accent-primary)] transition-colors mt-4 font-medium">
        Extracted concept
      </div>
    </Card>
  );
}
