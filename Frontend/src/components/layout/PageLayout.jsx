import React from 'react';
import Navbar from './Navbar';

export default function PageLayout({ children, className = '' }) {
    return (
        <div className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-emerald-500/30">
            <Navbar />
            <main className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 ${className}`}>
                {children}
            </main>
        </div>
    );
}
