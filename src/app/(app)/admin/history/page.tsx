'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useToast } from '@/components/providers/ToastProvider';
import type { AuditLogEntry, PaginatedResponse } from '@/lib/types';

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  create: { label: 'Created', color: 'badge-ready' },
  update: { label: 'Updated', color: 'badge-polarisation' },
  delete: { label: 'Deleted', color: 'badge-part' },
  restore: { label: 'Restored', color: 'badge-ok' },
  rollback: { label: 'Rollback', color: 'badge-board' },
  import: { label: 'Imported', color: 'badge-polarisation' },
  bulk_update: { label: 'Bulk Update', color: 'badge-paint' },
};

export default function HistoryPage() {
  const { addToast } = useToast();
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [rollingBack, setRollingBack] = useState<number | null>(null);
  const [conflictEntry, setConflictEntry] = useState<{ entry_id: number; warning: string } | null>(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('per_page', '50');
      if (actionFilter) params.set('action', actionFilter);
      if (fromDate) params.set('from_date', new Date(fromDate).toISOString());
      if (toDate) params.set('to_date', new Date(toDate + 'T23:59:59').toISOString());

      const res = await fetch(`/api/audit-log?${params.toString()}`);
      if (res.ok) {
        const data: PaginatedResponse<AuditLogEntry> = await res.json();
        setEntries(data.data);
        setTotal(data.total);
        setTotalPages(data.total_pages);
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
      addToast('error', 'Failed to load history');
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter, fromDate, toDate, addToast]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleRollback = async (entryId: number, force = false) => {
    setRollingBack(entryId);
    try {
      const res = await fetch('/api/audit-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entry_id: entryId, mode: force ? 'force' : 'single' }),
      });

      const data = await res.json();

      if (res.status === 409 && data.conflict) {
        setConflictEntry({ entry_id: entryId, warning: data.warning });
        return;
      }

      if (res.ok) {
        addToast('success', data.message);
        setConflictEntry(null);
        fetchHistory();
      } else {
        addToast('error', data.error || 'Rollback failed');
      }
    } catch {
      addToast('error', 'Rollback failed');
    } finally {
      setRollingBack(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  };

  const canRollback = (entry: AuditLogEntry) => {
    return ['update', 'delete', 'bulk_update'].includes(entry.action) && !entry.is_rollback;
  };

  const inputClass = 'px-3 py-2 rounded-lg bg-bg-input border border-border-primary text-text-primary text-sm focus:outline-none focus:border-accent';

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text-heading">Audit History</h1>
        <p className="text-text-muted text-sm mt-1">{total} total entries</p>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <select value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); setPage(1); }} className={inputClass}>
          <option value="">All Actions</option>
          <option value="create">Created</option>
          <option value="update">Updated</option>
          <option value="delete">Deleted</option>
          <option value="restore">Restored</option>
          <option value="rollback">Rollback</option>
          <option value="import">Imported</option>
          <option value="bulk_update">Bulk Update</option>
        </select>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">From:</span>
          <input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1); }} className={inputClass} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">To:</span>
          <input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(1); }} className={inputClass} />
        </div>
        {(actionFilter || fromDate || toDate) && (
          <button onClick={() => { setActionFilter(''); setFromDate(''); setToDate(''); setPage(1); }} className="text-xs text-accent hover:text-accent-hover transition-colors">
            Clear filters
          </button>
        )}
      </div>

      {/* Conflict Warning Modal */}
      {conflictEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConflictEntry(null)} />
          <div className="relative w-full max-w-md glass-card p-6 animate-fade-in">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-warning-muted flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-warning" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-text-heading">Conflict Detected</h3>
                <p className="text-sm text-text-secondary mt-1">{conflictEntry.warning}</p>
              </div>
            </div>
            <p className="text-sm text-text-muted mb-6">Do you still want to rollback this change?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConflictEntry(null)} className="px-4 py-2 rounded-lg border border-border-primary text-text-secondary text-sm font-medium transition-all">
                Cancel
              </button>
              <button
                onClick={() => handleRollback(conflictEntry.entry_id, true)}
                className="px-4 py-2 rounded-lg bg-warning hover:bg-warning/90 text-black text-sm font-semibold transition-all"
              >
                Force Rollback
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="space-y-2">
        {loading ? (
          [...Array(10)].map((_, i) => (
            <div key={i} className="glass-card p-4"><div className="h-5 skeleton rounded w-full" /></div>
          ))
        ) : entries.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <svg className="w-12 h-12 text-text-muted/30 mx-auto mb-3" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            <p className="text-text-muted text-sm">No history entries found</p>
          </div>
        ) : (
          entries.map((entry) => {
            const actionInfo = ACTION_LABELS[entry.action] || { label: entry.action, color: '' };
            const isExpanded = expandedId === entry.id;

            return (
              <div
                key={entry.id}
                className={`glass-card transition-all duration-200 ${isExpanded ? 'ring-1 ring-accent/30' : ''}`}
              >
                <div
                  className="p-4 flex items-center gap-4 cursor-pointer hover:bg-bg-hover/30 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                >
                  {/* Action badge */}
                  <span className={`badge ${actionInfo.color} shrink-0`}>{actionInfo.label}</span>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-mono text-accent">{entry.laptop_id_no || '—'}</span>
                      {entry.field_name && (
                        <span className="text-xs text-text-muted">
                          {entry.field_name}: <span className="line-through text-danger/70">{entry.old_value || 'null'}</span>
                          {' → '}
                          <span className="text-success">{entry.new_value || 'null'}</span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-text-muted">{entry.performer_name || 'System'}</span>
                      <span className="text-xs text-text-muted">·</span>
                      <span className="text-xs text-text-muted">{formatDate(entry.performed_at)}</span>
                      {entry.is_rollback && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-warning-muted text-warning font-medium">ROLLBACK</span>
                      )}
                    </div>
                  </div>

                  {/* Rollback button */}
                  {canRollback(entry) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRollback(entry.id);
                      }}
                      disabled={rollingBack === entry.id}
                      className="px-3 py-1.5 rounded-md border border-border-primary text-xs font-medium text-text-muted hover:text-warning hover:border-warning/50 hover:bg-warning-muted transition-all disabled:opacity-50 shrink-0"
                      title="Rollback this change"
                    >
                      {rollingBack === entry.id ? '...' : '↩ Undo'}
                    </button>
                  )}

                  {/* Expand arrow */}
                  <svg
                    className={`w-4 h-4 text-text-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                  </svg>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-0 border-t border-border-primary animate-fade-in">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-3 text-xs">
                      <div>
                        <span className="text-text-muted block">Laptop ID</span>
                        <span className="text-text-primary font-mono">{entry.laptop_id?.slice(0, 8) || '—'}...</span>
                      </div>
                      <div>
                        <span className="text-text-muted block">Batch ID</span>
                        <span className="text-text-primary font-mono">{entry.batch_id?.slice(0, 8)}...</span>
                      </div>
                      <div>
                        <span className="text-text-muted block">Performed By</span>
                        <span className="text-text-primary">{entry.performer_name || 'System'}</span>
                      </div>
                      <div>
                        <span className="text-text-muted block">Timestamp</span>
                        <span className="text-text-primary">{formatDate(entry.performed_at)}</span>
                      </div>
                    </div>

                    {entry.snapshot && (
                      <div className="mt-2">
                        <span className="text-xs text-text-muted block mb-1">Snapshot</span>
                        <pre className="text-xs bg-bg-tertiary p-3 rounded-lg overflow-x-auto text-text-secondary">
                          {JSON.stringify(entry.snapshot, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-text-muted">
            Page {page} of {totalPages} · {total} total
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-md border border-border-primary text-sm text-text-secondary hover:text-text-primary disabled:opacity-30 transition-all"
            >
              ← Prev
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-md border border-border-primary text-sm text-text-secondary hover:text-text-primary disabled:opacity-30 transition-all"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
