/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Search, LogOut, Phone, MessageSquare, Bell, 
  Wrench, Trash2, Edit2, Calendar, ChevronRight, 
  ArrowUpCircle, FileText, RefreshCw, CheckCircle2,
  AlertCircle, Clock, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import * as XLSX from 'xlsx';
import { User, Vehicle, MAKES, OILS } from './types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- HELPERS ---
const getDays = (ds: string | null) => {
  if (!ds) return null;
  const d = new Date(ds);
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.floor((d.getTime() - t.getTime()) / 86400000);
};

const fmt = (ds: string | null) => {
  if (!ds) return '—';
  const [y, m, d] = ds.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d} ${months[parseInt(m) - 1]} ${y}`;
};

const nsd = () => {
  const d = new Date();
  d.setDate(d.getDate() + 90);
  return d.toISOString().split('T')[0];
};

export default function App() {
  const [splash, setSplash] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [page, setPage] = useState<'vehicles' | 'due'>('vehicles');
  const [search, setSearch] = useState('');
  const [makeFilter, setMakeFilter] = useState('');
  const [dueFilter, setDueFilter] = useState<'ov' | 'td' | 'wk' | 'mo'>('ov');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [modal, setModal] = useState<{ type: 'add' | 'edit' | 'detail' | 'svc' | 'import'; id?: string } | null>(null);

  // Auth States
  const [authTab, setAuthTab] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [garageName, setGarageName] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setSplash(false), 1500);
    const savedUser = localStorage.getItem('gm_user');
    if (savedUser) {
      const u = JSON.parse(savedUser);
      setUser(u);
      fetchVehicles(u.email);
    }
    return () => clearTimeout(timer);
  }, []);

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchVehicles = async (email: string) => {
    setSyncing(true);
    try {
      const res = await fetch(`/api/vehicles?email=${email}`);
      const data = await res.json();
      setVehicles(data);
      setLastSync(new Date());
    } catch (err) {
      showToast('Failed to sync data', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password })
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        localStorage.setItem('gm_user', JSON.stringify(data.user));
        fetchVehicles(data.user.email);
        showToast('Welcome back!');
      } else {
        showToast(data.error || 'Login failed', 'error');
      }
    } catch (err) {
      showToast('Connection error', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password, garageName })
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        localStorage.setItem('gm_user', JSON.stringify(data.user));
        setVehicles([]);
        showToast('Account created!');
      } else {
        showToast(data.error || 'Signup failed', 'error');
      }
    } catch (err) {
      showToast('Connection error', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (confirm('Logout?')) {
      setUser(null);
      localStorage.removeItem('gm_user');
      setVehicles([]);
    }
  };

  const exportExcel = () => {
    if (!vehicles.length) {
      showToast('No data to export', 'info');
      return;
    }
    const data = vehicles.map((c, i) => ({
      'Sr': i + 1,
      'Name': c.name,
      'Mobile': c.mobile,
      'Vehicle No': c.vn,
      'Make': c.make,
      'Model': c.model,
      'Date': c.date,
      'KM': c.km || '',
      'Next Service': c.sdd,
      'Last Oil': c.lob || '',
      'Bill ₹': c.lb || ''
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), 'Customers');
    XLSX.writeFile(wb, `Garage_${user?.garageName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
    showToast('Excel downloaded!');
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete ${name}?`)) return;
    try {
      await fetch(`/api/vehicles/${id}`, { method: 'DELETE' });
      setVehicles(prev => prev.filter(v => v.id !== id));
      showToast('Vehicle deleted');
    } catch (err) {
      showToast('Failed to delete', 'error');
    }
  };

  const filteredVehicles = useMemo(() => {
    return vehicles.filter(v => {
      const matchesSearch = !search || 
        v.name.toLowerCase().includes(search.toLowerCase()) || 
        v.mobile.includes(search) || 
        v.vn.toLowerCase().includes(search.toLowerCase());
      const matchesMake = !makeFilter || v.make === makeFilter;
      return matchesSearch && matchesMake;
    });
  }, [vehicles, search, makeFilter]);

  const stats = useMemo(() => {
    const overdue = vehicles.filter(v => (getDays(v.sdd) ?? 0) < 0);
    const today = vehicles.filter(v => getDays(v.sdd) === 0);
    const week = vehicles.filter(v => {
      const d = getDays(v.sdd);
      return d !== null && d > 0 && d <= 7;
    });
    const month = vehicles.filter(v => {
      const d = getDays(v.sdd);
      return d !== null && d > 7 && d <= 30;
    });
    return { overdue, today, week, month };
  }, [vehicles]);

  const sendWhatsApp = (v: Vehicle, msg: string) => {
    window.open(`https://wa.me/91${v.mobile}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const sendReminder = (v: Vehicle) => {
    const d = getDays(v.sdd);
    const note = d !== null && d < 0 
      ? `⚠️ Service is *OVERDUE* by ${Math.abs(d)} days! Please visit us soon.`
      : d === 0 
        ? `🔔 Your vehicle service is due *TODAY*! Please visit us.`
        : d !== null && d <= 7 
          ? `⏰ Service is due in *${d} days* on *${fmt(v.sdd)}*.`
          : `📅 Next service: *${fmt(v.sdd)}* (in ${d} days)`;
    
    const msg = `Hello ${v.name}! 🙏\n\nReminder from *${user?.garageName}*\n\n🏍️ *${v.vn}* — ${v.make} ${v.model}${v.km ? `\n📊 KM: ${Number(v.km).toLocaleString()}` : ''}\n\n📅 Last Service: *${fmt(v.date)}*\n📅 Due Date: *${fmt(v.sdd)}*\n\n${note}\n\nCall us to book your appointment! 🙌`;
    sendWhatsApp(v, msg);
  };

  if (splash) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-bg to-[#1e1b4b] flex flex-col items-center justify-center z-[9999]">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-20 h-20 rounded-3xl bg-gradient-to-br from-acc2 to-acc flex items-center justify-center shadow-[0_0_50px_rgba(225,29,72,0.5)] mb-5"
        >
          <Wrench className="text-white w-10 h-10" />
        </motion.div>
        <h1 className="text-2xl font-extrabold tracking-[3px] mb-1.5">GARAGE MANAGER</h1>
        <p className="text-txt2 text-xs">Smart vehicle service tracking</p>
        <div className="w-[200px] h-[3px] bg-s1 rounded-full mt-10 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-acc to-acc2 rounded-full animate-fill" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-5 bg-[radial-gradient(ellipse_at_20%_50%,rgba(67,56,202,0.2)_0%,transparent_60%),radial-gradient(ellipse_at_80%_20%,rgba(225,29,72,0.12)_0%,transparent_60%)] bg-bg">
        <div className="w-full max-w-[360px]">
          <div className="text-center mb-7">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-acc2 to-acc flex items-center justify-center shadow-[0_0_50px_rgba(225,29,72,0.5)] mx-auto mb-4">
              <Wrench className="text-white w-10 h-10" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-[2px]">GARAGE MANAGER</h1>
            <p className="text-txt2 text-xs mt-1">Sign in to manage your garage</p>
          </div>
          
          <div className="bg-s1 border border-bdr rounded-[20px] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.5)]">
            <div className="flex bg-bg rounded-xl p-1 mb-5">
              <button 
                className={cn("flex-1 py-2 rounded-lg font-bold text-sm transition-all", authTab === 'login' ? "bg-acc text-white shadow-[0_2px_14px_rgba(225,29,72,0.4)]" : "text-txt2")}
                onClick={() => setAuthTab('login')}
              >
                Login
              </button>
              <button 
                className={cn("flex-1 py-2 rounded-lg font-bold text-sm transition-all", authTab === 'signup' ? "bg-acc text-white shadow-[0_2px_14px_rgba(225,29,72,0.4)]" : "text-txt2")}
                onClick={() => setAuthTab('signup')}
              >
                Sign Up
              </button>
            </div>

            <form onSubmit={authTab === 'login' ? handleLogin : handleSignup} className="space-y-4">
              {authTab === 'signup' && (
                <div>
                  <label className="block text-[11px] font-bold text-txt2 tracking-wider uppercase mb-1">Garage Name</label>
                  <input 
                    className="w-full px-4 py-3 bg-bg border-1.5 border-bdr rounded-xl text-txt focus:outline-none focus:border-acc" 
                    placeholder="e.g. Sharma Auto Works"
                    value={garageName}
                    onChange={e => setGarageName(e.target.value)}
                    required
                  />
                </div>
              )}
              <div>
                <label className="block text-[11px] font-bold text-txt2 tracking-wider uppercase mb-1">Email</label>
                <input 
                  type="email"
                  className="w-full px-4 py-3 bg-bg border-1.5 border-bdr rounded-xl text-txt focus:outline-none focus:border-acc" 
                  placeholder="your@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-txt2 tracking-wider uppercase mb-1">Password</label>
                <input 
                  type="password"
                  className="w-full px-4 py-3 bg-bg border-1.5 border-bdr rounded-xl text-txt focus:outline-none focus:border-acc" 
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>
              {authTab === 'signup' && (
                <div>
                  <label className="block text-[11px] font-bold text-txt2 tracking-wider uppercase mb-1">Confirm Password</label>
                  <input 
                    type="password"
                    className="w-full px-4 py-3 bg-bg border-1.5 border-bdr rounded-xl text-txt focus:outline-none focus:border-acc" 
                    placeholder="Repeat password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              )}
              <button 
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-br from-acc to-[#be123c] rounded-xl text-white font-bold text-base shadow-[0_4px_20px_rgba(225,29,72,0.35)] active:scale-95 transition-transform disabled:opacity-50"
              >
                {loading ? 'Processing...' : authTab === 'login' ? 'Login →' : 'Create Account →'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col pb-20">
      {/* HEADER */}
      <header className="bg-s1 border-b border-bdr p-3 sticky top-0 z-[100]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-acc2 to-acc flex items-center justify-center shrink-0">
              <Wrench className="text-white w-5 h-5" />
            </div>
            <div>
              <div className="text-[15px] font-extrabold tracking-wider">{user.garageName.toUpperCase()}</div>
              <div className="flex items-center gap-1.5 mt-1">
                <div className={cn("w-1.5 h-1.5 rounded-full", syncing ? "bg-blue animate-pdot" : "bg-green")} />
                <div className="text-[10px] text-txt2 font-semibold">
                  {syncing ? 'Syncing...' : `Synced · ${lastSync ? fmtSyncTime(lastSync) : 'Just now'}`}
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              className="w-9 h-9 rounded-xl border border-bdr flex items-center justify-center transition-transform active:scale-90 text-green"
              onClick={exportExcel}
              title="Export to Excel"
            >
              <FileText className="w-4 h-4" />
            </button>
            <button 
              className={cn("w-9 h-9 rounded-xl border border-bdr flex items-center justify-center transition-transform active:scale-90", syncing && "animate-spin-slow")}
              onClick={() => fetchVehicles(user.email)}
            >
              <RefreshCw className="w-4 h-4 text-blue" />
            </button>
            <button 
              className="w-9 h-9 rounded-xl border border-bdr flex items-center justify-center transition-transform active:scale-90 text-acc"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <div className="text-[11px] text-txt2 mt-2 mb-1">
          {vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''}
          {stats.overdue.length > 0 && (
            <span className="text-acc ml-1.5">· {stats.overdue.length} overdue</span>
          )}
        </div>

        <div className="flex gap-2 mt-2.5">
          <div className="flex-1 relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-txt2 w-4 h-4 pointer-events-none" />
            <input 
              className="w-full pl-9 pr-3 py-2.5 bg-bg border-1.5 border-bdr rounded-xl text-txt text-sm focus:outline-none focus:border-acc" 
              placeholder="Search name, phone, vehicle no..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select 
            className="bg-bg border-1.5 border-bdr rounded-xl text-txt px-3 py-2.5 text-xs min-w-[110px] focus:outline-none focus:border-acc"
            value={makeFilter}
            onChange={e => setMakeFilter(e.target.value)}
          >
            <option value="">All Makes</option>
            {Object.keys(MAKES).map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </header>

      {/* CONTENT */}
      <main className="flex-1 p-3">
        {page === 'vehicles' ? (
          <div className="space-y-2.5">
            {filteredVehicles.length === 0 ? (
              <div className="text-center py-16 text-txt2">
                <Wrench className="w-16 h-16 mx-auto opacity-15 mb-4" />
                <div className="text-lg font-bold text-slate-400 mb-1.5">
                  {vehicles.length ? 'No results' : 'No Vehicles Yet'}
                </div>
                <p className="text-sm">
                  {vehicles.length ? 'Try a different search' : 'Tap + to add your first customer'}
                </p>
              </div>
            ) : (
              filteredVehicles.map(v => (
                <VehicleCard 
                  key={v.id} 
                  vehicle={v} 
                  onDetail={() => setModal({ type: 'detail', id: v.id })}
                  onEdit={() => setModal({ type: 'edit', id: v.id })}
                  onDelete={() => handleDelete(v.id, v.name)}
                  onService={() => setModal({ type: 'svc', id: v.id })}
                  onRemind={() => sendReminder(v)}
                />
              ))
            )}
          </div>
        ) : (
          <DueDashboard 
            stats={stats} 
            filter={dueFilter} 
            setFilter={setDueFilter} 
            garageName={user.garageName}
            onService={(id) => setModal({ type: 'svc', id })}
            onRemind={(v) => sendReminder(v)}
          />
        )}
      </main>

      {/* BOTTOM NAV */}
      <nav className="fixed bottom-0 left-0 right-0 bg-s1 border-t border-bdr flex z-50 pb-[env(safe-area-inset-bottom)]">
        <button 
          className={cn("flex-1 py-3 flex flex-col items-center gap-1 text-[10px] font-bold uppercase tracking-wider transition-colors", page === 'vehicles' ? "text-acc" : "text-txt2")}
          onClick={() => setPage('vehicles')}
        >
          <Wrench className={cn("w-5 h-5 transition-transform", page === 'vehicles' && "scale-110")} />
          Vehicles
        </button>
        <button 
          className="flex-1 -top-2.5 relative flex flex-col items-center gap-1 text-[10px] font-bold text-white uppercase tracking-wider"
          onClick={() => setModal({ type: 'add' })}
        >
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-acc to-[#be123c] flex items-center justify-center shadow-[0_6px_20px_rgba(225,29,72,0.5)] active:scale-90 transition-transform">
            <Plus className="w-6 h-6 stroke-[3]" />
          </div>
          Add
        </button>
        <button 
          className={cn("flex-1 py-3 flex flex-col items-center gap-1 text-[10px] font-bold uppercase tracking-wider transition-colors", page === 'due' ? "text-acc" : "text-txt2")}
          onClick={() => setPage('due')}
        >
          <Calendar className={cn("w-5 h-5 transition-transform", page === 'due' && "scale-110")} />
          Due
        </button>
      </nav>

      {/* MODALS */}
      <AnimatePresence>
        {modal && (
          <Modal 
            modal={modal} 
            onClose={() => setModal(null)} 
            vehicles={vehicles}
            setVehicles={setVehicles}
            userEmail={user.email}
            garageName={user.garageName}
            showToast={showToast}
          />
        )}
      </AnimatePresence>

      {/* TOAST */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 10, x: '-50%' }}
            className="fixed bottom-24 left-1/2 bg-s1 border border-bdr text-txt px-6 py-2.5 rounded-full text-sm font-semibold z-[9999] whitespace-nowrap shadow-2xl"
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- SUB-COMPONENTS ---

interface VehicleCardProps {
  key?: React.Key;
  vehicle: Vehicle;
  onDetail: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onService: () => void;
  onRemind: () => void;
}

function VehicleCard({ vehicle, onDetail, onEdit, onDelete, onService, onRemind }: VehicleCardProps) {
  const d = getDays(vehicle.sdd);
  const isOverdue = d !== null && d < 0;
  const isDueSoon = d !== null && d >= 0 && d <= 7;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "bg-s1 border-1.5 border-bdr rounded-2xl p-3.5 cursor-pointer active:scale-[0.985] transition-transform",
        isOverdue ? "border-l-4 border-l-acc" : isDueSoon ? "border-l-4 border-l-gold" : ""
      )}
      onClick={onDetail}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="font-bold text-[15px] flex items-center gap-1.5 flex-wrap">
            {vehicle.name}
            {isOverdue ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-acc/20 text-red-400">Overdue</span>
            ) : d === 0 ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gold/20 text-yellow-400">Due Today</span>
            ) : isDueSoon ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gold/20 text-yellow-400">In {d}d</span>
            ) : (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green/15 text-emerald-400">OK</span>
            )}
          </div>
          <div className="text-xs text-txt2">{vehicle.mobile}</div>
          <div className="text-xs font-bold text-rose-500 tracking-widest mt-0.5 uppercase">{vehicle.vn}</div>
        </div>
        <div className="flex items-center gap-1">
          <button 
            className="w-8 h-8 rounded-lg bg-blue/10 text-blue-400 flex items-center justify-center active:scale-90 transition-transform"
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button 
            className="w-8 h-8 rounded-lg bg-acc/10 text-red-400 flex items-center justify-center active:scale-90 transition-transform"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      
      <div className="inline-block text-[11px] font-bold bg-acc2/20 text-indigo-400 px-2.5 py-1 rounded-md mb-2">
        {vehicle.make} · {vehicle.model}
      </div>

      <div className="flex gap-1.5">
        <button 
          className="flex-1 py-2 rounded-lg bg-blue/15 text-blue-400 text-[11px] font-bold flex items-center justify-center gap-1 active:scale-95 transition-transform"
          onClick={(e) => { e.stopPropagation(); window.location.href = `tel:${vehicle.mobile}`; }}
        >
          <Phone className="w-3 h-3" /> Call
        </button>
        <button 
          className="flex-1 py-2 rounded-lg bg-green/12 text-emerald-400 text-[11px] font-bold flex items-center justify-center gap-1 active:scale-95 transition-transform"
          onClick={(e) => { e.stopPropagation(); onRemind(); }}
        >
          <Bell className="w-3 h-3" /> Remind
        </button>
        <button 
          className="flex-1 py-2 rounded-lg bg-purple-500/15 text-purple-400 text-[11px] font-bold flex items-center justify-center gap-1 active:scale-95 transition-transform"
          onClick={(e) => { e.stopPropagation(); onService(); }}
        >
          <Wrench className="w-3 h-3" /> Service
        </button>
      </div>
    </motion.div>
  );
}

function DueDashboard({ stats, filter, setFilter, garageName, onService, onRemind }: { 
  stats: any; 
  filter: 'ov' | 'td' | 'wk' | 'mo'; 
  setFilter: (f: 'ov' | 'td' | 'wk' | 'mo') => void;
  garageName: string;
  onService: (id: string) => void;
  onRemind: (v: Vehicle) => void;
}) {
  const now = new Date();
  const todayStr = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const dayStr = now.toLocaleDateString('en-IN', { weekday: 'long' });
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  const currentList = filter === 'ov' ? stats.overdue : filter === 'td' ? stats.today : filter === 'wk' ? stats.week : stats.month;

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-[#1e1b4b] via-[#312e81] to-[#1e1b4b] border border-indigo-500/35 rounded-[18px] p-4.5 relative overflow-hidden">
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-indigo-500/25 blur-2xl" />
        <div className="absolute -bottom-5 -left-5 w-20 h-20 rounded-full bg-acc/15 blur-xl" />
        
        <div className="flex items-start justify-between mb-3.5 relative z-10">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[1.5px] text-indigo-300 mb-1">📅 Today's Date</div>
            <div className="text-2xl font-extrabold text-white leading-none">{todayStr}</div>
            <div className="text-xs text-indigo-300 mt-0.5">{dayStr}</div>
          </div>
          <div className="text-[11px] font-bold text-indigo-400 bg-indigo-500/20 border border-indigo-500/30 px-2.5 py-1 rounded-full">
            🕐 {timeStr}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 relative z-10">
          <StatBox num={stats.overdue.length} label="Overdue" color="red" />
          <StatBox num={stats.today.length} label="Due Today" color="yellow" />
          <StatBox num={stats.week.length} label="This Week" color="blue" />
          <StatBox num={stats.month.length} label="This Month" color="green" />
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        <FilterPill active={filter === 'ov'} label="🔴 Overdue" count={stats.overdue.length} onClick={() => setFilter('ov')} color="red" />
        <FilterPill active={filter === 'td'} label="🟡 Today" count={stats.today.length} onClick={() => setFilter('td')} color="yellow" />
        <FilterPill active={filter === 'wk'} label="🔵 This Week" count={stats.week.length} onClick={() => setFilter('wk')} color="blue" />
        <FilterPill active={filter === 'mo'} label="📅 This Month" count={stats.month.length} onClick={() => setFilter('mo')} color="green" />
      </div>

      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-txt2">
            {filter === 'ov' ? 'Overdue Service' : filter === 'td' ? 'Due Today' : filter === 'wk' ? 'Due This Week' : 'Due This Month'}
          </h3>
          {currentList.length > 0 && (
            <button 
              className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full bg-acc/15 text-red-400 border border-acc/30 active:scale-95 transition-transform"
              onClick={() => {
                currentList.forEach((v: Vehicle, i: number) => {
                  setTimeout(() => onRemind(v), i * 800);
                });
              }}
            >
              <MessageSquare className="w-3 h-3" /> Send All ({currentList.length})
            </button>
          )}
        </div>

        {currentList.length === 0 ? (
          <div className="text-center py-12 text-txt2">
            <CheckCircle2 className="w-12 h-12 mx-auto opacity-15 mb-3.5" />
            <div className="text-[15px] font-bold text-slate-400 mb-1">All Clear ✅</div>
            <p className="text-xs">No vehicles in this category</p>
          </div>
        ) : (
          currentList.map((v: Vehicle) => (
            <DueCard key={v.id} vehicle={v} onService={() => onService(v.id)} onRemind={() => onRemind(v)} />
          ))
        )}
      </div>
    </div>
  );
}

function StatBox({ num, label, color }: { num: number; label: string; color: string }) {
  const colors: any = {
    red: "bg-acc/12 border-acc/30 text-red-400",
    yellow: "bg-gold/12 border-gold/30 text-yellow-400",
    blue: "bg-blue/12 border-blue/30 text-blue-400",
    green: "bg-green/12 border-green/30 text-emerald-400"
  };
  return (
    <div className={cn("rounded-xl p-2.5 border", colors[color])}>
      <div className="text-2xl font-extrabold leading-none">{num}</div>
      <div className="text-[10px] font-bold uppercase tracking-wider opacity-75 mt-1">{label}</div>
    </div>
  );
}

function FilterPill({ active, label, count, onClick, color }: { active: boolean; label: string; count: number; onClick: () => void; color: string }) {
  const activeColors: any = {
    red: "border-acc bg-acc/12 text-red-400",
    yellow: "border-gold bg-gold/12 text-yellow-400",
    blue: "border-blue bg-blue/12 text-blue-400",
    green: "border-green bg-green/12 text-emerald-400"
  };
  return (
    <button 
      className={cn(
        "shrink-0 px-3.5 py-1.5 rounded-full border-1.5 border-bdr bg-transparent text-txt2 text-xs font-bold transition-all",
        active && activeColors[color]
      )}
      onClick={onClick}
    >
      {label} <span className="font-extrabold ml-1">{count}</span>
    </button>
  );
}

interface DueCardProps {
  key?: React.Key;
  vehicle: Vehicle;
  onService: () => void;
  onRemind: () => void;
}

function DueCard({ vehicle, onService, onRemind }: DueCardProps) {
  const d = getDays(vehicle.sdd);
  const isOverdue = d !== null && d < 0;
  const isToday = d === 0;
  
  const cardCls = isOverdue ? "border-l-acc" : isToday ? "border-l-gold" : "border-l-blue";
  const avCls = isOverdue ? "bg-acc/15 text-red-400" : isToday ? "bg-gold/15 text-yellow-400" : "bg-blue/15 text-blue-400";
  const cntCls = isOverdue ? "text-red-400" : isToday ? "text-yellow-400" : "text-blue-400";
  const cntTxt = isOverdue ? `${Math.abs(d)} days overdue` : isToday ? '🔥 Due Today!' : d === 1 ? 'Due Tomorrow' : `Due in ${d} days`;

  return (
    <div className={cn("bg-s1 border-1.5 border-bdr rounded-2xl p-3.5 relative overflow-hidden border-l-4", cardCls)}>
      <div className="flex items-start justify-between mb-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-base font-extrabold shrink-0", avCls)}>
            {vehicle.name[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold truncate">{vehicle.name}</div>
            <div className="text-[11px] text-txt2 mt-0.5">📱 {vehicle.mobile}</div>
            <div className="inline-block text-[10px] font-bold text-rose-500 tracking-widest bg-rose-500/10 px-2 py-0.5 rounded-md mt-1 uppercase">
              {vehicle.vn}
            </div>
          </div>
        </div>
        <div className={cn("text-xs font-extrabold text-right shrink-0", cntCls)}>
          {cntTxt}
        </div>
      </div>

      <div className="flex items-center gap-1.5 mb-2.5">
        <span className="text-[10px] font-bold bg-acc2/20 text-indigo-400 px-2 py-0.5 rounded-md uppercase">{vehicle.make}</span>
        <span className="text-xs text-txt2">{vehicle.model}</span>
        {vehicle.km && <span className="text-[11px] text-txt2">· {Number(vehicle.km).toLocaleString()} km</span>}
      </div>

      <div className="flex items-center bg-bg rounded-xl p-2.5 mb-2.5">
        <div className="flex-1 text-center">
          <div className="text-[9px] font-bold uppercase tracking-wider text-txt2 mb-0.5">Last Service</div>
          <div className="text-xs font-bold">{fmt(vehicle.date)}</div>
        </div>
        <div className="text-txt2 text-sm opacity-40 px-1">→</div>
        <div className="flex-1 text-center">
          <div className="text-[9px] font-bold uppercase tracking-wider text-txt2 mb-0.5">Today</div>
          <div className="text-xs font-bold text-indigo-300">{new Date().getDate()} {new Date().toLocaleDateString('en-IN', { month: 'short' })}</div>
        </div>
        <div className="text-txt2 text-sm opacity-40 px-1">→</div>
        <div className="flex-1 text-center">
          <div className="text-[9px] font-bold uppercase tracking-wider text-txt2 mb-0.5">Due Date</div>
          <div className={cn("text-xs font-bold", isOverdue ? "text-red-400" : isToday ? "text-yellow-400" : "text-emerald-400")}>
            {fmt(vehicle.sdd)}
          </div>
        </div>
      </div>

      <div className="flex gap-1.5">
        <button 
          className="flex-1 py-2 rounded-lg bg-blue/12 text-blue-400 text-[11px] font-bold flex items-center justify-center gap-1 active:scale-95 transition-transform"
          onClick={() => window.location.href = `tel:${vehicle.mobile}`}
        >
          <Phone className="w-3 h-3" /> Call
        </button>
        <button 
          className="flex-1 py-2 rounded-lg bg-green/12 text-emerald-400 text-[11px] font-bold flex items-center justify-center gap-1 active:scale-95 transition-transform"
          onClick={() => onRemind()}
        >
          <MessageSquare className="w-3 h-3" /> Chat
        </button>
        <button 
          className="flex-1 py-2 rounded-lg bg-purple-500/12 text-purple-400 text-[11px] font-bold flex items-center justify-center gap-1 active:scale-95 transition-transform"
          onClick={onService}
        >
          <Wrench className="w-3 h-3" /> Service
        </button>
      </div>
    </div>
  );
}

function Modal({ modal, onClose, vehicles, setVehicles, userEmail, garageName, showToast }: { 
  modal: any; 
  onClose: () => void; 
  vehicles: Vehicle[]; 
  setVehicles: React.Dispatch<React.SetStateAction<Vehicle[]>>;
  userEmail: string;
  garageName: string;
  showToast: any;
}) {
  const [loading, setLoading] = useState(false);
  const vehicle = modal.id ? vehicles.find(v => v.id === modal.id) : null;

  // Form States
  const [name, setName] = useState(vehicle?.name || '');
  const [mobile, setMobile] = useState(vehicle?.mobile || '');
  const [vn, setVn] = useState(vehicle?.vn || '');
  const [make, setMake] = useState(vehicle?.make || '');
  const [model, setModel] = useState(vehicle?.model || '');
  const [date, setDate] = useState(vehicle?.date || new Date().toISOString().split('T')[0]);
  const [km, setKm] = useState(vehicle?.km || '');
  const [dr, setDr] = useState(vehicle?.dr || '');
  const [sdd, setSdd] = useState(vehicle?.sdd || nsd());
  const [oil, setOil] = useState('');
  const [bill, setBill] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !mobile || !vn || !make || !model) {
      showToast('Fill all required fields', 'error');
      return;
    }
    setLoading(true);
    const vData = {
      id: vehicle?.id || Date.now().toString(),
      name, mobile, vn, make, model, date, km, dr, sdd
    };
    try {
      if (modal.type === 'add') {
        await fetch('/api/vehicles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userEmail, vehicle: vData })
        });
        setVehicles(prev => [vData as Vehicle, ...prev]);
        showToast('Vehicle added');
      } else {
        await fetch(`/api/vehicles/${modal.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vehicle: vData })
        });
        setVehicles(prev => prev.map(v => v.id === modal.id ? { ...v, ...vData } : v));
        showToast('Vehicle updated');
      }
      onClose();
    } catch (err) {
      showToast('Failed to save', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oil || !bill) {
      showToast('Fill oil brand and bill', 'error');
      return;
    }
    setLoading(true);
    const updatedVehicle = { ...vehicle!, lob: oil, lb: bill, sdd, km };
    try {
      await fetch(`/api/vehicles/${modal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicle: updatedVehicle })
      });
      setVehicles(prev => prev.map(v => v.id === modal.id ? updatedVehicle : v));
      
      const msg = `Hello ${vehicle?.name}! 🙏\n\n✅ *Service Completed* at ${garageName}\n\n🏍️ *${vehicle?.vn}*\n${vehicle?.make} ${vehicle?.model}${km ? `\n📊 KM: *${Number(km).toLocaleString()}*` : ''}\n\n🛢️ Oil: *${oil}*\n💰 Bill: *₹${bill}*\n📅 Next Service: *${sdd}*\n\nThank you! 🙌`;
      window.open(`https://wa.me/91${vehicle?.mobile}?text=${encodeURIComponent(msg)}`, '_blank');
      
      showToast('Service logged!');
      onClose();
    } catch (err) {
      showToast('Failed to log service', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[200] flex items-end"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div 
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="w-full bg-s1 rounded-t-[24px] p-4 pb-10 max-h-[93vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-5">
          <div>
            <h2 className="text-2xl font-extrabold">
              {modal.type === 'add' ? 'Add Vehicle' : modal.type === 'edit' ? 'Edit Vehicle' : modal.type === 'svc' ? 'Log Service' : 'Details'}
            </h2>
            <p className="text-xs text-txt2">
              {modal.type === 'add' ? 'Fill customer details' : modal.type === 'edit' ? 'Update customer details' : modal.type === 'svc' ? 'Log service details' : 'Vehicle & Customer info'}
            </p>
          </div>
          <button className="w-8 h-8 rounded-lg bg-bg border border-bdr text-txt2 flex items-center justify-center" onClick={onClose}>
            <Plus className="w-4 h-4 rotate-45" />
          </button>
        </div>

        {modal.type === 'detail' && vehicle && (
          <div className="space-y-4">
            <div className="bg-bg border border-bdr rounded-2xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-acc2 to-acc flex items-center justify-center text-xl font-extrabold shrink-0">
                  {vehicle.name[0].toUpperCase()}
                </div>
                <div>
                  <div className="font-bold text-base">{vehicle.name}</div>
                  <div className="text-xs text-txt2">{vehicle.mobile}</div>
                  <div className="text-xs font-bold text-rose-500 tracking-widest mt-0.5 uppercase">{vehicle.vn}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 border-t border-s1 pt-3">
                <InfoItem label="Vehicle" value={`${vehicle.make} ${vehicle.model}`} />
                <InfoItem label="Service Date" value={vehicle.date || '—'} />
                {vehicle.km && <InfoItem label="Current KM" value={Number(vehicle.km).toLocaleString() + ' km'} />}
                {vehicle.lob && <InfoItem label="Last Oil" value={vehicle.lob} />}
                {vehicle.lb && <InfoItem label="Last Bill" value={'₹' + vehicle.lb} />}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button className="flex items-center justify-center gap-2 py-3 rounded-xl bg-blue/15 text-blue-400 font-bold text-sm active:scale-95 transition-transform" onClick={() => window.location.href = `tel:${vehicle.mobile}`}>
                <Phone className="w-4 h-4" /> Call
              </button>
              <button className="flex items-center justify-center gap-2 py-3 rounded-xl bg-green/12 text-emerald-400 font-bold text-sm active:scale-95 transition-transform" onClick={() => window.open(`https://wa.me/91${vehicle.mobile}`, '_blank')}>
                <MessageSquare className="w-4 h-4" /> WhatsApp
              </button>
            </div>

            <div className="border-t border-bdr pt-4">
              <label className="block text-[11px] font-bold text-txt2 tracking-wider uppercase mb-3">Update Info</label>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div>
                  <label className="block text-[11px] font-bold text-txt2 uppercase mb-1">Current KM</label>
                  <input className="w-full px-4 py-3 bg-bg border-1.5 border-bdr rounded-xl text-txt" type="number" value={km} onChange={e => setKm(e.target.value)} />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-txt2 uppercase mb-1">Next Service</label>
                  <input className="w-full px-4 py-3 bg-bg border-1.5 border-bdr rounded-xl text-txt" type="date" value={sdd} onChange={e => setSdd(e.target.value)} />
                </div>
              </div>
              <button className="w-full py-3 bg-gradient-to-br from-acc2 to-[#0ea5e9] rounded-xl text-white font-bold text-sm active:scale-95 transition-transform" onClick={handleSubmit}>
                Save Changes
              </button>
            </div>
          </div>
        )}

        {(modal.type === 'add' || modal.type === 'edit') && (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-bold text-txt2 uppercase mb-1">Customer Name *</label>
              <input className="w-full px-4 py-3 bg-bg border-1.5 border-bdr rounded-xl text-txt" placeholder="Full name" value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-txt2 uppercase mb-1">Mobile *</label>
                <input className="w-full px-4 py-3 bg-bg border-1.5 border-bdr rounded-xl text-txt" type="tel" maxLength={10} placeholder="10-digit" value={mobile} onChange={e => setMobile(e.target.value)} required />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-txt2 uppercase mb-1">Vehicle No *</label>
                <input className="w-full px-4 py-3 bg-bg border-1.5 border-bdr rounded-xl text-txt uppercase" placeholder="MH12AB1234" value={vn} onChange={e => setVn(e.target.value.toUpperCase())} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-txt2 uppercase mb-1">Make *</label>
                <select className="w-full px-4 py-3 bg-bg border-1.5 border-bdr rounded-xl text-txt" value={make} onChange={e => { setMake(e.target.value); setModel(''); }} required>
                  <option value="">Select</option>
                  {Object.keys(MAKES).map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-txt2 uppercase mb-1">Model *</label>
                <select className="w-full px-4 py-3 bg-bg border-1.5 border-bdr rounded-xl text-txt" value={model} onChange={e => setModel(e.target.value)} disabled={!make} required>
                  <option value="">{make ? 'Select' : 'Pick make first'}</option>
                  {make && MAKES[make]?.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-txt2 uppercase mb-1">Service Date</label>
                <input className="w-full px-4 py-3 bg-bg border-1.5 border-bdr rounded-xl text-txt" type="date" value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-txt2 uppercase mb-1">Current KM</label>
                <input className="w-full px-4 py-3 bg-bg border-1.5 border-bdr rounded-xl text-txt" type="number" placeholder="e.g. 12000" value={km} onChange={e => setKm(e.target.value)} />
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full py-3.5 bg-gradient-to-br from-acc to-[#be123c] rounded-xl text-white font-bold text-base shadow-[0_4px_20px_rgba(225,29,72,0.35)] active:scale-95 transition-transform disabled:opacity-50">
              {loading ? 'Saving...' : modal.type === 'add' ? 'Add Vehicle →' : 'Save Changes'}
            </button>
          </form>
        )}

        {modal.type === 'svc' && vehicle && (
          <form onSubmit={handleService} className="space-y-4">
            <div className="bg-acc/5 border border-acc/20 rounded-xl p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-acc/15 flex items-center justify-center shrink-0">
                <Wrench className="text-acc w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-sm">{vehicle.name}</div>
                <div className="text-xs text-txt2">{vehicle.vn} · {vehicle.make} {vehicle.model}</div>
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-txt2 uppercase mb-1">Oil Brand *</label>
              <select className="w-full px-4 py-3 bg-bg border-1.5 border-bdr rounded-xl text-txt" value={oil} onChange={e => setOil(e.target.value)} required>
                <option value="">Select oil brand</option>
                {OILS.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-txt2 uppercase mb-1">Bill Amount (₹) *</label>
                <input className="w-full px-4 py-3 bg-bg border-1.5 border-bdr rounded-xl text-txt" type="number" placeholder="e.g. 450" value={bill} onChange={e => setBill(e.target.value)} required />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-txt2 uppercase mb-1">Odometer KM</label>
                <input className="w-full px-4 py-3 bg-bg border-1.5 border-bdr rounded-xl text-txt" type="number" placeholder="Current KM" value={km} onChange={e => setKm(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-txt2 uppercase mb-1">Next Service Date</label>
              <input className="w-full px-4 py-3 bg-bg border-1.5 border-bdr rounded-xl text-txt" type="date" value={sdd} onChange={e => setSdd(e.target.value)} />
            </div>
            <button type="submit" disabled={loading} className="w-full py-3.5 bg-gradient-to-br from-[#25d366] to-[#128c7e] rounded-xl text-white font-bold text-base flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50">
              <MessageSquare className="w-5 h-5" /> {loading ? 'Processing...' : 'Complete & Send WhatsApp'}
            </button>
          </form>
        )}
      </motion.div>
    </motion.div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-1">
      <div className="text-[10px] font-bold text-txt2 uppercase tracking-wider">{label}</div>
      <div className="text-[13px] font-semibold mt-0.5">{value}</div>
    </div>
  );
}

function fmtSyncTime(date: Date) {
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 10) return 'Just now';
  if (diff < 60) return `${diff}s ago`;
  const m = Math.floor(diff / 60);
  if (m < 60) return `${m}m ago`;
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

