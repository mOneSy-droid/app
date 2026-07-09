import React, { useState, useEffect, useMemo } from 'react';
import logoImg from '../assets/images/1e1b7427-be65-4259-9138-0c35a07d43ef_removalai_preview.png';
import {
  Users,
  TrendingUp,
  DollarSign,
  Calendar,
  Phone,
  Globe,
  LogOut,
  Plus,
  RefreshCw,
  Menu,
  X,
  AlertCircle,
  User,
  Target,
  Sparkles,
  Receipt,
  Search
} from 'lucide-react';

interface Consultant {
  id: number;
  name: string;
  username?: string | null;
  phone?: string | null;
  email?: string | null;
  joinedAt: string;
}

interface Client {
  id: number;
  consultantId: number;
  name: string;
  phone: string;
  country: string;
  paymentType: string;
  amount: number;
  receiptPhotoId: string;
  confirmedAt: string;
  status: string;
}

interface ConsultantStats {
  today: { count: number; revenue: number };
  weekly: { count: number; revenue: number };
  monthly: { count: number; revenue: number };
  total: { count: number; revenue: number };
}

interface ConsultantDashboardProps {
  token: string;
  consultantId: number;
  onLogout: () => void;
  apiFetch: (endpoint: string, options?: any) => Promise<any>;
}

// Kunlik shartli maqsad — "Bugungi maqsad" halqasi shu songa nisbatan to'ladi.
// Sof motivatsion element: consultant har kuni nechta klient qo'shishga yaqinligini ko'radi.
const DAILY_GOAL = 5;

// Davlat nomiga qarab barqaror (doim bir xil) gradient chip rangi tanlaydi —
// aniq bayroq bazasi bo'lmasa ham ro'yxat rangdor va farqlanadigan bo'lib qoladi.
const COUNTRY_CHIPS = [
  'from-blue-500/25 to-blue-700/25 text-blue-300 border-blue-400/20',
  'from-emerald-500/25 to-emerald-700/25 text-emerald-300 border-emerald-400/20',
  'from-amber-500/25 to-amber-700/25 text-amber-300 border-amber-400/20',
  'from-fuchsia-500/25 to-fuchsia-700/25 text-fuchsia-300 border-fuchsia-400/20',
  'from-cyan-500/25 to-cyan-700/25 text-cyan-300 border-cyan-400/20',
  'from-rose-500/25 to-rose-700/25 text-rose-300 border-rose-400/20',
];
function countryChipClass(country: string) {
  let hash = 0;
  for (let i = 0; i < country.length; i++) hash = (hash * 31 + country.charCodeAt(i)) >>> 0;
  return COUNTRY_CHIPS[hash % COUNTRY_CHIPS.length];
}

export default function ConsultantDashboard({ token, consultantId, onLogout, apiFetch }: ConsultantDashboardProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'clients' | 'profile'>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Data
  const [consultant, setConsultant] = useState<Consultant | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [stats, setStats] = useState<ConsultantStats | null>(null);

  // Form states
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientCountry, setNewClientCountry] = useState('');
  const [newClientPayment, setNewClientPayment] = useState('');
  const [newClientAmount, setNewClientAmount] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [clientSearch, setClientSearch] = useState('');

  // Toast
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Load data
  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const [consultantData, clientsData, statsData] = await Promise.all([
        apiFetch(`/api/consultants`).then((all: Consultant[]) => all.find(c => c.id === consultantId)),
        apiFetch(`/api/admin/consultants/${consultantId}/clients`),
        apiFetch(`/api/consultants/${consultantId}/stats`)
      ]);
      setConsultant(consultantData);
      setClients(clientsData || []);
      setStats(statsData);
    } catch (err) {
      console.error('Data loading error:', err);
      showToast('Ma\'lumotlarni yuklab bo\'lmadi', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [consultantId]);

  // Add new client
  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim() || !newClientPhone.trim() || !newClientCountry.trim() || !newClientPayment.trim() || !newClientAmount.trim()) {
      showToast('Barcha maydonlarni to\'ldiring', 'error');
      return;
    }
    if (!receiptFile) {
      showToast('To\'lov chekining rasmini yuklang', 'error');
      return;
    }
    try {
      setFormLoading(true);
      const formData = new FormData();
      formData.append('consultantId', String(consultantId));
      formData.append('name', newClientName.trim());
      formData.append('phone', newClientPhone.trim());
      formData.append('country', newClientCountry.trim());
      formData.append('paymentType', newClientPayment.trim());
      formData.append('amount', newClientAmount);
      formData.append('receipt', receiptFile);
      const res = await apiFetch('/api/admin/clients', {
        method: 'POST',
        body: formData
      });
      if (res.success) {
        showToast('Klient qo\'shildi', 'success');
        setNewClientName('');
        setNewClientPhone('');
        setNewClientCountry('');
        setNewClientPayment('');
        setNewClientAmount('');
        setReceiptFile(null);
        setShowNewClientForm(false);
        loadData(true);
      }
    } catch (err: any) {
      showToast(err.message || 'Xatolik yuz berdi', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const openSignedReceipt = async (clientId: number) => {
    try {
      const data = await apiFetch(`/api/file-access/clients/receipt/${clientId}`);
      if (data?.url) {
        window.open(data.url, '_blank', 'noopener,noreferrer');
      }
    } catch {
      window.open(`/api/clients/receipt/${clientId}`, '_blank', 'noopener,noreferrer');
    }
  };

  const formatCurrency = (val: number) => {
    return val.toLocaleString('uz-UZ') + ' so\'m';
  };

  const initials = useMemo(() => {
    if (!consultant?.name) return 'C';
    return consultant.name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  }, [consultant?.name]);

  const goalPercent = stats ? Math.min(100, Math.round((stats.today.count / DAILY_GOAL) * 100)) : 0;
  const ringRadius = 46;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference - (goalPercent / 100) * ringCircumference;

  const filteredClients = useMemo(() => {
    const q = clientSearch.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(c => c.name.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q) || c.country.toLowerCase().includes(q));
  }, [clients, clientSearch]);

  const tabLabels: Record<typeof activeTab, string> = {
    dashboard: 'Bugun sizni yutuqlar kutmoqda',
    clients: 'Klientlaringiz shu yerda jamlangan',
    profile: 'Shaxsiy profil va identifikatsiya'
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--bg-shell-2)]">
        <div className="text-center animate-fadeIn">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-2 border-[#D6B174]/20" />
            <RefreshCw className="w-16 h-16 text-[#D6B174] animate-spin p-3" />
          </div>
          <p className="text-[var(--text-muted)] font-semibold">Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-shell-2)] text-[var(--text-primary)] flex flex-col lg:flex-row relative overflow-hidden">
      {/* Ambient dekorativ nur — sahifaga chuqurlik beradi, funksional emas */}
      <div className="pointer-events-none fixed -top-32 -right-24 w-[28rem] h-[28rem] rounded-full bg-[#D6B174]/10 blur-3xl animate-float" />
      <div className="pointer-events-none fixed bottom-0 left-1/4 w-72 h-72 rounded-full bg-[#D6B174]/5 blur-3xl" />

      {/* Sidebar */}
      <aside className="relative z-10 w-full lg:w-72 bg-gradient-to-b from-[var(--bg-shell-2)] to-[var(--bg-card)] border-b lg:border-b-0 lg:border-r border-white/10 flex flex-col">
        <div className="p-4 lg:p-6 flex items-center justify-between lg:block border-b border-white/5">
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="EDUVISA" className="h-9 w-9 object-contain rounded-xl" referrerPolicy="no-referrer" />
            <div>
              <span className="text-[#D6B174] text-xl font-bold font-display">EDUVISA</span>
              <p className="text-[var(--text-muted)] text-[9px] uppercase tracking-widest mt-0.5">Consultant Studio</p>
            </div>
          </div>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden text-white/85">
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Consultant mini identifikatsiya kartasi */}
        <div className="hidden lg:block mx-4 mt-5 p-4 rounded-2xl dark-card">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#D6B174] to-[#8A6A3A] flex items-center justify-center font-bold text-[#031222] text-sm shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-[var(--text-primary)] truncate">{consultant?.name || 'Consultant'}</p>
              <p className="text-[10px] text-[var(--text-muted)] truncate">@{consultant?.username || 'username yo\'q'}</p>
            </div>
          </div>
          {stats && (
            <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-[10px]">
              <span className="text-[var(--text-muted)]">Bugungi natija</span>
              <span className="font-bold text-[#D6B174]">{stats.today.count}/{DAILY_GOAL}</span>
            </div>
          )}
        </div>

        <nav className={`flex-1 px-3 py-4 space-y-0.5 ${mobileMenuOpen ? 'block' : 'hidden'} lg:block`}>
          {[
            { key: 'dashboard', label: 'Bosh sahifa', icon: TrendingUp },
            { key: 'clients', label: 'Mening klientlarim', icon: Users },
            { key: 'profile', label: 'Profil', icon: User }
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => { setActiveTab(key as any); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all ${
                activeTab === key ? 'text-[var(--text-primary)] bg-[#D6B174]/10 border-l-4 border-[#D6B174]' : 'text-white/50 hover:text-[var(--text-primary)] hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4 text-[#D6B174]" />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="border-t border-white/5 p-4 lg:p-5">
          <button onClick={onLogout} className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors text-xs font-bold">
            <LogOut className="w-4 h-4" />
            <span>Chiqish</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="relative z-10 flex-1 p-5 lg:p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          {/* Hero Header */}
          <div className="flex items-start lg:items-center justify-between mb-8 gap-4 flex-col lg:flex-row animate-fadeIn">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#D6B174] flex items-center gap-1.5 mb-1">
                <Sparkles className="w-3 h-3" /> Xush kelibsiz, {consultant?.name?.split(' ')[0] || 'Consultant'}
              </p>
              <h1 className="text-2xl lg:text-3xl font-bold font-display gold-text">
                {activeTab === 'dashboard' && 'Dashboard'}
                {activeTab === 'clients' && 'Mening klientlarim'}
                {activeTab === 'profile' && 'Profil'}
              </h1>
              <p className="text-[var(--text-muted)] text-sm mt-1">{tabLabels[activeTab]}</p>
            </div>
            <button onClick={() => loadData(true)} disabled={refreshing} className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-[#D6B174]/10 border border-[#D6B174]/20 hover:bg-[#D6B174]/20 transition-all self-start lg:self-auto">
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Yangilash
            </button>
          </div>

          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && stats && (
            <div className="space-y-6">
              {/* Signature: Kunlik maqsad halqasi + eng muhim ko'rsatkichlar */}
              <div className="glass-card p-6 flex flex-col md:flex-row items-center gap-6 animate-scaleUp">
                <div className="relative w-32 h-32 shrink-0">
                  <svg viewBox="0 0 100 100" className="w-32 h-32 -rotate-90">
                    <circle cx="50" cy="50" r={ringRadius} fill="none" stroke="var(--hairline-strong)" strokeWidth="8" />
                    <circle
                      cx="50" cy="50" r={ringRadius} fill="none"
                      stroke="url(#goalGradient)" strokeWidth="8" strokeLinecap="round"
                      strokeDasharray={ringCircumference}
                      strokeDashoffset={ringOffset}
                      style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
                    />
                    <defs>
                      <linearGradient id="goalGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#F0CFA0" />
                        <stop offset="100%" stopColor="#B99056" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <Target className="w-4 h-4 text-[#D6B174] mb-0.5" />
                    <span className="text-xl font-bold text-[var(--text-primary)]">{stats.today.count}</span>
                    <span className="text-[9px] text-[var(--text-muted)] uppercase tracking-wide">/{DAILY_GOAL} maqsad</span>
                  </div>
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1">Bugungi maqsad — {goalPercent}%</h3>
                  <p className="text-[var(--text-muted)] text-xs leading-relaxed max-w-md">
                    {goalPercent >= 100
                      ? 'Ajoyib! Bugungi maqsadga yetdingiz — davom eting va yangi rekord qo\'ying.'
                      : `Bugun yana ${Math.max(0, DAILY_GOAL - stats.today.count)} ta klient qo'shsangiz, kunlik maqsadga yetasiz.`}
                  </p>
                  <div className="flex items-center justify-center md:justify-start gap-4 mt-4 text-xs">
                    <div>
                      <p className="text-[var(--text-muted)] text-[10px] uppercase">Bu hafta</p>
                      <p className="font-bold text-[var(--text-primary)]">{stats.weekly.count} ta</p>
                    </div>
                    <div className="w-px h-8 bg-white/10" />
                    <div>
                      <p className="text-[var(--text-muted)] text-[10px] uppercase">Bu oy</p>
                      <p className="font-bold text-[var(--text-primary)]">{stats.monthly.count} ta</p>
                    </div>
                    <div className="w-px h-8 bg-white/10" />
                    <div>
                      <p className="text-[var(--text-muted)] text-[10px] uppercase">Jami</p>
                      <p className="font-bold text-[#D6B174]">{stats.total.count} ta</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Bugun', value: stats.today.count, icon: Calendar, color: 'from-blue-600 to-blue-800' },
                  { label: 'Bu hafta', value: stats.weekly.count, icon: TrendingUp, color: 'from-emerald-600 to-emerald-800' },
                  { label: 'Bu oy', value: stats.monthly.count, icon: Calendar, color: 'from-amber-600 to-amber-800' },
                  { label: 'Umumiy', value: stats.total.count, icon: Users, color: 'from-purple-600 to-purple-800' }
                ].map(({ label, value, icon: Icon, color }, i) => (
                  <div key={label} className="p-4 rounded-2xl dark-card hover:border-[#D6B174]/30 hover:-translate-y-0.5 transition-all animate-fadeIn" style={{ animationDelay: `${i * 60}ms` }}>
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center mb-2`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-[var(--text-muted)] text-xs font-bold uppercase">{label}</p>
                    <h3 className="text-2xl font-bold mt-1">{value}</h3>
                  </div>
                ))}
              </div>

              {/* Revenue Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Bugun', revenue: stats.today.revenue },
                  { label: 'Bu hafta', revenue: stats.weekly.revenue },
                  { label: 'Bu oy', revenue: stats.monthly.revenue },
                  { label: 'Umumiy', revenue: stats.total.revenue }
                ].map(({ label, revenue }, i) => (
                  <div key={label} className="p-4 rounded-2xl dark-card hover:border-[#D6B174]/30 transition-all animate-fadeIn" style={{ animationDelay: `${i * 60 + 200}ms` }}>
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="w-5 h-5 text-[#D6B174]" />
                      <p className="text-[var(--text-muted)] text-xs font-bold uppercase">{label}</p>
                    </div>
                    <h3 className="text-xl font-bold gold-text">{formatCurrency(revenue)}</h3>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Clients Tab */}
          {activeTab === 'clients' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                <button onClick={() => setShowNewClientForm(!showNewClientForm)} className="btn-gold flex items-center justify-center gap-2 w-full sm:w-auto">
                  <Plus className="w-4 h-4" />
                  Yangi klient qo'shish
                </button>
                {clients.length > 0 && (
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input value={clientSearch} onChange={e => setClientSearch(e.target.value)} placeholder="Klient qidirish..."
                      className="input-dark pl-9" />
                  </div>
                )}
              </div>

              {/* Add Client Form */}
              {showNewClientForm && (
                <form onSubmit={handleAddClient} className="p-5 rounded-2xl glass-card space-y-4 animate-scaleUp">
                  <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#D6B174]" /> Yangi klient
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input value={newClientName} onChange={e => setNewClientName(e.target.value)} placeholder="Ism" required className="input-dark" />
                    <input value={newClientPhone} onChange={e => setNewClientPhone(e.target.value)} placeholder="Telefon" required className="input-dark" />
                    <input value={newClientCountry} onChange={e => setNewClientCountry(e.target.value)} placeholder="Davlat" required className="input-dark" />
                    <input value={newClientPayment} onChange={e => setNewClientPayment(e.target.value)} placeholder="To'lov turi (Karta, Click, va h.k.)" required className="input-dark" />
                    <input value={newClientAmount} onChange={e => setNewClientAmount(e.target.value)} placeholder="Summa (so'm)" type="number" required className="input-dark md:col-span-2" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[var(--text-muted)] block mb-2">
                      To'lov chekining rasmi <span className="text-red-400">*</span> <span className="font-normal normal-case text-[10px]">(majburiy)</span>
                    </label>
                    <input type="file" accept="image/*" required onChange={e => setReceiptFile(e.target.files?.[0] || null)}
                      className={`w-full text-xs text-[var(--text-muted)] file:mr-3 file:px-4 file:py-2 file:rounded-xl file:border-0 file:bg-[#D6B174]/15 file:text-[#D6B174] file:font-bold file:text-xs rounded-xl border p-1 ${receiptFile ? 'border-white/10' : 'border-red-400/40'}`} />
                    {receiptFile ? (
                      <p className="text-[10px] text-emerald-400 mt-1">✓ {receiptFile.name}</p>
                    ) : (
                      <p className="text-[10px] text-red-400/80 mt-1">To'lov chekining rasmi yuklanmaguncha klient qo'shib bo'lmaydi</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" disabled={formLoading || !receiptFile || !newClientName.trim() || !newClientPhone.trim() || !newClientCountry.trim() || !newClientPayment.trim() || !newClientAmount.trim()}
                      className="flex-1 btn-gold disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none">
                      {formLoading ? 'Saqlanmoqda...' : 'Qo\'shish'}
                    </button>
                    <button type="button" onClick={() => setShowNewClientForm(false)} className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-[var(--text-primary)] font-bold text-sm hover:bg-white/10 transition-all">
                      Bekor
                    </button>
                  </div>
                </form>
              )}

              {/* Clients List */}
              <div className="space-y-3">
                {clients.length === 0 ? (
                  <div className="p-10 rounded-2xl dark-card text-center text-[var(--text-muted)] animate-fadeIn">
                    <AlertCircle className="w-8 h-8 mx-auto mb-3 opacity-50" />
                    <p className="text-sm font-semibold text-[var(--text-primary)]">Hozircha klientlar mavjud emas</p>
                    <p className="text-xs mt-1">Birinchi klientingizni qo'shib, kunlik maqsadga yaqinlashing.</p>
                  </div>
                ) : filteredClients.length === 0 ? (
                  <div className="p-6 rounded-2xl dark-card text-center text-[var(--text-muted)] text-xs">
                    "{clientSearch}" bo'yicha hech narsa topilmadi
                  </div>
                ) : (
                  filteredClients.map((client, i) => (
                    <div key={client.id} className="p-4 rounded-2xl dark-card hover:border-[#D6B174]/30 hover:-translate-y-0.5 transition-all animate-fadeIn" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#D6B174]/40 to-[#8A6A3A]/40 flex items-center justify-center text-[10px] font-bold text-[#D6B174] shrink-0 mt-0.5">
                            {client.name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-[var(--text-primary)] truncate">{client.name}</h4>
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
                              <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {client.phone}</span>
                              <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r border text-[10px] font-bold ${countryChipClass(client.country)}`}>
                                <Globe className="w-3 h-3" /> {client.country}
                              </span>
                              <span className="flex items-center gap-1 font-bold text-[#D6B174]"><DollarSign className="w-3 h-3" /> {formatCurrency(client.amount)}</span>
                            </div>
                            <button type="button" onClick={() => void openSignedReceipt(client.id)}
                              className="inline-flex items-center gap-1 mt-2 text-[10px] font-bold text-[#D6B174] hover:underline">
                              <Receipt className="w-3 h-3" /> Chekni ko'rish
                            </button>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-400 font-bold">{client.status}</span>
                          <p className="text-[10px] text-[var(--text-muted)] mt-2">{new Date(client.confirmedAt).toLocaleDateString('uz-UZ')}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && consultant && (
            <div className="space-y-6 animate-fadeIn">
              {/* Identifikatsiya kartasi — a'zolik kartasi uslubida */}
              <div className="relative overflow-hidden rounded-2xl p-6 dark-card">
                <div className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 rounded-full bg-[#D6B174]/10 blur-2xl" />
                <div className="flex items-center gap-4 relative">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#D6B174] to-[#8A6A3A] flex items-center justify-center font-bold text-[#031222] text-xl shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg font-bold font-display gold-text truncate">{consultant.name}</h3>
                    <p className="text-[var(--text-muted)] text-xs mt-0.5">@{consultant.username || 'username belgilanmagan'}</p>
                    <div className="mt-2 text-[10px] text-[var(--text-muted)] space-y-1">
                      {consultant.phone && <p>Telefon: <span className="text-[var(--text-primary)]">{consultant.phone}</span></p>}
                      {consultant.email && <p>Email: <span className="text-[var(--text-primary)]">{consultant.email}</span></p>}
                    </div>
                    <span className="inline-block mt-2 text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full bg-[#D6B174]/10 text-[#D6B174] border border-[#D6B174]/20">
                      Eduvisa Consultant
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-2xl dark-card">
                <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4 uppercase tracking-wide">Profil ma'lumotlari</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between py-2 border-b border-white/5">
                    <span className="text-[var(--text-muted)]">Ism</span>
                    <span className="font-bold text-[var(--text-primary)]">{consultant.name}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-white/5">
                    <span className="text-[var(--text-muted)]">Telegram ID</span>
                    <span className="font-mono text-[var(--text-primary)]">{consultant.id}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-white/5">
                    <span className="text-[var(--text-muted)]">Username</span>
                    <span className="text-[var(--text-primary)]">@{consultant.username || "Belgilanmagan"}</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-[var(--text-muted)]">Qo'shilgan sana</span>
                    <span className="text-[var(--text-primary)]">{new Date(consultant.joinedAt).toLocaleDateString('uz-UZ')}</span>
                  </div>
                </div>
              </div>

              {stats && (
                <div className="p-6 rounded-2xl dark-card">
                  <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4 uppercase tracking-wide">Umumiy natijalar</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div className="rounded-2xl border border-white/10 p-4">
                      <p className="text-[var(--text-muted)] text-xs uppercase tracking-wide">Jami tasdiqlangan klientlar</p>
                      <p className="text-2xl font-bold text-[var(--text-primary)] mt-2">{stats.total.count} ta</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 p-4">
                      <p className="text-[var(--text-muted)] text-xs uppercase tracking-wide">Jami aylanma</p>
                      <p className="text-2xl font-bold gold-text mt-2">{formatCurrency(stats.total.revenue)}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 p-4">
                      <p className="text-[var(--text-muted)] text-xs uppercase tracking-wide">Oxirgi 30 kun</p>
                      <p className="text-2xl font-bold text-[var(--text-primary)] mt-2">{stats.monthly.count} ta</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 p-4">
                      <p className="text-[var(--text-muted)] text-xs uppercase tracking-wide">Oylik aylanma</p>
                      <p className="text-2xl font-bold gold-text mt-2">{formatCurrency(stats.monthly.revenue)}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg font-semibold text-sm transition-all animate-slideIn z-50 ${
          toast.type === 'success' ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400' : 'bg-red-500/20 border border-red-500/30 text-red-400'
        }`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
