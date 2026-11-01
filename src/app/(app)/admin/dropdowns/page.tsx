'use client';

import React, { useEffect, useState } from 'react';
import { useToast } from '@/components/providers/ToastProvider';
import type { DropdownOption } from '@/lib/types';

const CATEGORIES = [
  { key: 'make', label: 'Makes', description: 'Laptop manufacturers' },
  { key: 'model', label: 'Models', description: 'Laptop models (can be linked to a make)' },
  { key: 'status', label: 'Statuses', description: 'Laptop work status values' },
  { key: 'location', label: 'Locations', description: 'Laptop physical location values' },
  { key: 'storage_type', label: 'Storage Types', description: 'Disk storage types' },
  { key: 'screen', label: 'Screen Types', description: 'Display types' },
];

export default function DropdownsPage() {
  const { addToast } = useToast();
  const [options, setOptions] = useState<DropdownOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('make');
  const [newValue, setNewValue] = useState('');
  const [newParent, setNewParent] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    fetchOptions();
  }, []);

  const fetchOptions = async () => {
    try {
      const res = await fetch('/api/dropdown-options');
      if (res.ok) {
        const data = await res.json();
        setOptions(data);
      }
    } catch (err) {
      console.error('Failed to fetch options:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredOptions = options.filter((o) => o.category === activeCategory);
  const makes = options.filter((o) => o.category === 'make');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newValue.trim()) return;
    setAddLoading(true);

    try {
      const body: Record<string, unknown> = {
        category: activeCategory,
        value: newValue.trim(),
        sort_order: filteredOptions.length + 1,
      };
      if (activeCategory === 'model' && newParent) {
        body.parent_value = newParent;
      }

      const res = await fetch('/api/dropdown-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (res.ok) {
        addToast('success', `Added "${newValue.trim()}"`);
        setNewValue('');
        setNewParent('');
        fetchOptions();
      } else {
        addToast('error', data.error);
      }
    } catch {
      addToast('error', 'Failed to add option');
    } finally {
      setAddLoading(false);
    }
  };

  const handleUpdate = async (id: number) => {
    if (!editValue.trim()) return;

    try {
      const res = await fetch('/api/dropdown-options', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, value: editValue.trim() }),
      });

      if (res.ok) {
        addToast('success', 'Updated');
        setEditingId(null);
        setEditValue('');
        fetchOptions();
      } else {
        const data = await res.json();
        addToast('error', data.error);
      }
    } catch {
      addToast('error', 'Failed to update');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/dropdown-options?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        addToast('success', 'Removed');
        fetchOptions();
      } else {
        const data = await res.json();
        addToast('error', data.error);
      }
    } catch {
      addToast('error', 'Failed to remove');
    }
  };

  const inputClass = 'w-full px-4 py-2.5 rounded-lg bg-bg-input border border-border-primary text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-accent input-glow transition-all text-sm';

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text-heading">Dropdown Management</h1>
        <p className="text-text-muted text-sm mt-1">Manage the dropdown options used across the system</p>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeCategory === cat.key
                ? 'bg-accent text-white shadow-md'
                : 'bg-bg-tertiary text-text-muted hover:text-text-primary hover:bg-bg-hover border border-border-primary'
            }`}
          >
            {cat.label}
            <span className="ml-2 text-xs opacity-70">
              ({options.filter((o) => o.category === cat.key).length})
            </span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Options List */}
        <div className="lg:col-span-2 glass-card overflow-hidden">
          <div className="p-4 border-b border-border-primary">
            <h2 className="text-sm font-semibold text-text-heading">
              {CATEGORIES.find((c) => c.key === activeCategory)?.label}
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              {CATEGORIES.find((c) => c.key === activeCategory)?.description}
            </p>
          </div>

          <div className="divide-y divide-border-primary">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <div key={i} className="p-4"><div className="h-5 skeleton rounded w-32" /></div>
              ))
            ) : filteredOptions.length === 0 ? (
              <div className="p-8 text-center text-text-muted text-sm">
                No options in this category yet
              </div>
            ) : (
              filteredOptions.map((option) => (
                <div key={option.id} className="flex items-center justify-between p-4 hover:bg-bg-hover/50 transition-colors group">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="w-6 h-6 rounded-md bg-accent/10 border border-accent/20 flex items-center justify-center text-xs text-accent font-mono">
                      {option.sort_order}
                    </span>
                    {editingId === option.id ? (
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleUpdate(option.id); if (e.key === 'Escape') setEditingId(null); }}
                        autoFocus
                        className="px-3 py-1 rounded-md bg-bg-input border border-accent text-sm text-text-primary flex-1"
                      />
                    ) : (
                      <span className="text-sm text-text-primary font-medium">{option.value}</span>
                    )}
                    {option.parent_value && (
                      <span className="text-xs text-text-muted bg-bg-tertiary px-2 py-0.5 rounded">
                        → {option.parent_value}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {editingId === option.id ? (
                      <>
                        <button onClick={() => handleUpdate(option.id)} className="p-1.5 rounded-md text-accent hover:bg-accent-muted text-xs font-medium transition-all">
                          Save
                        </button>
                        <button onClick={() => setEditingId(null)} className="p-1.5 rounded-md text-text-muted hover:text-text-primary text-xs transition-all">
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => { setEditingId(option.id); setEditValue(option.value); }}
                          className="p-1.5 rounded-md text-text-muted hover:text-accent hover:bg-accent-muted transition-all"
                          title="Edit"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(option.id)}
                          className="p-1.5 rounded-md text-text-muted hover:text-danger hover:bg-danger-muted transition-all"
                          title="Remove"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Add New */}
        <div className="glass-card p-6 h-fit">
          <h3 className="text-sm font-semibold text-text-heading mb-4">Add New Option</h3>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Value</label>
              <input
                type="text"
                required
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                className={inputClass}
                placeholder={`Enter ${activeCategory}...`}
              />
            </div>
            {activeCategory === 'model' && (
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Parent Make (optional)</label>
                <select
                  value={newParent}
                  onChange={(e) => setNewParent(e.target.value)}
                  className={inputClass}
                >
                  <option value="">No parent</option>
                  {makes.map((m) => (
                    <option key={m.id} value={m.value}>{m.value}</option>
                  ))}
                </select>
              </div>
            )}
            <button
              type="submit"
              disabled={addLoading || !newValue.trim()}
              className="w-full py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-semibold transition-all disabled:opacity-50"
            >
              {addLoading ? 'Adding...' : 'Add Option'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
