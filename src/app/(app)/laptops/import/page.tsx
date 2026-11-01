'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/providers/ToastProvider';
import type { ImportPreviewRow } from '@/lib/types';

export default function ImportPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreviewRow[] | null>(null);
  const [summary, setSummary] = useState<{ total: number; valid: number; errors: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const isValid = selectedFile.name.endsWith('.csv') || selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls');
    if (!isValid) {
      addToast('error', 'Please select a CSV or Excel file');
      return;
    }

    setFile(selectedFile);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('mode', 'preview');

      const res = await fetch('/api/laptops/import', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setPreview(data.preview);
        setSummary(data.summary);
      } else {
        addToast('error', data.error || 'Failed to parse file');
      }
    } catch {
      addToast('error', 'Failed to upload file');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mode', 'commit');

      const res = await fetch('/api/laptops/import', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        addToast('success', data.message);
        router.push('/laptops');
      } else {
        addToast('error', data.error || 'Import failed');
      }
    } catch {
      addToast('error', 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleExport = () => {
    window.open('/api/laptops/export', '_blank');
  };

  const resetFile = () => {
    setFile(null);
    setPreview(null);
    setSummary(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-heading">Import / Export</h1>
          <p className="text-text-muted text-sm mt-1">Bulk import from CSV or export your inventory</p>
        </div>
        <button onClick={handleExport} className="px-4 py-2 rounded-lg border border-border-primary text-text-secondary hover:text-text-primary hover:bg-bg-hover text-sm font-medium transition-all flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Export All
        </button>
      </div>

      {/* Upload Area */}
      {!preview && (
        <div
          className="glass-card p-12 border-2 border-dashed border-border-secondary hover:border-accent/50 transition-colors cursor-pointer text-center"
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileSelect}
            className="hidden"
          />
          {loading ? (
            <div className="space-y-3">
              <div className="w-12 h-12 border-3 border-accent/30 border-t-accent rounded-full animate-spin mx-auto" />
              <p className="text-text-secondary text-sm">Parsing file...</p>
            </div>
          ) : (
            <>
              <svg className="w-16 h-16 text-text-muted/30 mx-auto mb-4" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m6.75 12-3-3m0 0-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
              <p className="text-text-primary font-medium">Drop your CSV file here or click to browse</p>
              <p className="text-text-muted text-sm mt-2">Supported: .csv, .xlsx, .xls</p>
              <div className="mt-4 px-4 py-2 bg-bg-tertiary rounded-lg inline-block">
                <p className="text-xs text-text-muted">Required columns: <span className="text-accent">ID No</span>, <span className="text-accent">Make</span>, <span className="text-accent">Model</span></p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Preview */}
      {preview && summary && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="glass-card p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-xs text-text-muted uppercase tracking-wider">Total Rows</p>
                <p className="text-2xl font-bold text-text-heading">{summary.total}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted uppercase tracking-wider">Valid</p>
                <p className="text-2xl font-bold text-success">{summary.valid}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted uppercase tracking-wider">Errors</p>
                <p className="text-2xl font-bold text-danger">{summary.errors}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={resetFile} className="px-4 py-2 rounded-lg border border-border-primary text-text-secondary hover:text-text-primary text-sm font-medium transition-all">
                Change File
              </button>
              <button
                onClick={handleImport}
                disabled={summary.valid === 0 || importing}
                className="px-6 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-semibold transition-all disabled:opacity-50 relative"
              >
                {importing ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Importing...
                  </div>
                ) : (
                  `Import ${summary.valid} Laptop${summary.valid !== 1 ? 's' : ''}`
                )}
              </button>
            </div>
          </div>

          {/* Preview Table */}
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto max-h-[500px]">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="w-16">#</th>
                    <th>Status</th>
                    <th>ID No</th>
                    <th>Make</th>
                    <th>Model</th>
                    <th>Gen</th>
                    <th>RAM</th>
                    <th>Status</th>
                    <th>Location</th>
                    <th>Issues</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row) => (
                    <tr key={row.row_number} className={!row.is_valid ? 'bg-danger-muted/30' : ''}>
                      <td className="text-text-muted text-xs">{row.row_number}</td>
                      <td>
                        {row.is_valid ? (
                          <span className="badge badge-ready text-[10px]">✓ Valid</span>
                        ) : (
                          <span className="badge badge-part text-[10px]">✕ Error</span>
                        )}
                      </td>
                      <td className="font-mono text-xs">{row.data.id_no || '—'}</td>
                      <td>{row.data.make || '—'}</td>
                      <td>{row.data.model || '—'}</td>
                      <td>{row.data.generation ?? '—'}</td>
                      <td>{row.data.ram_gb ? `${row.data.ram_gb}GB` : '—'}</td>
                      <td>{row.data.status || '—'}</td>
                      <td>{row.data.location || '—'}</td>
                      <td>
                        {row.errors.map((err, i) => (
                          <p key={i} className="text-xs text-danger">{err}</p>
                        ))}
                        {row.warnings.map((warn, i) => (
                          <p key={i} className="text-xs text-warning">{warn}</p>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
