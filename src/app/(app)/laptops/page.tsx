'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useToast } from '@/components/providers/ToastProvider';
import type { Laptop, LaptopFilters, PaginatedResponse } from '@/lib/types';

const STATUS_BADGE: Record<string, string> = {
  Board: 'badge-board', Part: 'badge-part', Paint: 'badge-paint',
  Polarisation: 'badge-polarisation', Ready: 'badge-ready',
};

const LOCATION_BADGE: Record<string, string> = {
  'In Stock': 'badge-instock', Sold: 'badge-sold', Rent: 'badge-rent',
  Repair: 'badge-repair', Paint: 'badge-paint', Polarisation: 'badge-polarisation', Scrap: 'badge-scrap',
};

const GROUP_OPTIONS = [
  { value: 'none', label: 'List' },
  { value: 'generation', label: 'Generation' },
  { value: 'model', label: 'Model' },
  { value: 'make', label: 'Make' },
  { value: 'status', label: 'Status' },
  { value: 'location', label: 'Location' },
];

export default function LaptopsPage() {
  const { data: session } = useSession();
  const { addToast } = useToast();
  const canEdit = session?.user?.role === 'editor' || session?.user?.role === 'admin';

  const [laptops, setLaptops] = useState<Laptop[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [bulkField, setBulkField] = useState<'status' | 'location'>('status');
  const [bulkValue, setBulkValue] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [filters, setFilters] = useState<LaptopFilters>({
    search: '',
    page: 1,
    per_page: 25,
    sort_by: 'created_at',
    sort_dir: 'desc',
    group_by: 'none',
  });

  const [dropdowns, setDropdowns] = useState<{
    makes: string[]; models: string[]; statuses: string[];
    locations: string[]; users: { id: string; name: string }[];
  }>({
    makes: [], models: [], statuses: [],
    locations: [], users: [],
  });

  useEffect(() => {
    fetchDropdowns();
  }, []);

  const fetchDropdowns = async () => {
    try {
      const [optionsRes, usersRes] = await Promise.all([
        fetch('/api/dropdown-options'),
        session?.user?.role === 'admin' ? fetch('/api/users') : Promise.resolve(null),
      ]);

      if (optionsRes.ok) {
        const options = await optionsRes.json();
        setDropdowns((prev) => ({
          ...prev,
          makes: options.filter((o: { category: string }) => o.category === 'make').map((o: { value: string }) => o.value),
          models: options.filter((o: { category: string }) => o.category === 'model').map((o: { value: string }) => o.value),
          statuses: options.filter((o: { category: string }) => o.category === 'status').map((o: { value: string }) => o.value),
          locations: options.filter((o: { category: string }) => o.category === 'location').map((o: { value: string }) => o.value),
        }));
      }

      if (usersRes && usersRes.ok) {
        const users = await usersRes.json();
        setDropdowns((prev) => ({
          ...prev,
          users: users.map((u: { id: string; name: string }) => ({ id: u.id, name: u.name })),
        }));
      }
    } catch (err) {
      console.error('Failed to fetch dropdowns:', err);
    }
  };

  const fetchLaptops = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '' && value !== 'none') {
          params.set(key, String(value));
        }
      });

      const res = await fetch(`/api/laptops?${params.toString()}`);
      if (res.ok) {
        const data: PaginatedResponse<Laptop> = await res.json();
        setLaptops(data.data);
        setTotal(data.total);
        setTotalPages(data.total_pages);
      }
    } catch (err) {
      console.error('Failed to fetch laptops:', err);
      addToast('error', 'Failed to load laptops');
    } finally {
      setLoading(false);
    }
  }, [filters, addToast]);

  useEffect(() => {
    fetchLaptops();
  }, [fetchLaptops]);

  const handleSort = (column: string) => {
    setFilters((prev) => ({
      ...prev,
      sort_by: column,
      sort_dir: prev.sort_by === column && prev.sort_dir === 'asc' ? 'desc' : 'asc',
      page: 1,
    }));
  };

  const handleSelectAll = () => {
    if (selectedIds.size === laptops.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(laptops.map((l) => l.id)));
    }
  };

  const handleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkEdit = async () => {
    if (!bulkValue || selectedIds.size === 0) return;

    try {
      const res = await fetch('/api/laptops/bulk', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          laptop_ids: Array.from(selectedIds),
          field: bulkField,
          value: bulkValue,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        addToast('success', data.message);
        setSelectedIds(new Set());
        setShowBulkEdit(false);
        setBulkValue('');
        fetchLaptops();
      } else {
        addToast('error', data.error);
      }
    } catch {
      addToast('error', 'Bulk update failed');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/laptops/${id}`, { method: 'DELETE' });
      if (res.ok) {
        addToast('success', 'Laptop deleted');
        setDeleteConfirm(null);
        fetchLaptops();
      } else {
        const data = await res.json();
        addToast('error', data.error);
      }
    } catch {
      addToast('error', 'Delete failed');
    }
  };

  const handleExport = async () => {
    const params = new URLSearchParams();
    if (filters.make) params.set('make', filters.make);
    if (filters.status) params.set('status', filters.status);
    if (filters.location) params.set('location', filters.location);

    window.open(`/api/laptops/export?${params.toString()}`, '_blank');
  };

  const sortIcon = (column: string) => {
    if (filters.sort_by !== column) return '↕';
    return filters.sort_dir === 'asc' ? '↑' : '↓';
  };

  // Group laptops if needed
  const groupedLaptops = React.useMemo(() => {
    if (filters.group_by === 'none') return { '': laptops };
    const groups: Record<string, Laptop[]> = {};
    laptops.forEach((laptop) => {
      const key = String(laptop[filters.group_by as keyof Laptop] ?? 'Unknown');
      if (!groups[key]) groups[key] = [];
      groups[key].push(laptop);
    });
    return groups;
  }, [laptops, filters.group_by]);

  const renderStatusDisplay = (laptop: Laptop) => {
    if (laptop.status === 'Ready') {
      return <span className="badge badge-ok">OK</span>;
    }
    return (
      <div className="flex flex-col gap-1">
        <span className={`badge ${STATUS_BADGE[laptop.status]}`}>{laptop.status}</span>
        {laptop.remark && (
          <span className="text-xs text-text-muted truncate max-w-[150px]" title={laptop.remark}>
            {laptop.remark}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-heading">Laptops</h1>
          <p className="text-text-muted text-sm mt-1">{total} total laptops</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={handleExport} className="px-4 py-2 rounded-lg border border-border-primary text-text-secondary hover:text-text-primary hover:bg-bg-hover text-sm font-medium transition-all flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Export
          </button>
          {canEdit && (
            <>
              <Link href="/laptops/import" className="px-4 py-2 rounded-lg border border-border-primary text-text-secondary hover:text-text-primary hover:bg-bg-hover text-sm font-medium transition-all flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                </svg>
                Import
              </Link>
              <Link href="/laptops/new" className="px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-semibold transition-all flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Add Laptop
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Search & Filters Bar */}
      <div className="glass-card p-4 space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input
              type="text"
              placeholder="Search by ID, Serial, Make, Model, Processor..."
              value={filters.search || ''}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value, page: 1 }))}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-bg-input border border-border-primary text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-accent input-glow transition-all text-sm"
            />
          </div>

          {/* Group by toggle */}
          <div className="flex items-center bg-bg-tertiary rounded-lg p-1 border border-border-primary">
            {GROUP_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFilters((prev) => ({ ...prev, group_by: opt.value as LaptopFilters['group_by'], page: 1 }))}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  filters.group_by === opt.value
                    ? 'bg-accent text-white shadow-sm'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition-all flex items-center gap-2 ${
              showFilters ? 'border-accent text-accent bg-accent-muted' : 'border-border-primary text-text-secondary hover:text-text-primary hover:bg-bg-hover'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" />
            </svg>
            Filters
          </button>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-2 border-t border-border-primary animate-fade-in">
            <select
              value={filters.make || ''}
              onChange={(e) => setFilters((prev) => ({ ...prev, make: e.target.value as typeof prev.make, page: 1 }))}
              className="px-3 py-2 rounded-lg bg-bg-input border border-border-primary text-text-primary text-sm focus:outline-none focus:border-accent"
            >
              <option value="">All Makes</option>
              {dropdowns.makes.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <select
              value={filters.status || ''}
              onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value as typeof prev.status, page: 1 }))}
              className="px-3 py-2 rounded-lg bg-bg-input border border-border-primary text-text-primary text-sm focus:outline-none focus:border-accent"
            >
              <option value="">All Statuses</option>
              {dropdowns.statuses.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select
              value={filters.location || ''}
              onChange={(e) => setFilters((prev) => ({ ...prev, location: e.target.value as typeof prev.location, page: 1 }))}
              className="px-3 py-2 rounded-lg bg-bg-input border border-border-primary text-text-primary text-sm focus:outline-none focus:border-accent"
            >
              <option value="">All Locations</option>
              {dropdowns.locations.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
            <select
              value={filters.generation || ''}
              onChange={(e) => setFilters((prev) => ({ ...prev, generation: e.target.value ? parseInt(e.target.value) : undefined, page: 1 }))}
              className="px-3 py-2 rounded-lg bg-bg-input border border-border-primary text-text-primary text-sm focus:outline-none focus:border-accent"
            >
              <option value="">All Generations</option>
              {[...Array(15)].map((_, i) => <option key={i + 1} value={i + 1}>Gen {i + 1}</option>)}
            </select>
            <select
              value={filters.screen || ''}
              onChange={(e) => setFilters((prev) => ({ ...prev, screen: e.target.value as typeof prev.screen, page: 1 }))}
              className="px-3 py-2 rounded-lg bg-bg-input border border-border-primary text-text-primary text-sm focus:outline-none focus:border-accent"
            >
              <option value="">All Screens</option>
              <option value="Touch">Touch</option>
              <option value="Non-Touch">Non-Touch</option>
            </select>
          </div>
        )}
      </div>

      {/* Bulk Edit Bar */}
      {canEdit && selectedIds.size > 0 && (
        <div className="glass-card p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 animate-fade-in border-accent/30">
          <span className="text-sm font-medium text-accent">
            {selectedIds.size} selected
          </span>
          <div className="flex items-center gap-2 flex-1">
            <select
              value={bulkField}
              onChange={(e) => { setBulkField(e.target.value as 'status' | 'location'); setBulkValue(''); }}
              className="px-3 py-2 rounded-lg bg-bg-input border border-border-primary text-text-primary text-sm"
            >
              <option value="status">Status</option>
              <option value="location">Location</option>
            </select>
            <select
              value={bulkValue}
              onChange={(e) => setBulkValue(e.target.value)}
              className="px-3 py-2 rounded-lg bg-bg-input border border-border-primary text-text-primary text-sm flex-1"
            >
              <option value="">Select value...</option>
              {(bulkField === 'status' ? dropdowns.statuses : dropdowns.locations).map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
            <button
              onClick={handleBulkEdit}
              disabled={!bulkValue}
              className="px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium disabled:opacity-50 transition-all"
            >
              Apply
            </button>
          </div>
          <button
            onClick={() => { setSelectedIds(new Set()); setShowBulkEdit(false); }}
            className="text-text-muted hover:text-text-primary text-sm"
          >
            Clear
          </button>
        </div>
      )}

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                {canEdit && (
                  <th className="w-10">
                    <input
                      type="checkbox"
                      checked={laptops.length > 0 && selectedIds.size === laptops.length}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-border-secondary accent-accent"
                    />
                  </th>
                )}
                <th onClick={() => handleSort('id_no')}>ID No {sortIcon('id_no')}</th>
                <th onClick={() => handleSort('serial_no')}>Serial No {sortIcon('serial_no')}</th>
                <th onClick={() => handleSort('make')}>Make {sortIcon('make')}</th>
                <th onClick={() => handleSort('model')}>Model {sortIcon('model')}</th>
                <th onClick={() => handleSort('generation')}>Gen {sortIcon('generation')}</th>
                <th>RAM</th>
                <th>Storage</th>
                <th>Screen</th>
                <th onClick={() => handleSort('status')}>Status {sortIcon('status')}</th>
                <th onClick={() => handleSort('location')}>Location {sortIcon('location')}</th>
                {canEdit && <th className="w-20">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(10)].map((_, i) => (
                  <tr key={i}>
                    {canEdit && <td><div className="w-4 h-4 skeleton rounded" /></td>}
                    {[...Array(canEdit ? 12 : 11)].map((_, j) => (
                      <td key={j}><div className="h-4 skeleton rounded w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : laptops.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 13 : 11} className="text-center py-12">
                    <div className="text-text-muted">
                      <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25" />
                      </svg>
                      <p className="text-sm">No laptops found</p>
                      <p className="text-xs mt-1">Try adjusting your filters or add a new laptop</p>
                    </div>
                  </td>
                </tr>
              ) : (
                Object.entries(groupedLaptops).map(([group, groupLaptops]) => (
                  <React.Fragment key={group}>
                    {group && filters.group_by !== 'none' && (
                      <tr>
                        <td colSpan={canEdit ? 13 : 11} className="bg-bg-tertiary/50 py-2 px-4">
                          <span className="text-xs font-semibold uppercase tracking-wider text-accent">
                            {filters.group_by === 'generation' ? `Generation ${group}` : group}
                          </span>
                          <span className="text-xs text-text-muted ml-2">({groupLaptops.length})</span>
                        </td>
                      </tr>
                    )}
                    {groupLaptops.map((laptop) => (
                      <tr key={laptop.id} className={selectedIds.has(laptop.id) ? 'selected' : ''}>
                        {canEdit && (
                          <td>
                            <input
                              type="checkbox"
                              checked={selectedIds.has(laptop.id)}
                              onChange={() => handleSelect(laptop.id)}
                              className="w-4 h-4 rounded border-border-secondary accent-accent"
                            />
                          </td>
                        )}
                        <td>
                          <Link href={`/laptops/${laptop.id}/edit`} className="text-accent hover:text-accent-hover font-mono text-xs font-medium">
                            {laptop.id_no}
                          </Link>
                        </td>
                        <td className="font-mono text-xs">{laptop.serial_no || '—'}</td>
                        <td className="font-medium">{laptop.make}</td>
                        <td>{laptop.model}</td>
                        <td className="text-center">{laptop.generation ?? '—'}</td>
                        <td>{laptop.ram_gb ? `${laptop.ram_gb} GB` : '—'}</td>
                        <td className="text-xs">
                          {laptop.storage1_type ? `${laptop.storage1_type} ${laptop.storage1_size_gb}GB` : '—'}
                          {laptop.storage2_type && (
                            <span className="text-text-muted block">+ {laptop.storage2_type} {laptop.storage2_size_gb}GB</span>
                          )}
                        </td>
                        <td>
                          {laptop.screen ? (
                            <span className={`text-xs ${laptop.screen === 'Touch' ? 'text-cyan-400' : 'text-text-muted'}`}>
                              {laptop.screen}
                            </span>
                          ) : '—'}
                        </td>
                        <td>{renderStatusDisplay(laptop)}</td>
                        <td>
                          <span className={`badge ${LOCATION_BADGE[laptop.location] || ''}`}>
                            {laptop.location}
                          </span>
                        </td>
                        {canEdit && (
                          <td>
                            <div className="flex items-center gap-1">
                              <Link
                                href={`/laptops/${laptop.id}/edit`}
                                className="p-1.5 rounded-md text-text-muted hover:text-accent hover:bg-accent-muted transition-all"
                                title="Edit"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                                </svg>
                              </Link>
                              {deleteConfirm === laptop.id ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleDelete(laptop.id)}
                                    className="p-1.5 rounded-md text-danger hover:bg-danger-muted transition-all text-xs font-medium"
                                  >
                                    Yes
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirm(null)}
                                    className="p-1.5 rounded-md text-text-muted hover:text-text-primary transition-all text-xs"
                                  >
                                    No
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setDeleteConfirm(laptop.id)}
                                  className="p-1.5 rounded-md text-text-muted hover:text-danger hover:bg-danger-muted transition-all"
                                  title="Delete"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border-primary">
            <p className="text-xs text-text-muted">
              Page {filters.page} of {totalPages} · {total} total
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setFilters((prev) => ({ ...prev, page: Math.max(1, (prev.page || 1) - 1) }))}
                disabled={filters.page === 1}
                className="px-3 py-1.5 rounded-md border border-border-primary text-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover disabled:opacity-30 transition-all"
              >
                ← Prev
              </button>
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                const pageNum = Math.max(1, Math.min(totalPages - 4, (filters.page || 1) - 2)) + i;
                if (pageNum > totalPages) return null;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setFilters((prev) => ({ ...prev, page: pageNum }))}
                    className={`w-8 h-8 rounded-md text-sm font-medium transition-all ${
                      pageNum === filters.page
                        ? 'bg-accent text-white'
                        : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setFilters((prev) => ({ ...prev, page: Math.min(totalPages, (prev.page || 1) + 1) }))}
                disabled={filters.page === totalPages}
                className="px-3 py-1.5 rounded-md border border-border-primary text-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover disabled:opacity-30 transition-all"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
