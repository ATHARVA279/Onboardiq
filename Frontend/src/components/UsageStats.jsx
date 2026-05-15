import React, { useEffect, useState } from 'react';
import { Zap, TrendingUp, Calendar, AlertCircle, Sparkles } from 'lucide-react';
import api from '../api/backend';
import Card from './ui/Card';
import Badge from './ui/Badge';
import Button from './ui/Button';

export default function UsageStats({ stats: propStats }) {
    const [stats, setStats] = useState(propStats);
    const [loading, setLoading] = useState(!propStats);

    useEffect(() => {
        if (propStats) {
            setStats(propStats);
            setLoading(false);
        } else {
            fetchStats();
        }
    }, [propStats]);

    const fetchStats = async () => {
        try {
            const res = await api.get('/auth/me');
            setStats(res.data);
        } catch (error) {
            console.error("Failed to fetch stats", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="animate-pulse h-64 bg-[var(--bg-surface)]/50 rounded-xl border border-[var(--bg-hover)]" />;

    if (!stats) return null;

    const credits = stats.credits || 0;
    const maxCredits = 100;
    const percentage = Math.min(100, (credits / maxCredits) * 100);

    // Determine colors based on percentage
    let gradientFrom = "var(--status-success)";
    let gradientTo = "var(--accent-primary)";
    let bgGlow = "var(--status-success)";
    let textColor = "var(--status-success)";
    let borderColor = "var(--status-success)";

    if (percentage < 20) {
        gradientFrom = "var(--status-high)";
        gradientTo = "#EF4444";
        bgGlow = "var(--status-high)";
        textColor = "var(--status-high)";
        borderColor = "var(--status-high)";
    } else if (percentage < 50) {
        gradientFrom = "var(--status-medium)";
        gradientTo = "var(--accent-primary)";
        bgGlow = "var(--status-medium)";
        textColor = "var(--status-medium)";
        borderColor = "var(--status-medium)";
    }

    return (
        <Card padding="p-4" className="border-[var(--bg-hover)] bg-gradient-to-br from-[var(--bg-surface)] to-[var(--bg-base)] backdrop-blur-sm">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl border transition-colors`} style={{ backgroundColor: `${bgGlow}10`, borderColor: `${borderColor}30` }}>
                        <Zap className={`w-5 h-5`} style={{ color: textColor }} fill="currentColor" />
                    </div>
                    <div>
                        <h3 className="text-base font-semibold text-[var(--text-primary)]">Credits Balance</h3>
                        <p className="text-xs text-[var(--text-tertiary)] mt-0.5">Your monthly allowance</p>
                    </div>
                </div>
            </div>

            {/* Credit Display */}
            <div className="mb-6">
                <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-4xl font-bold bg-gradient-to-r bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(to right, ${gradientFrom}, ${gradientTo})` }}>
                        {credits}
                    </span>
                    <span className="text-[var(--text-tertiary)] text-lg font-medium">/ {maxCredits}</span>
                </div>

                {/* Progress Bar */}
                <div className="relative w-full bg-[var(--bg-hover)] rounded-full h-3 overflow-hidden shadow-inner">
                    <div
                        className="h-full rounded-full transition-all duration-700 ease-out relative"
                        style={{ 
                            width: `${percentage}%`,
                            backgroundImage: `linear-gradient(to right, ${gradientFrom}, ${gradientTo})`
                        }}
                    >
                        <div className="absolute inset-0 bg-white/10 animate-pulse" />
                    </div>
                </div>
                <p className="text-xs text-[var(--text-tertiary)] mt-2">{percentage.toFixed(0)}% remaining</p>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3.5 rounded-lg bg-[var(--bg-base)]/60 border border-[var(--bg-hover)] hover:border-[var(--accent-primary)]/30 transition-colors">
                    <div className="flex items-center gap-2 mb-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[var(--status-success)]" />
                        <span className="text-xs text-[var(--text-tertiary)] font-medium">Plan</span>
                    </div>
                    <span className="text-sm font-semibold text-[var(--text-secondary)] capitalize">{stats.plan || "Free"}</span>
                </div>
                <div className="p-3.5 rounded-lg bg-[var(--bg-base)]/60 border border-[var(--bg-hover)] hover:border-[var(--accent-primary)]/30 transition-colors">
                    <div className="flex items-center gap-2 mb-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[var(--status-high)]" />
                        <span className="text-xs text-[var(--text-tertiary)] font-medium">Resets In</span>
                    </div>
                    <span className="text-sm font-semibold text-[var(--text-secondary)]">{stats.days_until_reset || 30} Days</span>
                </div>
            </div>

            {/* Low Credit Warning */}
            {credits < 20 && (
                <div className="p-3.5 rounded-lg border flex items-start gap-3 animate-pulse" style={{ backgroundColor: `${bgGlow}10`, borderColor: `${borderColor}30` }}>
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: textColor }} />
                    <div className="flex-1">
                        <p className="text-xs font-medium leading-relaxed" style={{ color: textColor }}>
                            {credits < 10
                                ? "Critical: Running very low on credits. Consider upgrading to continue learning."
                                : "Credits running low. Upgrade to Pro for unlimited access."}
                        </p>
                    </div>
                </div>
            )}
        </Card>
    );
}
