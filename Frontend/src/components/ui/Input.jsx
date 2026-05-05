import React from 'react';

export default function Input({ className = '', error, ...props }) {
    return (
        <div className="w-full">
            <input
                className={`
          w-full bg-zinc-900/50 text-zinc-100 border rounded-lg px-4 py-2.5 outline-none transition-all
          placeholder:text-zinc-600
          ${error
                        ? 'border-red-500/50 focus:border-red-500 focus:ring-1 focus:ring-red-500/50'
                        : 'border-zinc-800 focus:border-zinc-600 focus:ring-1 focus:ring-zinc-700/50'
                    }
          ${className}
        `}
                {...props}
            />
            {error && (
                <p className="mt-1 text-xs text-red-400">{error}</p>
            )}
        </div>
    );
}
