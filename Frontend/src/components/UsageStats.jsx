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

    if (loading) return <div className="animate-pulse h-64 bg-zinc-900/50 rounded-xl border border-zinc-800" />;

    if (!stats) return null;

    const credits = stats.credits || 0;
    const maxCredits = 100;
    const percentage = Math.min(100, (credits / maxCredits) * 100);

    // Determine color based on percentage
    let gradientColor = "from-emerald-500 to-teal-500";
    let bgGlow = "bg-emerald-500/10";
    let textColor = "text-emerald-400";
    let borderColor = "border-emerald-500/20";

    if (percentage < 20) {
        gradientColor = "from-red-500 to-rose-500";
        bgGlow = "bg-red-500/10";
        textColor = "text-red-400";
        borderColor = "border-red-500/20";
    } else if (percentage < 50) {
        gradientColor = "from-amber-500 to-orange-500";
        bgGlow = "bg-amber-500/10";
        textColor = "text-amber-400";
        borderColor = "border-amber-500/20";
    }

    return (
        <Card padding="p-4" className="border-zinc-800 bg-gradient-to-br from-zinc-900/50 to-zinc-900/30 backdrop-blur-sm">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${bgGlow} border ${borderColor}`}>
                        <Zap className={`w-5 h-5 ${textColor}`} fill="currentColor" />
                    </div>
                    <div>
                        <h3 className="text-base font-semibold text-zinc-100">Credits Balance</h3>
                        <p className="text-xs text-zinc-500 mt-0.5">Your monthly allowance</p>
                    </div>
                </div>
            </div>

            {/* Credit Display */}
            <div className="mb-6">
                <div className="flex items-baseline gap-2 mb-3">
                    <span className={`text-4xl font-bold bg-gradient-to-r ${gradientColor} bg-clip-text text-transparent`}>
                        {credits}
                    </span>
                    <span className="text-zinc-500 text-lg font-medium">/ {maxCredits}</span>
                </div>

                {/* Progress Bar */}
                <div className="relative w-full bg-zinc-800/80 rounded-full h-3 overflow-hidden shadow-inner">
                    <div
                        className={`h-full bg-gradient-to-r ${gradientColor} rounded-full transition-all duration-700 ease-out relative`}
                        style={{ width: `${percentage}%` }}
                    >
                        <div className="absolute inset-0 bg-white/20 animate-pulse" />
                    </div>
                </div>
                <p className="text-xs text-zinc-500 mt-2">{percentage.toFixed(0)}% remaining</p>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3.5 rounded-lg bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 transition-colors">
                    <div className="flex items-center gap-2 mb-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-xs text-zinc-500 font-medium">Plan</span>
                    </div>
                    <span className="text-sm font-semibold text-zinc-200 capitalize">{stats.plan || "Free"}</span>
                </div>
                <div className="p-3.5 rounded-lg bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 transition-colors">
                    <div className="flex items-center gap-2 mb-1.5">
                        <Calendar className="w-3.5 h-3.5 text-red-400" />
                        <span className="text-xs text-zinc-500 font-medium">Resets In</span>
                    </div>
                    <span className="text-sm font-semibold text-zinc-200">{stats.days_until_reset || 30} Days</span>
                </div>
            </div>

            {/* Low Credit Warning */}
            {credits < 20 && (
                <div className={`p-3.5 rounded-lg ${bgGlow} border ${borderColor} flex items-start gap-3 animate-pulse`}>
                    <AlertCircle className={`w-4 h-4 ${textColor} flex-shrink-0 mt-0.5`} />
                    <div className="flex-1">
                        <p className={`text-xs font-medium ${textColor.replace('400', '300')} leading-relaxed`}>
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
