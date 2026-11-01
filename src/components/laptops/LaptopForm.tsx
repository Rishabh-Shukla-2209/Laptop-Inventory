'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/providers/ToastProvider';

interface FormData {
  id_no: string;
  serial_no: string;
  mis: string;
  make: string;
  model: string;
  processor: string;
  generation: string;
  ram_gb: string;
  storage1_type: string;
  storage1_size_gb: string;
  storage2_type: string;
  storage2_size_gb: string;
  screen: string;
  graphic_card: string;
  status: string;
  location: string;
  checked_by: string;
  remark: string;
}

const EMPTY_FORM: FormData = {
  id_no: '', serial_no: '', mis: '', make: '', model: '',
  processor: '', generation: '', ram_gb: '',
  storage1_type: '', storage1_size_gb: '', storage2_type: '', storage2_size_gb: '',
  screen: '', graphic_card: '', status: 'Board', location: 'In Stock',
  checked_by: '', remark: '',
};

interface LaptopFormProps {
  laptopId?: string;
  mode: 'create' | 'edit';
}

export default function LaptopForm({ laptopId, mode }: LaptopFormProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [fetchingLaptop, setFetchingLaptop] = useState(mode === 'edit');
  const [makeSearch, setMakeSearch] = useState('');
  const [modelSearch, setModelSearch] = useState('');
  const [showMakeSuggestions, setShowMakeSuggestions] = useState(false);
  const [showModelSuggestions, setShowModelSuggestions] = useState(false);

  const [dropdowns, setDropdowns] = useState<{
    makes: string[]; models: { value: string; parent_value: string | null }[];
    statuses: string[]; locations: string[]; storageTypes: string[];
    users: { id: string; name: string }[];
  }>({
    makes: [], models: [], statuses: [], locations: [], storageTypes: [], users: [],
  });

  useEffect(() => {
    fetchDropdowns();
  }, []);

  const fetchDropdowns = async () => {
    try {
      const [optionsRes, usersRes] = await Promise.all([
        fetch('/api/dropdown-options'),
        fetch('/api/users').catch(() => null),
      ]);

      if (optionsRes.ok) {
        const options = await optionsRes.json();
        setDropdowns({
          makes: options.filter((o: { category: string }) => o.category === 'make').map((o: { value: string }) => o.value),
          models: options.filter((o: { category: string }) => o.category === 'model').map((o: { value: string; parent_value: string | null }) => ({ value: o.value, parent_value: o.parent_value })),
          statuses: options.filter((o: { category: string }) => o.category === 'status').map((o: { value: string }) => o.value),
          locations: options.filter((o: { category: string }) => o.category === 'location').map((o: { value: string }) => o.value),
          storageTypes: options.filter((o: { category: string }) => o.category === 'storage_type').map((o: { value: string }) => o.value),
          users: [],
        });
      }

      if (usersRes && usersRes.ok) {
        const users = await usersRes.json();
        setDropdowns((prev) => ({
          ...prev,
          users: users.filter((u: { is_active: boolean }) => u.is_active).map((u: { id: string; name: string }) => ({ id: u.id, name: u.name })),
        }));
      }
    } catch (err) {
      console.error('Failed to fetch dropdowns:', err);
    }
  };

  const fetchLaptop = useCallback(async () => {
    if (!laptopId) return;
    try {
      const res = await fetch(`/api/laptops/${laptopId}`);
      if (res.ok) {
        const laptop = await res.json();
        setForm({
          id_no: laptop.id_no || '',
          serial_no: laptop.serial_no || '',
          mis: laptop.mis || '',
          make: laptop.make || '',
          model: laptop.model || '',
          processor: laptop.processor || '',
          generation: laptop.generation?.toString() || '',
          ram_gb: laptop.ram_gb?.toString() || '',
          storage1_type: laptop.storage1_type || '',
          storage1_size_gb: laptop.storage1_size_gb?.toString() || '',
          storage2_type: laptop.storage2_type || '',
          storage2_size_gb: laptop.storage2_size_gb?.toString() || '',
          screen: laptop.screen || '',
          graphic_card: laptop.graphic_card || '',
          status: laptop.status || 'Board',
          location: laptop.location || 'In Stock',
          checked_by: laptop.checked_by || '',
          remark: laptop.remark || '',
        });
        setMakeSearch(laptop.make || '');
        setModelSearch(laptop.model || '');
      } else {
        addToast('error', 'Laptop not found');
        router.push('/laptops');
      }
    } catch {
      addToast('error', 'Failed to load laptop');
    } finally {
      setFetchingLaptop(false);
    }
  }, [laptopId, addToast, router]);

  useEffect(() => {
    if (mode === 'edit') fetchLaptop();
  }, [mode, fetchLaptop]);

  const handleChange = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = mode === 'create' ? '/api/laptops' : `/api/laptops/${laptopId}`;
      const method = mode === 'create' ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (res.ok) {
        if (data.warning) addToast('warning', data.warning);
        addToast('success', mode === 'create' ? 'Laptop created successfully' : 'Laptop updated successfully');
        router.push('/laptops');
      } else {
        addToast('error', data.error || 'Failed to save');
      }
    } catch {
      addToast('error', 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Filter suggestions based on search
  const filteredMakes = dropdowns.makes.filter((m) =>
    m.toLowerCase().includes(makeSearch.toLowerCase())
  );

  const filteredModels = dropdowns.models
    .filter((m) => {
      if (form.make && m.parent_value) {
        return m.parent_value === form.make && m.value.toLowerCase().includes(modelSearch.toLowerCase());
      }
      return m.value.toLowerCase().includes(modelSearch.toLowerCase());
    })
    .map((m) => m.value);

  if (fetchingLaptop) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        <div className="h-8 w-48 skeleton" />
        <div className="glass-card p-8 space-y-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-12 skeleton rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const inputClass = 'w-full px-4 py-2.5 rounded-lg bg-bg-input border border-border-primary text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-accent input-glow transition-all text-sm';
  const labelClass = 'block text-sm font-medium text-text-secondary mb-1.5';

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg border border-border-primary text-text-muted hover:text-text-primary hover:bg-bg-hover transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-text-heading">
            {mode === 'create' ? 'Add New Laptop' : 'Edit Laptop'}
          </h1>
          {mode === 'edit' && <p className="text-text-muted text-sm">ID: {form.id_no}</p>}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="glass-card p-6 sm:p-8 space-y-8">
        {/* Identification */}
        <fieldset>
          <legend className="text-sm font-semibold text-accent uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-accent rounded-full" />
            Identification
          </legend>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="id_no" className={labelClass}>ID No *</label>
              <input id="id_no" type="text" required value={form.id_no} onChange={(e) => handleChange('id_no', e.target.value)} className={inputClass} placeholder="e.g. LPT001" />
            </div>
            <div>
              <label htmlFor="serial_no" className={labelClass}>Serial No</label>
              <input id="serial_no" type="text" value={form.serial_no} onChange={(e) => handleChange('serial_no', e.target.value)} className={inputClass} placeholder="Optional" />
            </div>
            <div>
              <label htmlFor="mis" className={labelClass}>MIS</label>
              <input id="mis" type="text" value={form.mis} onChange={(e) => handleChange('mis', e.target.value)} className={inputClass} placeholder="Optional" />
            </div>
          </div>
        </fieldset>

        {/* Make & Model with Autocomplete */}
        <fieldset>
          <legend className="text-sm font-semibold text-accent uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-accent rounded-full" />
            Make & Model
          </legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="relative">
              <label htmlFor="make" className={labelClass}>Make *</label>
              <input
                id="make"
                type="text"
                required
                value={makeSearch}
                onChange={(e) => {
                  setMakeSearch(e.target.value);
                  handleChange('make', e.target.value);
                  setShowMakeSuggestions(true);
                }}
                onFocus={() => setShowMakeSuggestions(true)}
                onBlur={() => setTimeout(() => setShowMakeSuggestions(false), 200)}
                className={inputClass}
                placeholder="Type or select make..."
                autoComplete="off"
              />
              {showMakeSuggestions && filteredMakes.length > 0 && (
                <div className="absolute z-20 w-full mt-1 bg-bg-card border border-border-primary rounded-lg shadow-xl max-h-48 overflow-y-auto">
                  {filteredMakes.map((make) => (
                    <button
                      key={make}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setMakeSearch(make);
                        handleChange('make', make);
                        setShowMakeSuggestions(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
                    >
                      {make}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="relative">
              <label htmlFor="model" className={labelClass}>Model *</label>
              <input
                id="model"
                type="text"
                required
                value={modelSearch}
                onChange={(e) => {
                  setModelSearch(e.target.value);
                  handleChange('model', e.target.value);
                  setShowModelSuggestions(true);
                }}
                onFocus={() => setShowModelSuggestions(true)}
                onBlur={() => setTimeout(() => setShowModelSuggestions(false), 200)}
                className={inputClass}
                placeholder="Type or select model..."
                autoComplete="off"
              />
              {showModelSuggestions && filteredModels.length > 0 && (
                <div className="absolute z-20 w-full mt-1 bg-bg-card border border-border-primary rounded-lg shadow-xl max-h-48 overflow-y-auto">
                  {filteredModels.map((model) => (
                    <button
                      key={model}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setModelSearch(model);
                        handleChange('model', model);
                        setShowModelSuggestions(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
                    >
                      {model}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </fieldset>

        {/* Specs */}
        <fieldset>
          <legend className="text-sm font-semibold text-accent uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-accent rounded-full" />
            Specifications
          </legend>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="processor" className={labelClass}>Processor</label>
              <input id="processor" type="text" value={form.processor} onChange={(e) => handleChange('processor', e.target.value)} className={inputClass} placeholder="e.g. Intel Core i5" />
            </div>
            <div>
              <label htmlFor="generation" className={labelClass}>Generation</label>
              <input id="generation" type="number" min="1" value={form.generation} onChange={(e) => handleChange('generation', e.target.value)} className={inputClass} placeholder="e.g. 12" />
            </div>
            <div>
              <label htmlFor="ram_gb" className={labelClass}>RAM (GB)</label>
              <input id="ram_gb" type="number" min="1" value={form.ram_gb} onChange={(e) => handleChange('ram_gb', e.target.value)} className={inputClass} placeholder="e.g. 8" />
            </div>
          </div>
        </fieldset>

        {/* Storage */}
        <fieldset>
          <legend className="text-sm font-semibold text-accent uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-accent rounded-full" />
            Storage
          </legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="storage1_type" className={labelClass}>Storage 1 Type</label>
                <select id="storage1_type" value={form.storage1_type} onChange={(e) => handleChange('storage1_type', e.target.value)} className={inputClass}>
                  <option value="">Select...</option>
                  {dropdowns.storageTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="storage1_size_gb" className={labelClass}>Size (GB)</label>
                <input id="storage1_size_gb" type="number" min="0" value={form.storage1_size_gb} onChange={(e) => handleChange('storage1_size_gb', e.target.value)} className={inputClass} placeholder="e.g. 256" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="storage2_type" className={labelClass}>Storage 2 Type</label>
                <select id="storage2_type" value={form.storage2_type} onChange={(e) => handleChange('storage2_type', e.target.value)} className={inputClass}>
                  <option value="">None</option>
                  {dropdowns.storageTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="storage2_size_gb" className={labelClass}>Size (GB)</label>
                <input id="storage2_size_gb" type="number" min="0" value={form.storage2_size_gb} onChange={(e) => handleChange('storage2_size_gb', e.target.value)} className={inputClass} placeholder="e.g. 1000" />
              </div>
            </div>
          </div>
        </fieldset>

        {/* Display & Graphics */}
        <fieldset>
          <legend className="text-sm font-semibold text-accent uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-accent rounded-full" />
            Display & Graphics
          </legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="screen" className={labelClass}>Screen Type</label>
              <select id="screen" value={form.screen} onChange={(e) => handleChange('screen', e.target.value)} className={inputClass}>
                <option value="">Select...</option>
                <option value="Touch">Touch</option>
                <option value="Non-Touch">Non-Touch</option>
              </select>
            </div>
            <div>
              <label htmlFor="graphic_card" className={labelClass}>Graphic Card</label>
              <input id="graphic_card" type="text" value={form.graphic_card} onChange={(e) => handleChange('graphic_card', e.target.value)} className={inputClass} placeholder="Optional" />
            </div>
          </div>
        </fieldset>

        {/* Status & Location */}
        <fieldset>
          <legend className="text-sm font-semibold text-accent uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-accent rounded-full" />
            Status & Location
          </legend>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="status" className={labelClass}>Status *</label>
              <select id="status" required value={form.status} onChange={(e) => handleChange('status', e.target.value)} className={inputClass}>
                {(dropdowns.statuses.length > 0 ? dropdowns.statuses : ['Board', 'Part', 'Paint', 'Polarisation', 'Ready']).map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="location" className={labelClass}>Location *</label>
              <select id="location" required value={form.location} onChange={(e) => handleChange('location', e.target.value)} className={inputClass}>
                {(dropdowns.locations.length > 0 ? dropdowns.locations : ['In Stock', 'Sold', 'Rent', 'Repair', 'Paint', 'Polarisation', 'Scrap']).map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="checked_by" className={labelClass}>Checked By</label>
              <select id="checked_by" value={form.checked_by} onChange={(e) => handleChange('checked_by', e.target.value)} className={inputClass}>
                <option value="">Select user...</option>
                {dropdowns.users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          </div>
        </fieldset>

        {/* Remarks */}
        <div>
          <label htmlFor="remark" className={labelClass}>Remark</label>
          <textarea
            id="remark"
            value={form.remark}
            onChange={(e) => handleChange('remark', e.target.value)}
            className={`${inputClass} min-h-[80px] resize-y`}
            placeholder="Additional notes..."
            rows={3}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-primary">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2.5 rounded-lg border border-border-primary text-text-secondary hover:text-text-primary hover:bg-bg-hover text-sm font-medium transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-semibold transition-all disabled:opacity-50 relative overflow-hidden"
          >
            <span className={loading ? 'opacity-0' : ''}>
              {mode === 'create' ? 'Create Laptop' : 'Save Changes'}
            </span>
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
