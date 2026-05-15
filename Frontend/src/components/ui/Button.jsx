import React from 'react';
import { Loader2 } from 'lucide-react';

const variants = {
    primary: "bg-[var(--accent-primary)] text-[var(--bg-base)] hover:bg-[var(--accent-primary-hover)] border border-transparent shadow-sm",
    secondary: "bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--bg-hover)] hover:bg-[var(--bg-hover)] shadow-sm",
    ghost: "bg-transparent text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]",
    danger: "bg-[var(--status-high)]/10 text-[var(--status-high)] border border-[var(--status-high)]/20 hover:bg-[var(--status-high)]/20",
    gradient: "bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-primary-hover)] text-[var(--bg-base)] hover:opacity-90 shadow-lg shadow-[var(--accent-muted)] border border-transparent"
};

const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base"
};

export default function Button({
    children,
    variant = 'primary',
    size = 'md',
    className = '',
    loading = false,
    disabled = false,
    icon: Icon,
    ...props
}) {
    return (
        <button
            className={`
        inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
            disabled={disabled || loading}
            {...props}
        >
            {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
            ) : Icon ? (
                <Icon className="w-4 h-4" />
            ) : null}
            {children}
        </button>
    );
}
