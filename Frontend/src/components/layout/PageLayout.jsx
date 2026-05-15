import React from 'react';
import Navbar from './Navbar';

export default function PageLayout({ children, className = '' }) {
    return (
        <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] font-sans selection:bg-[var(--accent-muted)]">
            <Navbar />
            <main className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 ${className}`}>
                {children}
            </main>
        </div>
    );
}
