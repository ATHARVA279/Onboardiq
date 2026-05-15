import React from 'react';

export default function Input({ className = '', error, ...props }) {
    return (
        <div className="w-full">
            <input
                className={`
          w-full bg-bg-surface text-text-primary border rounded-lg px-4 py-2.5 outline-none transition-all
          placeholder:text-text-tertiary
          ${error
                        ? 'border-status-high/50 focus:border-status-high focus:ring-1 focus:ring-status-high/50'
                        : 'border-border-default focus:border-accent-primary focus:ring-1 focus:ring-accent-muted'
                    }
          ${className}
        `}
                {...props}
            />
            {error && (
                <p className="mt-1 text-xs text-status-high">{error}</p>
            )}
        </div>
    );
}
