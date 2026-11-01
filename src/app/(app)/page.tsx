'use client';

import React, { useEffect, useState } from 'react';
import type { DashboardStats } from '@/lib/types';

const STATUS_COLORS: Record<string, string> = {
  Board: 'from-amber-500/20 to-amber-600/5 border-amber-500/30 text-amber-400',
  Part: 'from-red-500/20 to-red-600/5 border-red-500/30 text-red-400',
  Paint: 'from-violet-500/20 to-violet-600/5 border-violet-500/30 text-violet-400',
  Polarisation: 'from-blue-500/20 to-blue-600/5 border-blue-500/30 text-blue-400',
  Ready: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/30 text-emerald-400',
};

const LOCATION_COLORS: Record<string, string> = {
  'In Stock': 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/30 text-emerald-400',
  Sold: 'from-indigo-500/20 to-indigo-600/5 border-indigo-500/30 text-indigo-400',
  Rent: 'from-blue-500/20 to-blue-600/5 border-blue-500/30 text-blue-400',
  Repair: 'from-amber-500/20 to-amber-600/5 border-amber-500/30 text-amber-400',
  Paint: 'from-violet-500/20 to-violet-600/5 border-violet-500/30 text-violet-400',
  Polarisation: 'from-pink-500/20 to-pink-600/5 border-pink-500/30 text-pink-400',
  Scrap: 'from-gray-500/20 to-gray-600/5 border-gray-500/30 text-gray-400',
};

const STATUS_ICONS: Record<string, string> = {
  Board: '🔧', Part: '⚙️', Paint: '🎨', Polarisation: '🔬', Ready: '✅',
};

const LOCATION_ICONS: Record<string, string> = {
  'In Stock': '📦', Sold: '💰', Rent: '🔑', Repair: '🛠️', Paint: '🎨', Polarisation: '🔬', Scrap: '♻️',
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/dashboard/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div>
          <div className="h-8 w-48 skeleton mb-2" />
          <div className="h-4 w-64 skeleton" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 skeleton rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-64 skeleton rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const topMakes = stats ? Object.entries(stats.by_make).sort((a, b) => b[1] - a[1]) : [];
  const topGenerations = stats ? Object.entries(stats.by_generation).sort((a, b) => parseInt(a[0]) - parseInt(b[0])) : [];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-heading">Dashboard</h1>
        <p className="text-text-muted text-sm mt-1">Overview of your laptop inventory</p>
      </div>

      {/* Total Count */}
      <div className="glass-card p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-accent/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <p className="text-text-muted text-sm font-medium uppercase tracking-wider">Total Laptops</p>
          <p className="text-5xl font-bold text-text-heading mt-2">{stats?.total || 0}</p>
          <p className="text-text-muted text-sm mt-1">Active units in inventory</p>
        </div>
      </div>

      {/* Status Cards */}
      <div>
        <h2 className="text-lg font-semibold text-text-heading mb-4 flex items-center gap-2">
          <span className="w-1.5 h-5 bg-accent rounded-full" />
          By Status
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {['Board', 'Part', 'Paint', 'Polarisation', 'Ready'].map((s) => (
            <div
              key={s}
              className={`rounded-xl border p-4 bg-gradient-to-br transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${STATUS_COLORS[s]}`}
            >
              <div className="text-2xl mb-2">{STATUS_ICONS[s]}</div>
              <p className="text-xs font-medium uppercase tracking-wider opacity-80">{s}</p>
              <p className="text-3xl font-bold mt-1">{stats?.by_status[s] || 0}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Location Cards */}
      <div>
        <h2 className="text-lg font-semibold text-text-heading mb-4 flex items-center gap-2">
          <span className="w-1.5 h-5 bg-accent rounded-full" />
          By Location
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {['In Stock', 'Sold', 'Rent', 'Repair', 'Paint', 'Polarisation', 'Scrap'].map((l) => (
            <div
              key={l}
              className={`rounded-xl border p-4 bg-gradient-to-br transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${LOCATION_COLORS[l]}`}
            >
              <div className="text-2xl mb-2">{LOCATION_ICONS[l]}</div>
              <p className="text-xs font-medium uppercase tracking-wider opacity-80">{l}</p>
              <p className="text-3xl font-bold mt-1">{stats?.by_location[l] || 0}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Grid: Make & Generation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Make */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-text-heading mb-4 flex items-center gap-2">
            <span className="w-1.5 h-5 bg-accent rounded-full" />
            By Make
          </h2>
          <div className="space-y-3">
            {topMakes.length > 0 ? topMakes.map(([make, count]) => {
              const percentage = stats?.total ? Math.round((count / stats.total) * 100) : 0;
              return (
                <div key={make} className="flex items-center gap-3 group">
                  <span className="text-sm font-medium text-text-secondary w-24 truncate">{make}</span>
                  <div className="flex-1 h-2 bg-bg-tertiary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-accent to-accent-hover rounded-full transition-all duration-700 group-hover:shadow-[0_0_8px_rgba(108,99,255,0.4)]"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-sm font-mono text-text-muted w-12 text-right">{count}</span>
                </div>
              );
            }) : (
              <p className="text-text-muted text-sm">No data available</p>
            )}
          </div>
        </div>

        {/* By Generation */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-text-heading mb-4 flex items-center gap-2">
            <span className="w-1.5 h-5 bg-accent rounded-full" />
            By Generation
          </h2>
          <div className="space-y-3">
            {topGenerations.length > 0 ? topGenerations.map(([gen, count]) => {
              const percentage = stats?.total ? Math.round((count / stats.total) * 100) : 0;
              return (
                <div key={gen} className="flex items-center gap-3 group">
                  <span className="text-sm font-medium text-text-secondary w-24">Gen {gen}</span>
                  <div className="flex-1 h-2 bg-bg-tertiary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all duration-700 group-hover:shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-sm font-mono text-text-muted w-12 text-right">{count}</span>
                </div>
              );
            }) : (
              <p className="text-text-muted text-sm">No data available</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
