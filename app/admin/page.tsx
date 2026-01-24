'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { StatusBadge } from '@/components/StatusBadge';
import { getActiveInventory } from '@/lib/actions/inventory';
import { updateInventory } from '@/lib/actions/admin';
import {
  Search,
  Download,
  AlertTriangle,
  Edit,
  Save,
  X,
  Plus,
  Trash2,
  Check,
} from 'lucide-react';

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  box_size: number;
  status: string;
  delivery_type: string;
  fresh_delivery: boolean;
  total_amount: number;
  notes: string;
  admin_notes: string;
  created_at: string;
  marked_delivered_at: string | null;
  locked_at: string | null;
  at_risk: boolean;
  payments: Array<{
    payment_type: string;
    status: string;
    paid_at: string;
  }>;
}

interface Extra {
  id: string;
  slug: string;
  name_no: string;
  name_en: string;
  description: string;
  description_no: string;
  description_en: string;
  price_nok: number;
  pricing_type: 'per_unit' | 'per_kg';
  consumes_inventory_kg: boolean;
  kg_per_unit: number;
  stock_quantity: number | null;
  display_order: number;
  active: boolean;
  created_at: string;
  updated_at?: string;
}

interface WaitlistEntry {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  created_at: string;
}

export default function AdminPage() {
  const { t } = useLanguage();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [activeTab, setActiveTab] = useState('inventory');
  const [loading, setLoading] = useState(true);

  const [kgRemaining, setKgRemaining] = useState('250');
  const [season, setSeason] = useState('høst_2024');
  const [inventoryLoading, setInventoryLoading] = useState(false);

  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState('');
  const [atRiskCount, setAtRiskCount] = useState(0);

  const [extras, setExtras] = useState<Extra[]>([]);
  const [extrasLoading, setExtrasLoading] = useState(false);
  const [editingExtra, setEditingExtra] = useState<Partial<Extra> | null>(null);
  const [isNewExtra, setIsNewExtra] = useState(false);
  const [showExtraDialog, setShowExtraDialog] = useState(false);

  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [waitlistLoading, setWaitlistLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      loadInitialData();
    }
  }, [isAuthenticated]);

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password === 'Pnei2792') {
      setIsAuthenticated(true);
      setPasswordError(false);
    } else {
      setPasswordError(true);
      setPassword('');
    }
  }

  async function loadInitialData() {
    try {
      const inventory = await getActiveInventory();
      if (inventory) {
        setKgRemaining(inventory.kgRemaining.toString());
        setSeason(inventory.season);
      }
      await loadOrders();
      await loadExtras();
      await loadWaitlist();
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadOrders() {
    setOrdersLoading(true);
    try {
      const response = await fetch('/api/admin/orders');
      const data = await response.json();
      setOrders(data.orders || []);
      calculateAtRiskOrders(data.orders || []);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setOrdersLoading(false);
    }
  }

  function calculateAtRiskOrders(ordersList: Order[]) {
    const count = ordersList.filter((order) => order.at_risk === true).length;
    setAtRiskCount(count);
  }

  async function loadExtras() {
    setExtrasLoading(true);
    try {
      const response = await fetch('/api/admin/extras');
      const data = await response.json();
      setExtras(data.extras || []);
    } catch (error) {
      console.error('Error loading extras:', error);
    } finally {
      setExtrasLoading(false);
    }
  }

  async function loadWaitlist() {
    setWaitlistLoading(true);
    try {
      const response = await fetch('/api/admin/waitlist');
      const data = await response.json();
      setWaitlist(data.waitlist || []);
    } catch (error) {
      console.error('Error loading waitlist:', error);
    } finally {
      setWaitlistLoading(false);
    }
  }

  async function handleUpdateInventory() {
    setInventoryLoading(true);
    try {
      const result = await updateInventory(season, parseInt(kgRemaining));
      if (result.success) {
        alert('Beholdning oppdatert');
      } else {
        alert('Feil: ' + result.error);
      }
    } catch (error) {
      alert('Kunne ikke oppdatere beholdning');
    } finally {
      setInventoryLoading(false);
    }
  }

  async function handleStatusChange(orderId: string, newStatus: string) {
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        await loadOrders();
      } else {
        alert('Kunne ikke oppdatere status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Kunne ikke oppdatere status');
    }
  }

  async function handleSaveNotes(orderId: string) {
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminNotes: editingNotes }),
      });

      if (response.ok) {
        await loadOrders();
        setEditingOrderId(null);
        setEditingNotes('');
      } else {
        alert('Kunne ikke lagre notater');
      }
    } catch (error) {
      console.error('Error saving notes:', error);
      alert('Kunne ikke lagre notater');
    }
  }

  async function handleMarkDelivered(orderId: string) {
    if (!confirm('Marker som levert?')) return;

    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markDelivered: true }),
      });

      if (response.ok) {
        await loadOrders();
      } else {
        alert('Kunne ikke markere som levert');
      }
    } catch (error) {
      console.error('Error marking delivered:', error);
      alert('Kunne ikke markere som levert');
    }
  }

  async function handleExportCSV() {
    try {
      const params = new URLSearchParams({ format: 'csv' });
      if (searchTerm) params.set('search', searchTerm);
      if (statusFilter !== 'all') params.set('status', statusFilter);

      window.location.href = `/api/admin/orders?${params.toString()}`;
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('Kunne ikke eksportere CSV');
    }
  }

  function openNewExtraDialog() {
    setEditingExtra({
      slug: '',
      name_no: '',
      name_en: '',
      description: '',
      description_no: '',
      description_en: '',
      price_nok: 0,
      pricing_type: 'per_unit',
      stock_quantity: null,
      display_order: 0,
      consumes_inventory_kg: false,
      kg_per_unit: 0,
      active: true,
    });
    setIsNewExtra(true);
    setShowExtraDialog(true);
  }

  function openEditExtraDialog(extra: Extra) {
    setEditingExtra(extra);
    setIsNewExtra(false);
    setShowExtraDialog(true);
  }

  async function handleSaveExtra() {
    if (!editingExtra) return;

    try {
      const url = isNewExtra
        ? '/api/admin/extras'
        : `/api/admin/extras/${editingExtra.id}`;
      const method = isNewExtra ? 'POST' : 'PATCH';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingExtra),
      });

      if (response.ok) {
        await loadExtras();
        setShowExtraDialog(false);
        setEditingExtra(null);
      } else {
        alert('Kunne ikke lagre');
      }
    } catch (error) {
      console.error('Error saving extra:', error);
      alert('Kunne ikke lagre');
    }
  }

  async function handleDeleteExtra(id: string) {
    if (!confirm('Er du sikker?')) return;

    try {
      const response = await fetch(`/api/admin/extras/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadExtras();
      } else {
        alert('Kunne ikke slette');
      }
    } catch (error) {
      console.error('Error deleting extra:', error);
      alert('Kunne ikke slette');
    }
  }

  async function handleDeleteWaitlistEntry(id: string) {
    if (!confirm('Slett fra venteliste?')) return;

    try {
      const response = await fetch(`/api/admin/waitlist?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadWaitlist();
      } else {
        alert('Kunne ikke slette');
      }
    } catch (error) {
      console.error('Error deleting waitlist entry:', error);
      alert('Kunne ikke slette');
    }
  }

  async function handleExportWaitlistCSV() {
    try {
      window.location.href = '/api/admin/waitlist?format=csv';
    } catch (error) {
      console.error('Error exporting waitlist CSV:', error);
      alert('Kunne ikke eksportere CSV');
    }
  }

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      searchTerm === '' ||
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-ice/20 via-white to-slate/10 px-4">
        <div className="glass-card-strong rounded-3xl p-12 w-full max-w-md border-2 border-white/80">
          <h1 className="text-4xl font-bold text-charcoal mb-2 text-center">Admin</h1>
          <p className="text-slate/70 mb-8 text-center">Skriv inn passord for å fortsette</p>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <Label htmlFor="admin-password" className="text-charcoal font-semibold">
                Passord
              </Label>
              <Input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2"
                autoFocus
                placeholder="••••••••"
              />
              {passwordError && (
                <p className="text-red-600 text-sm mt-2">Feil passord. Prøv igjen.</p>
              )}
            </div>
            <Button type="submit" className="w-full bg-gradient-to-r from-charcoal to-slate text-white hover:from-slate hover:to-charcoal">
              Logg inn
            </Button>
          </form>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-neutral-200 border-t-neutral-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-16 sm:py-24 bg-neutral-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl sm:text-5xl font-semibold mb-4">Admin</h1>

          {atRiskCount > 0 && (
            <Alert className="bg-amber-50 border-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-900">
                <strong>{atRiskCount}</strong> bestilling(er) med utestående restbetaling etter
                frist
              </AlertDescription>
            </Alert>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 max-w-2xl">
            <TabsTrigger value="inventory">Beholdning</TabsTrigger>
            <TabsTrigger value="orders">Bestillinger</TabsTrigger>
            <TabsTrigger value="extras">Tillegg</TabsTrigger>
            <TabsTrigger value="waitlist">Venteliste</TabsTrigger>
          </TabsList>

          <TabsContent value="inventory" className="mt-6">
            <Card className="p-6 sm:p-8 bg-white">
              <h2 className="text-2xl font-semibold mb-6">Lagerbeholdning</h2>
              <div className="max-w-md space-y-4">
                <div>
                  <Label htmlFor="season">Sesong</Label>
                  <Input
                    id="season"
                    value={season}
                    onChange={(e) => setSeason(e.target.value)}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="kg-remaining">Kilogram igjen</Label>
                  <Input
                    id="kg-remaining"
                    type="number"
                    value={kgRemaining}
                    onChange={(e) => setKgRemaining(e.target.value)}
                    className="mt-2"
                  />
                </div>
                <Button onClick={handleUpdateInventory} disabled={inventoryLoading}>
                  {inventoryLoading ? 'Lagrer...' : 'Oppdater beholdning'}
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="orders" className="mt-6 space-y-4">
            <Card className="p-4 bg-white">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <Input
                    placeholder="Søk etter ordre, navn eller e-post..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Filtrer status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle statuser</SelectItem>
                    <SelectItem value="draft">Utkast</SelectItem>
                    <SelectItem value="deposit_paid">Depositum betalt</SelectItem>
                    <SelectItem value="paid">Betalt</SelectItem>
                    <SelectItem value="ready_for_pickup">Klar for henting</SelectItem>
                    <SelectItem value="completed">Fullført</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleExportCSV} variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Eksporter CSV
                </Button>
              </div>
            </Card>

            <Card className="p-6 bg-white overflow-x-auto">
              {ordersLoading ? (
                <div className="text-center py-8">Laster...</div>
              ) : filteredOrders.length === 0 ? (
                <p className="text-neutral-500 text-center py-8">Ingen bestillinger funnet</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ordrenr</TableHead>
                      <TableHead>Kunde</TableHead>
                      <TableHead>Boks</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Betalinger</TableHead>
                      <TableHead>Admin notater</TableHead>
                      <TableHead>Handlinger</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((order) => {
                      const depositPaid = order.payments?.some(
                        (p) => p.payment_type === 'deposit' && p.status === 'completed'
                      );
                      const remainderPaid = order.payments?.some(
                        (p) => p.payment_type === 'remainder' && p.status === 'completed'
                      );
                      const isEditing = editingOrderId === order.id;

                      return (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">{order.order_number}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{order.customer_name}</p>
                              <p className="text-sm text-neutral-500">{order.customer_email}</p>
                            </div>
                          </TableCell>
                          <TableCell>{order.box_size} kg</TableCell>
                          <TableCell>
                            <Select
                              value={order.status}
                              onValueChange={(value) => handleStatusChange(order.id, value)}
                            >
                              <SelectTrigger className="w-[160px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="draft">Utkast</SelectItem>
                                <SelectItem value="deposit_paid">Depositum</SelectItem>
                                <SelectItem value="paid">Betalt</SelectItem>
                                <SelectItem value="ready_for_pickup">Klar</SelectItem>
                                <SelectItem value="completed">Fullført</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1 text-sm">
                              <div className={depositPaid ? 'text-green-600' : 'text-neutral-500'}>
                                {depositPaid ? '✓' : '○'} Depositum
                              </div>
                              <div
                                className={
                                  remainderPaid
                                    ? 'text-green-600'
                                    : order.at_risk
                                    ? 'text-red-600'
                                    : 'text-amber-600'
                                }
                              >
                                {remainderPaid ? '✓' : order.at_risk ? '✕' : '○'} Rest
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {isEditing ? (
                              <div className="space-y-2 min-w-[200px]">
                                <Textarea
                                  value={editingNotes}
                                  onChange={(e) => setEditingNotes(e.target.value)}
                                  rows={2}
                                  className="text-sm"
                                />
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => handleSaveNotes(order.id)}
                                  >
                                    <Save className="w-3 h-3 mr-1" />
                                    Lagre
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setEditingOrderId(null);
                                      setEditingNotes('');
                                    }}
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="min-w-[200px]">
                                <p className="text-sm text-neutral-600">
                                  {order.admin_notes || 'Ingen notater'}
                                </p>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingOrderId(order.id);
                                    setEditingNotes(order.admin_notes || '');
                                  }}
                                  className="mt-1"
                                >
                                  <Edit className="w-3 h-3 mr-1" />
                                  Rediger
                                </Button>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {order.marked_delivered_at ? (
                              <div className="text-sm text-green-600">
                                <Check className="w-4 h-4 inline mr-1" />
                                Levert
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleMarkDelivered(order.id)}
                              >
                                Marker levert
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="extras" className="mt-6">
            <Card className="p-6 bg-white">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold">Tilleggskatalog</h2>
                <Button onClick={openNewExtraDialog}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nytt tillegg
                </Button>
              </div>

              {extrasLoading ? (
                <div className="text-center py-8">Laster...</div>
              ) : extras.length === 0 ? (
                <p className="text-neutral-500 text-center py-8">Ingen tillegg ennå</p>
              ) : (
                <div className="space-y-4">
                  {extras.map((extra) => (
                    <div
                      key={extra.id}
                      className="border border-neutral-200 rounded-lg p-4 flex items-start justify-between"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold">{extra.name_no}</h3>
                          <span className="text-sm text-neutral-500">({extra.name_en})</span>
                          {!extra.active && (
                            <span className="text-xs bg-neutral-200 text-neutral-600 px-2 py-1 rounded">
                              Inaktiv
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-neutral-600 mb-2">{extra.description_no || extra.description}</p>
                        <div className="flex gap-6 text-sm">
                          <span>
                            <strong>Pris:</strong> kr {extra.price_nok}/{extra.pricing_type === 'per_kg' ? 'kg' : 'stk'}
                          </span>
                          <span>
                            <strong>Slug:</strong> {extra.slug}
                          </span>
                          {extra.stock_quantity && (
                            <span className="text-blue-600">
                              <strong>Lager:</strong> {extra.stock_quantity}
                            </span>
                          )}
                          {extra.consumes_inventory_kg && (
                            <span className="text-amber-600">
                              <strong>Bruker lager:</strong> {extra.kg_per_unit} kg
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditExtraDialog(extra)}
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteExtra(extra.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="waitlist" className="mt-6">
            <Card className="p-6 bg-white">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-semibold">Venteliste</h2>
                  <p className="text-sm text-neutral-600 mt-1">
                    {waitlist.length} person(er) på venteliste
                  </p>
                </div>
                <Button onClick={handleExportWaitlistCSV} variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Eksporter CSV
                </Button>
              </div>

              {waitlistLoading ? (
                <div className="text-center py-8">Laster...</div>
              ) : waitlist.length === 0 ? (
                <p className="text-neutral-500 text-center py-8">Ingen på venteliste</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>E-post</TableHead>
                      <TableHead>Navn</TableHead>
                      <TableHead>Telefon</TableHead>
                      <TableHead>Registrert</TableHead>
                      <TableHead>Handlinger</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {waitlist.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-medium">{entry.email}</TableCell>
                        <TableCell>{entry.name || '-'}</TableCell>
                        <TableCell>{entry.phone || '-'}</TableCell>
                        <TableCell>
                          {new Date(entry.created_at).toLocaleDateString('nb-NO', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteWaitlistEntry(entry.id)}
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Slett
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={showExtraDialog} onOpenChange={setShowExtraDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{isNewExtra ? 'Nytt tillegg' : 'Rediger tillegg'}</DialogTitle>
            </DialogHeader>
            {editingExtra && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Slug (unik ID)</Label>
                    <Input
                      value={editingExtra.slug}
                      onChange={(e) =>
                        setEditingExtra({ ...editingExtra, slug: e.target.value })
                      }
                      placeholder="indrefilet"
                    />
                  </div>
                  <div>
                    <Label>Pris (NOK)</Label>
                    <Input
                      type="number"
                      value={editingExtra.price_nok}
                      onChange={(e) =>
                        setEditingExtra({ ...editingExtra, price_nok: parseInt(e.target.value) })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Pristype</Label>
                    <select
                      value={editingExtra.pricing_type}
                      onChange={(e) =>
                        setEditingExtra({ ...editingExtra, pricing_type: e.target.value as 'per_unit' | 'per_kg' })
                      }
                      className="w-full h-10 px-3 py-2 border border-neutral-300 rounded-md"
                    >
                      <option value="per_unit">Per stykk</option>
                      <option value="per_kg">Per kg</option>
                    </select>
                  </div>
                  <div>
                    <Label>Rekkefølge (visning)</Label>
                    <Input
                      type="number"
                      value={editingExtra.display_order || 0}
                      onChange={(e) =>
                        setEditingExtra({ ...editingExtra, display_order: parseInt(e.target.value) })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Navn (Norsk)</Label>
                    <Input
                      value={editingExtra.name_no}
                      onChange={(e) =>
                        setEditingExtra({ ...editingExtra, name_no: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Name (English)</Label>
                    <Input
                      value={editingExtra.name_en}
                      onChange={(e) =>
                        setEditingExtra({ ...editingExtra, name_en: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div>
                  <Label>Beskrivelse (Norsk)</Label>
                  <Textarea
                    value={editingExtra.description_no || ''}
                    onChange={(e) =>
                      setEditingExtra({ ...editingExtra, description_no: e.target.value })
                    }
                    rows={2}
                    placeholder="Premium mør filet"
                  />
                </div>

                <div>
                  <Label>Description (English)</Label>
                  <Textarea
                    value={editingExtra.description_en || ''}
                    onChange={(e) =>
                      setEditingExtra({ ...editingExtra, description_en: e.target.value })
                    }
                    rows={2}
                    placeholder="Premium tender fillet"
                  />
                </div>

                <div>
                  <Label>Lagerbeholdning (valgfritt)</Label>
                  <Input
                    type="number"
                    value={editingExtra.stock_quantity || ''}
                    onChange={(e) =>
                      setEditingExtra({ ...editingExtra, stock_quantity: e.target.value ? parseInt(e.target.value) : null })
                    }
                    placeholder="La stå tom for ubegrenset"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="consumes"
                    checked={editingExtra.consumes_inventory_kg}
                    onCheckedChange={(checked) =>
                      setEditingExtra({
                        ...editingExtra,
                        consumes_inventory_kg: checked as boolean,
                      })
                    }
                  />
                  <Label htmlFor="consumes">Bruker lagerbeholdning</Label>
                </div>

                {editingExtra.consumes_inventory_kg && (
                  <div>
                    <Label>Kilogram per enhet</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={editingExtra.kg_per_unit}
                      onChange={(e) =>
                        setEditingExtra({
                          ...editingExtra,
                          kg_per_unit: parseFloat(e.target.value),
                        })
                      }
                    />
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="active"
                    checked={editingExtra.active}
                    onCheckedChange={(checked) =>
                      setEditingExtra({ ...editingExtra, active: checked as boolean })
                    }
                  />
                  <Label htmlFor="active">Aktiv (tilgjengelig for bestilling)</Label>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={() => setShowExtraDialog(false)}>
                    Avbryt
                  </Button>
                  <Button onClick={handleSaveExtra}>Lagre</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
