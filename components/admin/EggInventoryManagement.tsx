'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  Plus,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Check,
  X,
  Copy,
  Egg,
  AlertTriangle,
  Lock,
  Unlock,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

/* ── types ─────────────────────────────────────────────────────────── */

interface Breed {
  id: string;
  name: string;
  slug: string;
  accent_color: string;
}

interface InventoryItem {
  id: string;
  breed_id: string;
  year: number;
  week_number: number;
  delivery_monday: string;
  eggs_available: number;
  eggs_allocated: number;
  eggs_remaining: number;
  status: string;
  egg_breeds: Breed;
}

interface WeekRow {
  year: number;
  week_number: number;
  delivery_monday: string;
  items: Record<string, InventoryItem>; // breed_id → item
}

/* ── helpers ───────────────────────────────────────────────────────── */

function groupByWeek(items: InventoryItem[]): WeekRow[] {
  const map = new Map<string, WeekRow>();

  for (const item of items) {
    const key = `${item.year}-${item.week_number}`;
    if (!map.has(key)) {
      map.set(key, {
        year: item.year,
        week_number: item.week_number,
        delivery_monday: item.delivery_monday,
        items: {},
      });
    }
    map.get(key)!.items[item.breed_id] = item;
  }

  return Array.from(map.values()).sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.week_number - b.week_number;
  });
}

function cellColor(item: InventoryItem | undefined): string {
  if (!item) return 'bg-neutral-50 text-neutral-300';
  if (item.status === 'closed') return 'bg-neutral-100 text-neutral-400';
  if (item.status === 'locked') return 'bg-orange-50 text-orange-600';
  const pct = item.eggs_available > 0 ? (item.eggs_allocated / item.eggs_available) * 100 : 0;
  if (item.status === 'sold_out' || pct >= 100) return 'bg-red-50 text-red-700';
  if (pct >= 80) return 'bg-amber-50 text-amber-700';
  return 'bg-green-50 text-green-700';
}

function statusBadge(status: string, copy: any) {
  const map: Record<string, { bg: string; label: string }> = {
    open: { bg: 'bg-green-100 text-green-800', label: copy.statusValues.open },
    sold_out: { bg: 'bg-red-100 text-red-800', label: copy.statusValues.soldOut },
    closed: { bg: 'bg-neutral-200 text-neutral-600', label: copy.statusValues.closed },
    locked: { bg: 'bg-orange-100 text-orange-800', label: copy.statusValues.locked },
  };
  const s = map[status] || map.closed;
  return (
    <span className={cn('text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded-md', s.bg)}>
      {s.label}
    </span>
  );
}

/* ── main component ────────────────────────────────────────────────── */

export function EggInventoryManagement() {
  const { t, lang } = useLanguage();
  const copy = t.eggInventoryManagement;
  const ei = (t as any).admin.eggInventory;
  const locale = lang === 'en' ? 'en-US' : 'nb-NO';

  const [breeds, setBreeds] = useState<Breed[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit panel (appears below the table row)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [editCapacity, setEditCapacity] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Collapsed months
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set());

  // Add week form
  const [showAddForm, setShowAddForm] = useState(false);
  const [addFormData, setAddFormData] = useState({
    week_number: '',
    year: String(new Date().getFullYear()),
    delivery_monday: '',
    eggs_per_breed: {} as Record<string, string>,
  });

  // Bulk actions
  const [selectedWeeks, setSelectedWeeks] = useState<Set<string>>(new Set()); // "year-week"

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [breedsRes, invRes] = await Promise.all([
        fetch('/api/eggs/breeds'),
        fetch('/api/admin/eggs/inventory'),
      ]);
      if (breedsRes.ok) {
        const breedsData = await breedsRes.json();
        setBreeds(breedsData);
      }
      if (invRes.ok) {
        const invData = await invRes.json();
        setInventory(invData);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }

  const weekRows = useMemo(() => groupByWeek(inventory), [inventory]);

  // Group weeks by month for collapsible sections
  const monthGroups = useMemo(() => {
    const groups = new Map<string, WeekRow[]>();
    for (const row of weekRows) {
      const d = new Date(row.delivery_monday);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(row);
    }
    return groups;
  }, [weekRows]);

  // Summary stats
  const summary = useMemo(() => {
    const now = new Date();
    const futureItems = inventory.filter(
      (i) => new Date(i.delivery_monday) >= now
    );
    const openItems = futureItems.filter((i) => i.status === 'open');
    const totalAvailable = openItems.reduce((s, i) => s + i.eggs_available, 0);
    const totalAllocated = openItems.reduce((s, i) => s + i.eggs_allocated, 0);
    const totalRemaining = openItems.reduce((s, i) => s + i.eggs_remaining, 0);
    const soldOutCount = futureItems.filter(
      (i) => i.status === 'sold_out' || (i.eggs_available > 0 && i.eggs_remaining <= 0)
    ).length;
    const lowStockBreeds = breeds
      .map((breed) => {
        const breedItems = openItems.filter((i) => i.breed_id === breed.id);
        const remaining = breedItems.reduce((s, i) => s + i.eggs_remaining, 0);
        return { breed, remaining };
      })
      .filter((b) => b.remaining <= 5 && b.remaining >= 0)
      .sort((a, b) => a.remaining - b.remaining);

    return {
      totalAvailable,
      totalAllocated,
      totalRemaining,
      activeWeeks: new Set(openItems.map((i) => `${i.year}-${i.week_number}`)).size,
      soldOutCount,
      lowStockBreeds,
    };
  }, [inventory, breeds]);

  /* ── edit panel handlers ─────────────────────────────────────── */

  function openEditPanel(item: InventoryItem) {
    if (editingItem?.id === item.id) {
      setEditingItem(null);
      return;
    }
    setEditingItem(item);
    setEditCapacity(String(item.eggs_available));
    setEditStatus(item.status);
  }

  function closeEditPanel() {
    setEditingItem(null);
    setEditCapacity('');
    setEditStatus('');
  }

  async function saveEditPanel() {
    if (!editingItem) return;
    const newCapacity = parseInt(editCapacity, 10);
    if (isNaN(newCapacity) || newCapacity < 0) return;

    const updates: any = {};
    if (newCapacity !== editingItem.eggs_available) updates.eggs_available = newCapacity;
    if (editStatus !== editingItem.status) updates.status = editStatus;
    if (Object.keys(updates).length === 0) {
      closeEditPanel();
      return;
    }

    setSavingEdit(true);
    try {
      const res = await fetch(`/api/admin/eggs/inventory/${editingItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) await loadData();
    } catch (e) {
      console.error('Failed to save:', e);
    } finally {
      setSavingEdit(false);
      closeEditPanel();
    }
  }

  /* ── bulk close/open ──────────────────────────────────────────── */

  async function bulkSetStatus(status: 'open' | 'closed') {
    const itemIds: string[] = [];
    for (const weekKey of Array.from(selectedWeeks)) {
      const row = weekRows.find((r) => `${r.year}-${r.week_number}` === weekKey);
      if (row) {
        for (const item of Object.values(row.items)) {
          itemIds.push(item.id);
        }
      }
    }
    try {
      await Promise.all(
        itemIds.map((id) =>
          fetch(`/api/admin/eggs/inventory/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status }),
          })
        )
      );
      setSelectedWeeks(new Set());
      await loadData();
    } catch (e) {
      console.error('Bulk action failed:', e);
    }
  }

  /* ── add week (all breeds at once) ────────────────────────────── */

  async function handleAddWeek(e: React.FormEvent) {
    e.preventDefault();
    const weekNum = parseInt(addFormData.week_number, 10);
    const year = parseInt(addFormData.year, 10);
    if (!weekNum || !year || !addFormData.delivery_monday) return;

    try {
      const promises = breeds.map((breed) => {
        const eggs = parseInt(addFormData.eggs_per_breed[breed.id] || '0', 10);
        if (eggs <= 0) return null;
        return fetch('/api/admin/eggs/inventory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            breed_id: breed.id,
            year,
            week_number: weekNum,
            delivery_monday: addFormData.delivery_monday,
            eggs_available: eggs,
            status: 'open',
          }),
        });
      });
      await Promise.all(promises.filter(Boolean));
      setShowAddForm(false);
      setAddFormData({
        week_number: '',
        year: String(new Date().getFullYear()),
        delivery_monday: '',
        eggs_per_breed: {},
      });
      await loadData();
    } catch (e) {
      console.error('Failed to add week:', e);
    }
  }

  /* ── clone last week ──────────────────────────────────────────── */

  async function cloneLastWeek() {
    if (weekRows.length === 0) return;
    const lastWeek = weekRows[weekRows.length - 1];
    const nextWeekNum = lastWeek.week_number >= 52 ? 1 : lastWeek.week_number + 1;
    const nextYear = lastWeek.week_number >= 52 ? lastWeek.year + 1 : lastWeek.year;
    const lastMonday = new Date(lastWeek.delivery_monday);
    const nextMonday = new Date(lastMonday.getTime() + 7 * 24 * 60 * 60 * 1000);
    const nextMondayStr = nextMonday.toISOString().split('T')[0];

    try {
      const promises = Object.values(lastWeek.items).map((item) =>
        fetch('/api/admin/eggs/inventory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            breed_id: item.breed_id,
            year: nextYear,
            week_number: nextWeekNum,
            delivery_monday: nextMondayStr,
            eggs_available: item.eggs_available,
            status: 'open',
          }),
        })
      );
      await Promise.all(promises);
      await loadData();
    } catch (e) {
      console.error('Failed to clone week:', e);
    }
  }

  /* ── month collapse toggle ────────────────────────────────────── */

  function toggleMonth(monthKey: string) {
    setCollapsedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(monthKey)) next.delete(monthKey);
      else next.add(monthKey);
      return next;
    });
  }

  /* ── week row selection ───────────────────────────────────────── */

  function toggleWeekSelection(weekKey: string) {
    setSelectedWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(weekKey)) next.delete(weekKey);
      else next.add(weekKey);
      return next;
    });
  }

  /* ── render ───────────────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-12 h-12 border-4 border-neutral-200 border-t-neutral-600 rounded-full animate-spin" />
      </div>
    );
  }

  const monthFormatter = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      {/* ── header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">{copy.title}</h2>
          <p className="text-sm text-neutral-500 mt-0.5">{copy.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={loadData} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-1.5" />
            {copy.refreshButton}
          </Button>
          <Button size="sm" variant="outline" onClick={cloneLastWeek} disabled={weekRows.length === 0}>
            <Copy className="w-4 h-4 mr-1.5" />
            {ei.cloneLastWeek}
          </Button>
          <Button size="sm" onClick={() => setShowAddForm(!showAddForm)}>
            <Plus className="w-4 h-4 mr-1.5" />
            {copy.addWeekButton}
          </Button>
        </div>
      </div>

      {/* ── summary dashboard ───────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-neutral-500 mb-1">
            {ei.labelActiveWeeks}
          </p>
          <p className="text-2xl font-bold text-neutral-900">{summary.activeWeeks}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-neutral-500 mb-1">
            {ei.labelAvailable}
          </p>
          <p className="text-2xl font-bold text-neutral-900">{summary.totalAvailable}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-neutral-500 mb-1">
            {copy.allocatedLabel}
          </p>
          <p className="text-2xl font-bold text-neutral-900">{summary.totalAllocated}</p>
        </div>
        <div className={cn('rounded-xl border p-4', summary.totalRemaining <= 20 ? 'border-red-200 bg-red-50' : 'border-neutral-200 bg-white')}>
          <p className="text-[11px] uppercase tracking-[0.2em] text-neutral-500 mb-1">
            {ei.labelRemaining}
          </p>
          <p className={cn('text-2xl font-bold', summary.totalRemaining <= 20 ? 'text-red-700' : 'text-neutral-900')}>
            {summary.totalRemaining}
          </p>
        </div>
        <div className={cn('rounded-xl border p-4', summary.soldOutCount > 0 ? 'border-amber-200 bg-amber-50' : 'border-neutral-200 bg-white')}>
          <p className="text-[11px] uppercase tracking-[0.2em] text-neutral-500 mb-1">
            {ei.labelSoldOut}
          </p>
          <p className={cn('text-2xl font-bold', summary.soldOutCount > 0 ? 'text-amber-700' : 'text-neutral-900')}>
            {summary.soldOutCount}
          </p>
        </div>
      </div>

      {/* Low stock warnings */}
      {summary.lowStockBreeds.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800">
            <span className="font-semibold">{ei.warningLowStock}</span>
            {summary.lowStockBreeds.map((b) => `${b.breed.name} (${b.remaining} ${ei.warningEggsLabel})`).join(', ')}
          </p>
        </div>
      )}

      {/* ── bulk actions bar ────────────────────────────────────── */}
      {selectedWeeks.size > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
          <p className="text-sm font-medium text-blue-800">
            {ei.bulkSelectedWeeks.replace('{count}', String(selectedWeeks.size))}
          </p>
          <div className="flex gap-2 ml-auto">
            <Button size="sm" variant="outline" onClick={() => bulkSetStatus('closed')}>
              <Lock className="w-3.5 h-3.5 mr-1" />
              {ei.bulkCloseAll}
            </Button>
            <Button size="sm" variant="outline" onClick={() => bulkSetStatus('open')}>
              <Unlock className="w-3.5 h-3.5 mr-1" />
              {ei.bulkOpenAll}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedWeeks(new Set())}>
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* ── add week form ───────────────────────────────────────── */}
      {showAddForm && (
        <Card className="p-5 border border-neutral-200 bg-neutral-50">
          <form onSubmit={handleAddWeek} className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-neutral-900">{copy.addWeekTitle}</h3>
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-xs">{copy.weekNumberLabel}</Label>
                <Input
                  type="number"
                  value={addFormData.week_number}
                  onChange={(e) => setAddFormData({ ...addFormData, week_number: e.target.value })}
                  className="mt-1"
                  min="1"
                  max="53"
                />
              </div>
              <div>
                <Label className="text-xs">{copy.yearLabel}</Label>
                <Input
                  type="number"
                  value={addFormData.year}
                  onChange={(e) => setAddFormData({ ...addFormData, year: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">{copy.deliveryMondayLabel}</Label>
                <Input
                  type="date"
                  value={addFormData.delivery_monday}
                  onChange={(e) => setAddFormData({ ...addFormData, delivery_monday: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs mb-2 block">{ei.labelEggsPerBreed}</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {breeds.map((breed) => (
                  <div key={breed.id} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: breed.accent_color }}
                    />
                    <span className="text-sm text-neutral-700 min-w-[100px]">{breed.name}</span>
                    <Input
                      type="number"
                      min="0"
                      className="w-20 h-8 text-sm"
                      placeholder="0"
                      value={addFormData.eggs_per_breed[breed.id] || ''}
                      onChange={(e) =>
                        setAddFormData({
                          ...addFormData,
                          eggs_per_breed: {
                            ...addFormData.eggs_per_breed,
                            [breed.id]: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowAddForm(false)}>
                {ei.buttonCancel}
              </Button>
              <Button type="submit" size="sm">
                {copy.createWeekButton}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* ── week table ──────────────────────────────────────────── */}
      {weekRows.length === 0 ? (
        <Card className="p-12 text-center">
          <Egg className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
          <p className="text-lg font-semibold text-neutral-900 mb-2">{copy.emptyTitle}</p>
          <p className="text-sm text-neutral-500 mb-4">{copy.emptySubtitle}</p>
          <Button size="sm" onClick={() => setShowAddForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {copy.addFirstWeekButton}
          </Button>
        </Card>
      ) : (
        <div className="border border-neutral-200 rounded-xl overflow-hidden bg-white">
          {/* Sticky header */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200">
                  <th className="text-left px-3 py-3 text-[11px] uppercase tracking-[0.15em] text-neutral-500 font-semibold w-10">
                    {/* checkbox col */}
                  </th>
                  <th className="text-left px-3 py-3 text-[11px] uppercase tracking-[0.15em] text-neutral-500 font-semibold whitespace-nowrap">
                    {ei.tableHeaderWeek}
                  </th>
                  <th className="text-left px-3 py-3 text-[11px] uppercase tracking-[0.15em] text-neutral-500 font-semibold whitespace-nowrap">
                    {ei.tableHeaderDelivery}
                  </th>
                  {breeds.map((breed) => (
                    <th
                      key={breed.id}
                      className="text-center px-3 py-3 text-[11px] uppercase tracking-[0.15em] font-semibold whitespace-nowrap"
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: breed.accent_color }}
                        />
                        <span className="text-neutral-600">{breed.name}</span>
                      </div>
                    </th>
                  ))}
                  <th className="text-center px-3 py-3 text-[11px] uppercase tracking-[0.15em] text-neutral-500 font-semibold whitespace-nowrap">
                    {ei.tableHeaderTotal}
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* Breed totals row (sticky) */}
                <tr className="bg-neutral-50/50 border-b border-neutral-100">
                  <td className="px-3 py-2" />
                  <td className="px-3 py-2 text-[11px] uppercase tracking-[0.15em] text-neutral-400 font-semibold" colSpan={2}>
                    {ei.tableHeaderRemainingTotal}
                  </td>
                  {breeds.map((breed) => {
                    const total = inventory
                      .filter((i) => i.breed_id === breed.id && i.status === 'open')
                      .reduce((s, i) => s + i.eggs_remaining, 0);
                    return (
                      <td key={breed.id} className="text-center px-3 py-2">
                        <span className={cn(
                          'text-xs font-bold',
                          total <= 5 ? 'text-red-600' : total <= 15 ? 'text-amber-600' : 'text-neutral-700'
                        )}>
                          {total}
                        </span>
                      </td>
                    );
                  })}
                  <td className="text-center px-3 py-2">
                    <span className="text-xs font-bold text-neutral-900">
                      {summary.totalRemaining}
                    </span>
                  </td>
                </tr>

                {/* Month groups */}
                {Array.from(monthGroups.entries()).map(([monthKey, rows]) => {
                  const isCollapsed = collapsedMonths.has(monthKey);
                  const monthDate = new Date(rows[0].delivery_monday);
                  const monthLabel = monthFormatter.format(monthDate);
                  const monthTotal = rows.reduce((sum, row) =>
                    sum + Object.values(row.items).reduce((s, i) => s + i.eggs_remaining, 0), 0
                  );
                  const allPast = rows.every((r) => new Date(r.delivery_monday) < new Date());

                  return [
                    /* month header row */
                    <tr
                      key={`month-${monthKey}`}
                      className={cn(
                        'cursor-pointer hover:bg-neutral-50 border-b border-neutral-100',
                        allPast && 'opacity-60'
                      )}
                      onClick={() => toggleMonth(monthKey)}
                    >
                      <td className="px-3 py-2.5" colSpan={3 + breeds.length + 1}>
                        <div className="flex items-center gap-2">
                          {isCollapsed ? (
                            <ChevronRight className="w-4 h-4 text-neutral-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-neutral-400" />
                          )}
                          <span className="text-sm font-semibold text-neutral-700 capitalize">
                            {monthLabel}
                          </span>
                          <span className="text-xs text-neutral-400">
                            {ei.monthWeeksLabel.replace('{count}', String(rows.length))} · {ei.monthEggsLeft.replace('{count}', String(monthTotal))}
                          </span>
                        </div>
                      </td>
                    </tr>,

                    /* week rows within month */
                    ...(!isCollapsed
                      ? rows.map((row) => {
                          const weekKey = `${row.year}-${row.week_number}`;
                          const isSelected = selectedWeeks.has(weekKey);
                          const rowTotal = Object.values(row.items).reduce(
                            (s, i) => s + i.eggs_remaining,
                            0
                          );
                          const rowAllocated = Object.values(row.items).reduce(
                            (s, i) => s + i.eggs_allocated,
                            0
                          );
                          const rowAvailable = Object.values(row.items).reduce(
                            (s, i) => s + i.eggs_available,
                            0
                          );
                          const isPast = new Date(row.delivery_monday) < new Date();

                          return (
                          <React.Fragment key={weekKey}>
                            <tr
                              className={cn(
                                'border-b border-neutral-100 transition-colors',
                                isSelected && 'bg-blue-50/50',
                                isPast && 'opacity-50',
                                !isPast && 'hover:bg-neutral-50/50'
                              )}
                            >
                              {/* checkbox */}
                              <td className="px-3 py-2">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleWeekSelection(weekKey)}
                                  className="rounded border-neutral-300 text-blue-600 w-3.5 h-3.5"
                                />
                              </td>
                              {/* week */}
                              <td className="px-3 py-2 whitespace-nowrap">
                                <span className="font-medium text-neutral-900">
                                  {ei.weekAbbrev} {row.week_number}
                                </span>
                              </td>
                              {/* delivery date */}
                              <td className="px-3 py-2 whitespace-nowrap">
                                <span className="text-neutral-500 text-xs">
                                  {new Date(row.delivery_monday).toLocaleDateString(locale, {
                                    day: 'numeric',
                                    month: 'short',
                                  })}
                                </span>
                              </td>
                              {/* breed cells */}
                              {breeds.map((breed) => {
                                const item = row.items[breed.id];
                                if (!item) {
                                  return (
                                    <td key={breed.id} className="text-center px-1 py-1.5">
                                      <div className="mx-auto rounded-lg bg-neutral-50 text-neutral-300 text-xs py-1.5 px-2 w-[72px]">
                                        —
                                      </div>
                                    </td>
                                  );
                                }

                                const isActive = editingItem?.id === item.id;

                                return (
                                  <td key={breed.id} className="text-center px-1 py-1.5">
                                    <button
                                      onClick={() => !isPast && openEditPanel(item)}
                                      disabled={isPast}
                                      className={cn(
                                        'mx-auto rounded-lg text-xs font-medium py-1.5 px-2 w-[72px] transition-all',
                                        !isPast && 'hover:ring-2 hover:ring-neutral-300 cursor-pointer',
                                        isPast && 'cursor-default',
                                        isActive && 'ring-2 ring-blue-400',
                                        cellColor(item)
                                      )}
                                    >
                                      <div className="leading-tight">
                                        <span>{item.eggs_allocated}/{item.eggs_available}</span>
                                      </div>
                                      <div className="mt-0.5">
                                        {statusBadge(item.status, copy)}
                                      </div>
                                    </button>
                                  </td>
                                );
                              })}
                              {/* row total */}
                              <td className="text-center px-3 py-2">
                                <div className="text-xs">
                                  <span className="font-bold text-neutral-800">
                                    {rowAllocated}/{rowAvailable}
                                  </span>
                                  <div className="w-full bg-neutral-200 rounded-full h-1 mt-1 mx-auto max-w-[60px]">
                                    <div
                                      className={cn(
                                        'h-1 rounded-full transition-all',
                                        rowAvailable > 0 && rowAllocated / rowAvailable >= 0.9
                                          ? 'bg-red-500'
                                          : rowAvailable > 0 && rowAllocated / rowAvailable >= 0.7
                                          ? 'bg-amber-500'
                                          : 'bg-green-500'
                                      )}
                                      style={{
                                        width: `${rowAvailable > 0 ? Math.min((rowAllocated / rowAvailable) * 100, 100) : 0}%`,
                                      }}
                                    />
                                  </div>
                                </div>
                              </td>
                            </tr>
                            {/* Edit panel row */}
                            {editingItem && Object.values(row.items).some((i) => i.id === editingItem.id) && (
                              <tr key={`edit-${weekKey}`} className="border-b border-blue-200 bg-blue-50/30">
                                <td colSpan={3 + breeds.length + 1} className="px-4 py-3">
                                  <div className="flex items-center gap-4 flex-wrap">
                                    <div className="flex items-center gap-2">
                                      <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: editingItem.egg_breeds.accent_color }}
                                      />
                                      <span className="text-sm font-semibold text-neutral-800">
                                        {editingItem.egg_breeds.name}
                                      </span>
                                      <span className="text-xs text-neutral-500">
                                        — {ei.weekLabel} {editingItem.week_number}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Label className="text-xs text-neutral-600">
                                        {ei.editPanelCapacity}
                                      </Label>
                                      <Input
                                        type="number"
                                        min="0"
                                        value={editCapacity}
                                        onChange={(e) => setEditCapacity(e.target.value)}
                                        className="w-20 h-8 text-sm"
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') saveEditPanel();
                                          if (e.key === 'Escape') closeEditPanel();
                                        }}
                                      />
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Label className="text-xs text-neutral-600">
                                        {copy.statusLabel}:
                                      </Label>
                                      <select
                                        value={editStatus}
                                        onChange={(e) => setEditStatus(e.target.value)}
                                        className="border border-neutral-300 rounded-lg px-2 py-1.5 text-xs h-8"
                                      >
                                        <option value="open">{copy.statusValues.open}</option>
                                        <option value="closed">{copy.statusValues.closed}</option>
                                        <option value="locked">{copy.statusValues.locked}</option>
                                        <option value="sold_out">{copy.statusValues.soldOut}</option>
                                      </select>
                                    </div>
                                    <div className="flex items-center gap-1 text-xs text-neutral-500">
                                      <span>{ei.editPanelAllocated.replace('{count}', String(editingItem.eggs_allocated))}</span>
                                      <span>·</span>
                                      <span>{ei.editPanelRemaining.replace('{count}', String(editingItem.eggs_remaining))}</span>
                                    </div>
                                    <div className="flex items-center gap-2 ml-auto">
                                      <Button size="sm" variant="outline" onClick={closeEditPanel}>
                                        {ei.buttonCancel}
                                      </Button>
                                      <Button size="sm" onClick={saveEditPanel} disabled={savingEdit}>
                                        <Check className="w-3.5 h-3.5 mr-1" />
                                        {savingEdit ? ei.buttonSaving : ei.buttonSave}
                                      </Button>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                          );
                        })
                      : []),
                  ];
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── legend ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-4 text-[11px] text-neutral-500 px-1">
        <span className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-green-50 border border-green-200" />
          {ei.legendAvailable}
        </span>
        <span className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-amber-50 border border-amber-200" />
          {ei.legendAlmostFull}
        </span>
        <span className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-red-50 border border-red-200" />
          {ei.legendSoldOut}
        </span>
        <span className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-neutral-100 border border-neutral-200" />
          {ei.legendClosed}
        </span>
        <span className="text-neutral-400">·</span>
        <span>{ei.legendHelp}</span>
      </div>
    </div>
  );
}
