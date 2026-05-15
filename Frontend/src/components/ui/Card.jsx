import React from 'react';

export default function Card({ children, className = '', hover = false, padding = 'p-6', ...props }) {
    return (
        <div
            className={`
        bg-[var(--bg-surface)] border border-[var(--bg-hover)] rounded-xl ${padding}
        ${hover ? 'hover:border-[var(--accent-primary)] hover:bg-[var(--bg-hover)] transition-all duration-300 shadow-xl shadow-black/40' : ''}
        ${className}
      `}
            {...props}
        >
            {children}
        </div>
    );
}
