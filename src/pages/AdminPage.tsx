import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Users, 
  Building2, 
  Sliders, 
  Activity, 
  Clock, 
  CheckCircle2, 
  TrendingUp, 
  Plus, 
  Trash2, 
  Edit, 
  Eye, 
  Download, 
  Search, 
  Layers, 
  RefreshCw, 
  ShieldAlert, 
  BarChart3, 
  Check, 
  X, 
  AlertCircle, 
  SkipForward, 
  BellRing, 
  Monitor, 
  ArrowRight,
  LayoutDashboard,
  Settings,
  LogOut,
  Menu,
  FileText,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { request } from '../services/api';
import { connectSSE } from '../services/sse';
import { Organization, Service, Counter, QueueToken } from '../types';

export const AdminPage: React.FC = () => {
  const { user, loading: authLoading, switchRole, logout } = useAuth();
  const navigate = useNavigate();
  const [roleSwitching, setRoleSwitching] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Navigation tab for the 9-item fixed left sidebar
  const [activeTab, setActiveTab] = useState<
    'DASHBOARD' | 'LIVE_QUEUE' | 'DISPLAY' | 'ANALYTICS' | 'STAFF' | 'COUNTERS' | 'SERVICES' | 'SETTINGS' | 'AUDIT'
  >('DASHBOARD');

  // Settings sub-tab state (Hospital details, branch, alerts)
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [systemConfig, setSystemConfig] = useState({
    hospitalName: 'Kanchipuram District Healthcare Center',
    branchLocation: 'Kanchipuram Main Branch (Opp. Collectorate)',
    operatingHours: '08:00 AM - 08:00 PM',
    soundAlertsEnabled: true,
    autoAdvanceTokens: false,
    maxWaitThresholdMin: 30
  });

  // Live Queue Quick Desk state
  const [liveQueue, setLiveQueue] = useState<{
    nowServing: QueueToken | null;
    waitingQueue: QueueToken[];
    stats: { totalCustomers: number; waiting: number; serving: number; completed: number };
  }>({
    nowServing: null,
    waitingQueue: [],
    stats: { totalCustomers: 0, waiting: 0, serving: 0, completed: 0 },
  });

  // Filter & Queue Scope States
  const [facilityFilter, setFacilityFilter] = useState<string>('');
  const [serviceFilter, setServiceFilter] = useState<string>('');
  const [liveDeskFacilityId, setLiveDeskFacilityId] = useState<string>('');
  const [liveDeskServiceId, setLiveDeskServiceId] = useState<string>('');

  // Data states
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [counters, setCounters] = useState<Counter[]>([]);
  const [queues, setQueues] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);

  // Modals & form state
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showCounterModal, setShowCounterModal] = useState(false);

  // Form fields for new Org
  const [orgForm, setOrgForm] = useState({
    name: '',
    type: 'HOSPITAL' as 'HOSPITAL' | 'BANK' | 'SERVICE_CENTER',
    address: '',
    contactEmail: '',
    contactPhone: '',
  });

  // Form fields for new Service
  const [serviceForm, setServiceForm] = useState({
    organizationId: '',
    name: '',
    codePrefix: 'A',
    description: '',
    averageServiceTime: 10,
  });

  // Form fields for new Counter
  const [counterForm, setCounterForm] = useState({
    organizationId: '',
    counterNumber: 'Counter 01',
    serviceId: '',
  });

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchHistory, setSearchHistory] = useState('');
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchAllAdminData = async () => {
    try {
      setLoading(true);
      const [dashRes, statsRes, orgsRes, srvRes, cntRes, qRes, histRes] = await Promise.all([
        request<any>('/admin/dashboard'),
        request<any>('/admin/statistics'),
        request<{ organizations: Organization[] }>('/organizations'),
        request<{ services: Service[] }>('/services'),
        request<{ counters: Counter[] }>('/counters'),
        request<{ queues: any[] }>('/queues'),
        request<{ history: any[] }>('/admin/history'),
      ]);

      setDashboardStats(dashRes.stats);
      setAnalytics(statsRes);
      setOrganizations(orgsRes.organizations || []);
      setServices(srvRes.services || []);
      setCounters(cntRes.counters || []);
      setQueues(qRes.queues || []);
      setHistory(histRes.history || []);

      if (orgsRes.organizations?.length > 0) {
        setServiceForm((prev) => ({ ...prev, organizationId: orgsRes.organizations[0].id }));
        setCounterForm((prev) => ({ ...prev, organizationId: orgsRes.organizations[0].id }));
        if (!liveDeskFacilityId) {
          setLiveDeskFacilityId(orgsRes.organizations[0].id);
        }
      }
      if (srvRes.services?.length > 0 && !liveDeskServiceId) {
        setLiveDeskServiceId(srvRes.services[0].id);
      }
    } catch (e) {
      console.warn('Error fetching admin portal data:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchLiveQueue = async (facilityId = liveDeskFacilityId, serviceId = liveDeskServiceId) => {
    try {
      const params = new URLSearchParams();
      if (facilityId) params.append('facilityId', facilityId);
      if (serviceId) params.append('serviceId', serviceId);
      const query = params.toString() ? `?${params.toString()}` : '';

      const res = await request<any>(`/admin/live-queue${query}`);
      setLiveQueue(res);
      if (!liveDeskServiceId && res.serviceId) {
        setLiveDeskServiceId(res.serviceId);
      }
      if (!liveDeskFacilityId && res.facilityId) {
        setLiveDeskFacilityId(res.facilityId);
      }
    } catch (e) {
      console.warn('Error fetching live queue:', e);
    }
  };

  const handleCallNext = async () => {
    setActionLoading(true);
    try {
      const res = await request<any>('/admin/call-next', { 
        method: 'POST',
        body: JSON.stringify({
          facilityId: liveDeskFacilityId,
          serviceId: liveDeskServiceId,
        }),
      });
      setToastMessage({ type: 'success', text: res.message || 'Next customer called!' });
      await fetchLiveQueue();
      await fetchAllAdminData();
    } catch (err: any) {
      setToastMessage({ type: 'error', text: err.message || 'No waiting customers in queue.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async () => {
    setActionLoading(true);
    try {
      const res = await request<any>('/admin/complete', { 
        method: 'POST',
        body: JSON.stringify({
          serviceId: liveDeskServiceId,
          tokenId: liveQueue.nowServing?.id,
        }),
      });
      setToastMessage({ type: 'success', text: res.message || 'Customer marked completed.' });
      await fetchLiveQueue();
      await fetchAllAdminData();
    } catch (err: any) {
      setToastMessage({ type: 'error', text: err.message || 'Failed to complete customer.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSkip = async () => {
    setActionLoading(true);
    try {
      const res = await request<any>('/admin/skip', { 
        method: 'POST',
        body: JSON.stringify({
          serviceId: liveDeskServiceId,
          tokenId: liveQueue.nowServing?.id,
        }),
      });
      setToastMessage({ type: 'success', text: res.message || 'Customer marked skipped.' });
      await fetchLiveQueue();
      await fetchAllAdminData();
    } catch (err: any) {
      setToastMessage({ type: 'error', text: err.message || 'Failed to skip customer.' });
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    // Only execute if authentication is fully initialized and active role is ADMIN
    if (authLoading || !user || user.role !== 'ADMIN') {
      return;
    }

    fetchAllAdminData();
    fetchLiveQueue();

    const interval = setInterval(fetchLiveQueue, 4000);
    const sse = connectSSE();
    const unsub = sse.subscribe((event) => {
      if (event.type === 'QUEUE_ADVANCED' || event.type === 'TOKEN_UPDATED') {
        fetchLiveQueue();
        fetchAllAdminData();
      }
    });

    return () => {
      clearInterval(interval);
      unsub();
    };
  }, [authLoading, user?.role, user?.id]);

  // ADD ORGANIZATION
  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await request('/organizations', {
        method: 'POST',
        body: JSON.stringify(orgForm),
      });
      setToastMessage({ type: 'success', text: `Organization "${orgForm.name}" created!` });
      setShowOrgModal(false);
      setOrgForm({ name: '', type: 'HOSPITAL', address: '', contactEmail: '', contactPhone: '' });
      fetchAllAdminData();
    } catch (err: any) {
      setToastMessage({ type: 'error', text: err.message || 'Failed to create organization' });
    } finally {
      setActionLoading(false);
    }
  };

  // DELETE ORGANIZATION
  const handleDeleteOrg = async (id: string) => {
    if (!confirm('Are you sure you want to delete this organization? All linked services and queues will be removed.')) return;
    try {
      await request(`/organizations/${id}`, { method: 'DELETE' });
      setToastMessage({ type: 'success', text: 'Organization removed.' });
      fetchAllAdminData();
    } catch (err: any) {
      setToastMessage({ type: 'error', text: err.message || 'Failed to delete organization' });
    }
  };

  // ADD SERVICE
  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await request('/services', {
        method: 'POST',
        body: JSON.stringify(serviceForm),
      });
      setToastMessage({ type: 'success', text: `Service "${serviceForm.name}" created!` });
      setShowServiceModal(false);
      setServiceForm({ organizationId: organizations[0]?.id || '', name: '', codePrefix: 'S', description: '', averageServiceTime: 10 });
      fetchAllAdminData();
    } catch (err: any) {
      setToastMessage({ type: 'error', text: err.message || 'Failed to create service' });
    } finally {
      setActionLoading(false);
    }
  };

  // DELETE SERVICE
  const handleDeleteService = async (id: string) => {
    if (!confirm('Delete this service? Active tokens in this queue will be removed.')) return;
    try {
      await request(`/services/${id}`, { method: 'DELETE' });
      setToastMessage({ type: 'success', text: 'Service deleted.' });
      fetchAllAdminData();
    } catch (err: any) {
      setToastMessage({ type: 'error', text: err.message || 'Failed to delete service' });
    }
  };

  // ADD COUNTER
  const handleCreateCounter = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await request('/counters', {
        method: 'POST',
        body: JSON.stringify(counterForm),
      });
      setToastMessage({ type: 'success', text: `Counter "${counterForm.counterNumber}" added!` });
      setShowCounterModal(false);
      fetchAllAdminData();
    } catch (err: any) {
      setToastMessage({ type: 'error', text: err.message || 'Failed to create counter' });
    } finally {
      setActionLoading(false);
    }
  };

  // DELETE COUNTER
  const handleDeleteCounter = async (id: string) => {
    if (!confirm('Delete this counter?')) return;
    try {
      await request(`/counters/${id}`, { method: 'DELETE' });
      setToastMessage({ type: 'success', text: 'Counter removed.' });
      fetchAllAdminData();
    } catch (err: any) {
      setToastMessage({ type: 'error', text: err.message || 'Failed to delete counter' });
    }
  };

  // Export History as CSV
  const handleExportCSV = () => {
    if (history.length === 0) return;
    const headers = ['Token', 'Customer', 'Organization', 'Service', 'Counter', 'Status', 'Wait Minutes', 'Service Minutes', 'Date'];
    const rows = history.map((h) => [
      h.tokenNumber,
      `"${h.customerName}"`,
      `"${h.organizationName}"`,
      `"${h.serviceName}"`,
      h.counterNumber || 'Counter 01',
      h.status,
      h.waitingTimeMinutes,
      h.serviceTimeMinutes,
      new Date(h.completedAt).toISOString(),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `smartqueue_audit_history_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredHistory = history.filter((h) => {
    const q = searchHistory.toLowerCase();
    return (
      h.tokenNumber.toLowerCase().includes(q) ||
      h.customerName.toLowerCase().includes(q) ||
      h.organizationName.toLowerCase().includes(q) ||
      h.serviceName.toLowerCase().includes(q)
    );
  });

  const handleRoleSwitch = async (role: 'ADMIN') => {
    setRoleSwitching(true);
    try {
      await switchRole(role);
    } catch (err: any) {
      console.warn(err);
    } finally {
      setRoleSwitching(false);
    }
  };

  // If session initialization is still loading, show clean loading message
  if (authLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold text-slate-700">Loading admin session...</p>
      </div>
    );
  }

  // Role separation guard: Customer and Staff accounts are blocked from accessing Admin controls
  if (user?.role !== 'ADMIN') {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-sm">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
          Role-Protected Area
        </span>
        <h2 className="text-xl font-bold text-slate-900 mt-1">Administrator Access Required</h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-2 mb-6">
          This portal manages hospital configurations, services, counter allocations, audit history logs, and executive analytics.
        </p>

        <div className="space-y-3">
          <button
            onClick={() => handleRoleSwitch('ADMIN')}
            disabled={roleSwitching}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
          >
            {roleSwitching ? 'Switching Profile...' : 'Enter with Admin Profile'}
          </button>
          <button
            onClick={() => navigate('/customer')}
            className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
          >
            Return to Customer Portal
          </button>
        </div>
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { id: 'DASHBOARD', label: 'Dashboard', icon: LayoutDashboard, subtitle: 'Queue KPIs & quick desk' },
    { id: 'LIVE_QUEUE', label: 'Live Queue', icon: Activity, subtitle: 'Real-time multi-queue monitor' },
    { id: 'DISPLAY', label: 'Display', icon: Monitor, subtitle: 'Public TV & kiosk display board', external: true },
    { id: 'ANALYTICS', label: 'Analytics', icon: BarChart3, subtitle: 'Volume & throughput charts' },
    { id: 'STAFF', label: 'Staff', icon: Users, subtitle: 'Operator desks & assignments' },
    { id: 'COUNTERS', label: 'Counters', icon: Sliders, subtitle: 'Service desks & allocation' },
    { id: 'SERVICES', label: 'Services', icon: Layers, subtitle: 'Departments, prefixes & times' },
    { id: 'SETTINGS', label: 'Settings', icon: Settings, subtitle: 'Hospital & system configuration' },
    { id: 'AUDIT', label: 'Audit Logs', icon: FileText, subtitle: 'Completed visits & CSV export' },
  ] as const;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row antialiased text-slate-900">
      {/* MOBILE TOP BAR */}
      <div className="md:hidden bg-slate-900 text-white px-4 py-3.5 flex items-center justify-between sticky top-0 z-40 shadow-sm border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-black text-sm text-white shadow-xs">
            Q
          </div>
          <div>
            <div className="font-extrabold text-sm tracking-tight leading-tight">SmartQueue</div>
            <div className="text-[10px] text-indigo-400 font-semibold uppercase tracking-wider">Admin Portal</div>
          </div>
        </div>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          aria-label="Toggle navigation"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* MOBILE BACKDROP */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 z-40 md:hidden backdrop-blur-xs transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* LEFT SIDEBAR (FIXED ON DESKTOP, RESPONSIVE DRAWER ON MOBILE) */}
      <aside
        className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-slate-900 text-slate-300 flex flex-col justify-between z-50 transition-transform duration-200 ease-in-out md:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } border-r border-slate-800 shadow-xl md:shadow-none shrink-0`}
      >
        {/* TOP: LOGO & ADMIN PORTAL SUBTITLE */}
        <div>
          <div className="p-6 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center font-black text-lg text-white shadow-md shadow-indigo-600/30">
                Q
              </div>
              <div>
                <div className="font-black text-base text-white tracking-tight leading-none">
                  SmartQueue
                </div>
                <div className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider mt-1">
                  Admin Portal
                </div>
              </div>
            </div>

            <button
              onClick={() => setMobileMenuOpen(false)}
              className="md:hidden text-slate-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* HOSPITAL & OPERATOR BADGE */}
          <div className="px-5 py-3.5 bg-slate-950/40 border-b border-slate-800/60 flex items-center justify-between text-xs">
            <div className="truncate">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Active Facility</div>
              <div className="font-semibold text-slate-200 text-xs truncate">
                {organizations[0]?.name || 'Healthcare District Center'}
              </div>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 ml-2" title="Operational" />
          </div>

          {/* NAVIGATION LIST (9 ITEMS) */}
          <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-250px)]">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.id === 'DISPLAY') {
                      navigate('/display');
                    } else {
                      setActiveTab(item.id as any);
                    }
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-xs transition-all text-left group cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/25'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-400'
                    }`}
                  />
                  <span className="truncate flex-1">{item.label}</span>
                  {item.id === 'LIVE_QUEUE' && liveQueue.waitingQueue.length > 0 && (
                    <span
                      className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
                        isActive ? 'bg-white/20 text-white' : 'bg-amber-500/20 text-amber-400'
                      }`}
                    >
                      {liveQueue.waitingQueue.length}
                    </span>
                  )}
                  {item.id === 'DISPLAY' && (
                    <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 group-hover:text-slate-300">
                      TV
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* BOTTOM: USER PROFILE & LOGOUT */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/30">
          <div className="flex items-center gap-3 px-2 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs text-indigo-300 border border-slate-700">
              {user?.name ? user.name.slice(0, 2).toUpperCase() : 'AD'}
            </div>
            <div className="truncate flex-1">
              <div className="text-xs font-bold text-white truncate">{user?.name || 'Administrator'}</div>
              <div className="text-[10px] text-slate-500 truncate">{user?.email || 'admin@smartqueue.io'}</div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* MAIN ADMIN CONTENT AREA */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        {/* Top Operational Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase tracking-wider">
                {activeTab === 'DASHBOARD'
                  ? 'Overview & Quick Desk'
                  : activeTab === 'LIVE_QUEUE'
                  ? 'Multi-Service Monitor'
                  : activeTab === 'ANALYTICS'
                  ? 'Performance Intelligence'
                  : activeTab === 'STAFF' || activeTab === 'COUNTERS'
                  ? 'Workstation Allocation'
                  : activeTab === 'SERVICES'
                  ? 'Queue Service Architecture'
                  : activeTab === 'SETTINGS'
                  ? 'System Preferences'
                  : 'Compliance & Audit'}
              </span>
              <span className="text-xs text-slate-300">&bull;</span>
              <span className="text-xs text-slate-500 font-medium">SmartQueue Hospital Management</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {activeTab === 'DASHBOARD' && 'Dashboard Overview'}
              {activeTab === 'LIVE_QUEUE' && 'Live Queue Monitor'}
              {activeTab === 'ANALYTICS' && 'Analytics & Performance'}
              {activeTab === 'STAFF' && 'Staff Operator Desks'}
              {activeTab === 'COUNTERS' && 'Counter Desks Allocation'}
              {activeTab === 'SERVICES' && 'Service Departments & Queues'}
              {activeTab === 'SETTINGS' && 'System Settings'}
              {activeTab === 'AUDIT' && 'Audit History & Reports'}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/display')}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Monitor className="w-3.5 h-3.5 text-blue-600" />
              <span>Launch Display Board</span>
            </button>
            <button
              onClick={fetchAllAdminData}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Toast Alert */}
        {toastMessage && (
          <div
            className={`mb-6 p-4 rounded-xl flex items-center justify-between text-xs font-medium shadow-xs ${
              toastMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            <span>{toastMessage.text}</span>
            <button onClick={() => setToastMessage(null)} className="font-bold hover:underline cursor-pointer">
              Dismiss
            </button>
          </div>
        )}

      {/* TAB 1: DASHBOARD OVERVIEW */}
      {activeTab === 'DASHBOARD' && (
        <div className="space-y-8">
          {/* Feature 5: Top Statistics Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Customers</div>
              <div className="text-3xl font-black text-slate-900">
                {liveQueue.stats.totalCustomers || dashboardStats?.totalCustomers || 0}
              </div>
              <div className="text-xs text-slate-500 font-medium mt-1">Total visits registered</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-1">Waiting</div>
              <div className="text-3xl font-black text-amber-500">
                {liveQueue.stats.waiting ?? dashboardStats?.waitingCustomers ?? 0}
              </div>
              <div className="text-xs text-amber-600/80 font-medium mt-1">In active queue line</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Serving</div>
              <div className="text-3xl font-black text-blue-600">
                {liveQueue.stats.serving ?? dashboardStats?.currentlyServing ?? 0}
              </div>
              <div className="text-xs text-blue-600/80 font-medium mt-1">At service counters</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Completed</div>
              <div className="text-3xl font-black text-emerald-600">
                {liveQueue.stats.completed ?? dashboardStats?.completedToday ?? 0}
              </div>
              <div className="text-xs text-emerald-600/80 font-medium mt-1">Successfully served today</div>
            </div>
          </div>

          {/* Service Queue Scope Controller Selector */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-600 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Operating Queue Desk:</span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <select
                  value={liveDeskFacilityId}
                  onChange={(e) => {
                    const newFacId = e.target.value;
                    setLiveDeskFacilityId(newFacId);
                    const facServices = services.filter((s) => s.organizationId === newFacId);
                    const newSrvId = facServices[0]?.id || '';
                    setLiveDeskServiceId(newSrvId);
                    fetchLiveQueue(newFacId, newSrvId);
                  }}
                  className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 rounded-lg px-3 py-2 cursor-pointer focus:ring-2 focus:ring-blue-500"
                >
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <select
                  value={liveDeskServiceId}
                  onChange={(e) => {
                    const newSrvId = e.target.value;
                    setLiveDeskServiceId(newSrvId);
                    fetchLiveQueue(liveDeskFacilityId, newSrvId);
                  }}
                  className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 rounded-lg px-3 py-2 cursor-pointer focus:ring-2 focus:ring-blue-500"
                >
                  {services
                    .filter((s) => !liveDeskFacilityId || s.organizationId === liveDeskFacilityId)
                    .map((srv) => (
                      <option key={srv.id} value={srv.id}>
                        {srv.name} (Prefix {srv.codePrefix})
                      </option>
                    ))}
                </select>
              </div>
              <button
                onClick={() => navigate(`/display?facilityId=${liveDeskFacilityId}&serviceId=${liveDeskServiceId}`)}
                className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Open Dedicated Display</span>
              </button>
            </div>
          </div>

          {/* Features 5 & 6: Live Queue Management Desk (Now Serving & Waiting Queue) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* NOW SERVING CARD */}
            <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-2xl pointer-events-none" />

              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-extrabold uppercase tracking-wider">
                    <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                    NOW SERVING
                  </div>
                  <span className="text-xs font-bold text-slate-500">
                    {liveQueue.nowServing ? (liveQueue.nowServing.counterNumber || 'Counter 1') : 'Counter 1'}
                  </span>
                </div>

                {liveQueue.nowServing ? (
                  <div className="text-center py-4">
                    <div className="text-6xl sm:text-7xl font-black text-slate-900 font-mono tracking-tight text-blue-600">
                      {liveQueue.nowServing.tokenNumber}
                    </div>
                    <div className="mt-3 text-base font-bold text-slate-900">
                      {liveQueue.nowServing.customerName}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {liveQueue.nowServing.serviceName || 'General Enquiry'} &bull; {liveQueue.nowServing.counterNumber || 'Counter 1'}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <div className="text-5xl font-black text-slate-300 font-mono">None</div>
                    <p className="text-xs text-slate-400 mt-2">
                      No customer currently being served. Ready to call next.
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-6 border-t border-slate-100 grid grid-cols-2 gap-3">
                <button
                  onClick={handleComplete}
                  disabled={actionLoading || !liveQueue.nowServing}
                  className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Complete
                </button>

                <button
                  onClick={handleSkip}
                  disabled={actionLoading || !liveQueue.nowServing}
                  className="py-3 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 disabled:bg-slate-100 disabled:text-slate-400 text-rose-700 border border-rose-200 disabled:border-transparent font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <SkipForward className="w-4 h-4" />
                  Skip
                </button>
              </div>
            </div>

            {/* WAITING QUEUE CARD */}
            <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 mb-4">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                      WAITING QUEUE
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
                        {liveQueue.waitingQueue.length} in line
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Sequential queue ordering based on arrival time
                    </p>
                  </div>

                  {/* CALL NEXT BUTTON */}
                  <button
                    onClick={handleCallNext}
                    disabled={actionLoading || liveQueue.waitingQueue.length === 0}
                    className="py-2.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-extrabold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
                  >
                    <BellRing className="w-4 h-4" />
                    CALL NEXT
                  </button>
                </div>

                {/* Waiting Customers Table */}
                {liveQueue.waitingQueue.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-bold text-slate-600">No Customers Waiting</p>
                    <p className="mt-1">The waiting line is clear. Ready to receive new tickets.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          <th className="py-2.5 px-3">Token</th>
                          <th className="py-2.5 px-3">Customer</th>
                          <th className="py-2.5 px-3">Service</th>
                          <th className="py-2.5 px-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {liveQueue.waitingQueue.slice(0, 5).map((tok, idx) => (
                          <tr key={tok.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-3 px-3">
                              <span className="font-mono font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                                {tok.tokenNumber}
                              </span>
                            </td>
                            <td className="py-3 px-3 font-semibold text-slate-800">
                              {tok.customerName}
                            </td>
                            <td className="py-3 px-3 text-slate-500">
                              {tok.serviceName || 'General Enquiry'}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 uppercase">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                {tok.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {liveQueue.waitingQueue.length > 5 && (
                      <div className="text-center pt-3 text-[11px] text-slate-400 font-medium">
                        + {liveQueue.waitingQueue.length - 5} more customers waiting
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Real-time sync via Server-Sent Events (SSE)</span>
                <span>Average service time: ~8 min</span>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Daily Trend Chart */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <h3 className="font-bold text-sm text-slate-900 mb-1">Weekly Queue Volume &amp; Throughput</h3>
              <p className="text-xs text-slate-400 mb-6">Total visitors vs completed transactions</p>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics?.dailyTrend || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={12} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="customers" name="Queue Tokens" stroke="#3b82f6" strokeWidth={3} />
                    <Line type="monotone" dataKey="completed" name="Completed" stroke="#10b981" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Service Category Volume Breakdown */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <h3 className="font-bold text-sm text-slate-900 mb-1">Volume by Service Department</h3>
              <p className="text-xs text-slate-400 mb-6">Traffic distribution across services</p>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics?.volumeByService || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="code" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="volume" name="Tokens Handled" fill="#6366f1" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: ANALYTICS DEDICATED VIEW */}
      {activeTab === 'ANALYTICS' && (
        <div className="space-y-8">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-base text-slate-900">Hospital Intelligence &amp; Performance Metrics</h3>
              <p className="text-xs text-slate-500">Live operational throughput, wait times, and department loads</p>
            </div>
            <button
              onClick={fetchAllAdminData}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 flex items-center gap-1.5 self-start cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Update Data</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Average Wait Time</div>
              <div className="text-3xl font-black text-slate-900">~14 mins</div>
              <div className="text-xs text-emerald-600 font-medium mt-1">&darr; 18% improvement vs last week</div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Average Service Duration</div>
              <div className="text-3xl font-black text-indigo-600">8.2 mins</div>
              <div className="text-xs text-slate-500 font-medium mt-1">Within SLA target (&le; 10 mins)</div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Completion Rate</div>
              <div className="text-3xl font-black text-emerald-600">96.4%</div>
              <div className="text-xs text-slate-500 font-medium mt-1">Under 4% no-show/skipped tokens</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <h3 className="font-bold text-sm text-slate-900 mb-1">Weekly Queue Volume &amp; Throughput</h3>
              <p className="text-xs text-slate-400 mb-6">Total visitors vs completed transactions</p>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics?.dailyTrend || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={12} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="customers" name="Queue Tokens" stroke="#3b82f6" strokeWidth={3} />
                    <Line type="monotone" dataKey="completed" name="Completed" stroke="#10b981" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <h3 className="font-bold text-sm text-slate-900 mb-1">Volume by Service Department</h3>
              <p className="text-xs text-slate-400 mb-6">Traffic distribution across services</p>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics?.volumeByService || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="code" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="volume" name="Tokens Handled" fill="#6366f1" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LIVE MULTI-QUEUE BOARD (Strictly Separate Service Queues) */}
      {(activeTab === 'LIVE_QUEUE' || activeTab === 'LIVE_QUEUES') && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Separate Service Queues Monitor</h3>
              <p className="text-xs text-slate-500">Every facility and service maintains its own independent queue sequence, wait line, and display</p>
            </div>

            {/* Filter Bar: Facility & Service */}
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <select
                  value={facilityFilter}
                  onChange={(e) => setFacilityFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 rounded-lg px-3 py-2 cursor-pointer focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Facilities</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <select
                  value={serviceFilter}
                  onChange={(e) => setServiceFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 rounded-lg px-3 py-2 cursor-pointer focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Services</option>
                  {services
                    .filter((s) => !facilityFilter || s.organizationId === facilityFilter)
                    .map((srv) => (
                      <option key={srv.id} value={srv.id}>
                        {srv.name} ({srv.codePrefix})
                      </option>
                    ))}
                </select>
              </div>
              <button
                onClick={fetchAllAdminData}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh Queues</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {queues
              .filter((q) => !facilityFilter || q.organizationId === facilityFilter)
              .filter((q) => !serviceFilter || q.serviceId === serviceFilter)
              .map((q) => (
                <div key={q.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-2.5 py-0.5 rounded text-xs font-black bg-blue-100 text-blue-800 font-mono">
                        Prefix {q.codePrefix}
                      </span>
                      <span className="text-[11px] font-bold text-slate-400 uppercase">
                        {q.organizationType?.replace('_', ' ')}
                      </span>
                    </div>

                    <h4 className="font-bold text-lg text-slate-900">{q.serviceName}</h4>
                    <p className="text-xs text-slate-500 mb-5">{q.organizationName}</p>

                    {/* 3 Metrics: Current Serving, Waiting Count, Completed Count */}
                    <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                      <div className="p-3 bg-slate-50 rounded-xl">
                        <div className="text-[10px] text-slate-400 font-semibold mb-0.5">Now Serving</div>
                        <div className="text-lg font-black text-blue-600 font-mono">{q.currentToken}</div>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl">
                        <div className="text-[10px] text-slate-400 font-semibold mb-0.5">Waiting</div>
                        <div className="text-lg font-black text-amber-600 font-mono">{q.waitingCount}</div>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl">
                        <div className="text-[10px] text-slate-400 font-semibold mb-0.5">Completed</div>
                        <div className="text-lg font-black text-emerald-600 font-mono">{q.completedCount || 0}</div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 mb-4">
                      <span>Active Desks: <strong>{q.activeCounters}</strong></span>
                      <span>Est. Wait: <strong>~{q.estimatedWaitTime}m</strong></span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center gap-2">
                    <button
                      onClick={() => {
                        setLiveDeskFacilityId(q.organizationId);
                        setLiveDeskServiceId(q.serviceId);
                        fetchLiveQueue(q.organizationId, q.serviceId);
                        setActiveTab('DASHBOARD');
                      }}
                      className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors text-center cursor-pointer"
                    >
                      Operate Desk
                    </button>
                    <button
                      onClick={() => navigate(`/display?facilityId=${q.organizationId}&serviceId=${q.serviceId}`)}
                      className="py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-xs rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                      title="Launch Dedicated Display for this service"
                    >
                      <Monitor className="w-3.5 h-3.5" />
                      <span>Display</span>
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* TAB 3: ORGANIZATIONS MANAGEMENT */}
      {activeTab === 'ORGS' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-base text-slate-900">Registered Organizations</h3>
              <p className="text-xs text-slate-500">Manage hospitals, bank branches, and public service centers</p>
            </div>
            <button
              onClick={() => setShowOrgModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 self-start"
            >
              <Plus className="w-4 h-4" />
              Add Organization
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 uppercase font-bold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Name</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Address</th>
                  <th className="px-6 py-3">Contact</th>
                  <th className="px-6 py-3">Services</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {organizations.map((org) => (
                  <tr key={org.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900">{org.name}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">
                        {org.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 max-w-xs truncate">{org.address}</td>
                    <td className="px-6 py-4 text-slate-500">{org.contactPhone || org.contactEmail}</td>
                    <td className="px-6 py-4 font-semibold">{org.servicesCount || 0} services</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDeleteOrg(org.id)}
                        className="text-rose-600 hover:text-rose-800 p-1 rounded-lg transition-colors"
                        title="Delete organization"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: SERVICES MANAGEMENT */}
      {activeTab === 'SERVICES' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-base text-slate-900">Service Queues Configuration</h3>
              <p className="text-xs text-slate-500">Configure code prefixes and average handling times</p>
            </div>
            <button
              onClick={() => setShowServiceModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 self-start"
            >
              <Plus className="w-4 h-4" />
              Add Service
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 uppercase font-bold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Code Prefix</th>
                  <th className="px-6 py-3">Service Name</th>
                  <th className="px-6 py-3">Organization</th>
                  <th className="px-6 py-3">Target Duration</th>
                  <th className="px-6 py-3">Active Waiting</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {services.map((srv) => (
                  <tr key={srv.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded bg-blue-600 text-white font-black text-xs">
                        {srv.codePrefix}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">{srv.name}</td>
                    <td className="px-6 py-4 text-slate-500">{srv.organizationName}</td>
                    <td className="px-6 py-4 font-medium">{srv.averageServiceTime} minutes</td>
                    <td className="px-6 py-4 font-bold text-amber-600">{srv.waitingCount || 0} waiting</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDeleteService(srv.id)}
                        className="text-rose-600 hover:text-rose-800 p-1 rounded-lg transition-colors"
                        title="Delete service"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: STAFF OPERATOR WORKSTATIONS */}
      {activeTab === 'STAFF' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-base text-slate-900">Hospital Staff Desks &amp; Operators</h3>
                <p className="text-xs text-slate-500">Active counter personnel and duty station assignments</p>
              </div>
              <button
                onClick={() => setShowCounterModal(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 self-start cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Assign Staff Desk</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 uppercase font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3.5">Counter Desk</th>
                    <th className="px-6 py-3.5">Assigned Staff</th>
                    <th className="px-6 py-3.5">Department</th>
                    <th className="px-6 py-3.5">Operating Status</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {counters.map((cnt) => (
                    <tr key={cnt.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900">{cnt.counterNumber}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-[10px]">
                            {cnt.staffName ? cnt.staffName.slice(0, 2).toUpperCase() : 'ST'}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">{cnt.staffName || 'Staff Operator'}</div>
                            <div className="text-[10px] text-slate-400">Desk Attendant</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-medium">{cnt.serviceName || 'General Desk'}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            cnt.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : cnt.status === 'PAUSED'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {cnt.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDeleteCounter(cnt.id)}
                          className="text-rose-600 hover:text-rose-800 p-1.5 rounded-lg transition-colors cursor-pointer"
                          title="Unassign desk"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: COUNTERS MANAGEMENT */}
      {activeTab === 'COUNTERS' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-base text-slate-900">Service Desks & Counters</h3>
              <p className="text-xs text-slate-500">Manage counter numbers, staff assignments, and availability</p>
            </div>
            <button
              onClick={() => setShowCounterModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 self-start"
            >
              <Plus className="w-4 h-4" />
              Add Counter
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 uppercase font-bold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Counter</th>
                  <th className="px-6 py-3">Organization</th>
                  <th className="px-6 py-3">Assigned Service</th>
                  <th className="px-6 py-3">Staff Operator</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {counters.map((cnt) => (
                  <tr key={cnt.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4 font-black text-slate-900">{cnt.counterNumber}</td>
                    <td className="px-6 py-4 text-slate-500">{cnt.organizationName}</td>
                    <td className="px-6 py-4 font-semibold text-blue-600">{cnt.serviceName || 'General'}</td>
                    <td className="px-6 py-4 text-slate-700">{cnt.staffName || 'Unassigned'}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                          cnt.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : cnt.status === 'PAUSED'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {cnt.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDeleteCounter(cnt.id)}
                        className="text-rose-600 hover:text-rose-800 p-1 rounded-lg transition-colors"
                        title="Delete counter"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 9. TAB: AUDIT LOGS & EXPORT */}
      {activeTab === 'AUDIT' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-base text-slate-900">Comprehensive Queue Audit History</h3>
              <p className="text-xs text-slate-500">Search and export completed visits across all organizations</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search token, customer..."
                  value={searchHistory}
                  onChange={(e) => setSearchHistory(e.target.value)}
                  className="pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <button
                onClick={handleExportCSV}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 uppercase font-bold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Token</th>
                  <th className="px-6 py-3">Customer</th>
                  <th className="px-6 py-3">Organization & Service</th>
                  <th className="px-6 py-3">Counter & Staff</th>
                  <th className="px-6 py-3">Wait Time</th>
                  <th className="px-6 py-3">Service Duration</th>
                  <th className="px-6 py-3">Completed At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredHistory.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-3.5 font-black text-blue-600">{h.tokenNumber}</td>
                    <td className="px-6 py-3.5 font-medium text-slate-900">{h.customerName}</td>
                    <td className="px-6 py-3.5">
                      <div className="font-semibold text-slate-800">{h.serviceName}</div>
                      <div className="text-[11px] text-slate-400">{h.organizationName}</div>
                    </td>
                    <td className="px-6 py-3.5">
                      <div>{h.counterNumber || 'Counter 01'}</div>
                      <div className="text-[11px] text-slate-400">{h.staffName || 'Staff'}</div>
                    </td>
                    <td className="px-6 py-3.5 font-medium">{h.waitingTimeMinutes}m</td>
                    <td className="px-6 py-3.5 font-medium">{h.serviceTimeMinutes}m</td>
                    <td className="px-6 py-3.5 text-slate-400">
                      {new Date(h.completedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 8. TAB: SYSTEM SETTINGS */}
      {activeTab === 'SETTINGS' && (
        <div className="space-y-6 max-w-4xl">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <h3 className="font-bold text-base text-slate-900 mb-1">Facility &amp; System Configuration</h3>
            <p className="text-xs text-slate-500 mb-6">Manage hospital details, operating schedules, sound chimes, and thresholds</p>

            {settingsSaved && (
              <div className="mb-6 p-4 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Settings saved successfully.
              </div>
            )}

            <div className="space-y-5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Facility / Hospital Name</label>
                <input
                  type="text"
                  value={systemConfig.hospitalName}
                  onChange={(e) => setSystemConfig({ ...systemConfig, hospitalName: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Branch Location</label>
                <input
                  type="text"
                  value={systemConfig.branchLocation}
                  onChange={(e) => setSystemConfig({ ...systemConfig, branchLocation: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Operating Hours</label>
                  <input
                    type="text"
                    value={systemConfig.operatingHours}
                    onChange={(e) => setSystemConfig({ ...systemConfig, operatingHours: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Max Wait Threshold (Minutes)</label>
                  <input
                    type="number"
                    value={systemConfig.maxWaitThresholdMin}
                    onChange={(e) => setSystemConfig({ ...systemConfig, maxWaitThresholdMin: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={systemConfig.soundAlertsEnabled}
                    onChange={(e) => setSystemConfig({ ...systemConfig, soundAlertsEnabled: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <div>
                    <div className="font-bold text-slate-800">Enable Chime &amp; Audio Voice Alerts</div>
                    <div className="text-[11px] text-slate-400">Play audio chime on public display when calling new tokens</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={systemConfig.autoAdvanceTokens}
                    onChange={(e) => setSystemConfig({ ...systemConfig, autoAdvanceTokens: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <div>
                    <div className="font-bold text-slate-800">Auto-Recall No-Show Patients</div>
                    <div className="text-[11px] text-slate-400">Automatically requeue skipped tokens after 15 minutes buffer</div>
                  </div>
                </label>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setSettingsSaved(true);
                    setTimeout(() => setSettingsSaved(false), 3000);
                  }}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </main>

      {/* MODAL: ADD ORGANIZATION */}
      {showOrgModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-base text-slate-900">Add New Organization</h3>
              <button onClick={() => setShowOrgModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrg} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Organization Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. City General Hospital"
                  value={orgForm.name}
                  onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Organization Type</label>
                <select
                  value={orgForm.type}
                  onChange={(e) => setOrgForm({ ...orgForm, type: e.target.value as any })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                >
                  <option value="HOSPITAL">Hospital</option>
                  <option value="BANK">Bank</option>
                  <option value="SERVICE_CENTER">Service Center / Public Hub</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Address</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 100 Main Street, Suite 400"
                  value={orgForm.address}
                  onChange={(e) => setOrgForm({ ...orgForm, address: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Contact Email</label>
                  <input
                    type="email"
                    placeholder="contact@venue.com"
                    value={orgForm.contactEmail}
                    onChange={(e) => setOrgForm({ ...orgForm, contactEmail: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    placeholder="+1 (555) 000-0000"
                    value={orgForm.contactPhone}
                    onChange={(e) => setOrgForm({ ...orgForm, contactPhone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowOrgModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs"
                >
                  {actionLoading ? 'Saving...' : 'Save Organization'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD SERVICE */}
      {showServiceModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-base text-slate-900">Add New Service</h3>
              <button onClick={() => setShowServiceModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateService} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Parent Organization</label>
                <select
                  value={serviceForm.organizationId}
                  onChange={(e) => setServiceForm({ ...serviceForm, organizationId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                >
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>{org.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Service Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cardiology Specialist"
                  value={serviceForm.name}
                  onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Token Code Prefix</label>
                  <input
                    type="text"
                    required
                    maxLength={3}
                    placeholder="e.g. C"
                    value={serviceForm.codePrefix}
                    onChange={(e) => setServiceForm({ ...serviceForm, codePrefix: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold uppercase"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Avg Service Time (mins)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={120}
                    value={serviceForm.averageServiceTime}
                    onChange={(e) => setServiceForm({ ...serviceForm, averageServiceTime: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Brief description of requirements for customer..."
                  value={serviceForm.description}
                  onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowServiceModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs"
                >
                  {actionLoading ? 'Saving...' : 'Save Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD COUNTER */}
      {showCounterModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-base text-slate-900">Add New Counter Desk</h3>
              <button onClick={() => setShowCounterModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCounter} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Organization</label>
                <select
                  value={counterForm.organizationId}
                  onChange={(e) => setCounterForm({ ...counterForm, organizationId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                >
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>{org.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Counter Number / Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Counter 04 or Desk 02"
                  value={counterForm.counterNumber}
                  onChange={(e) => setCounterForm({ ...counterForm, counterNumber: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Assigned Service (Optional)</label>
                <select
                  value={counterForm.serviceId}
                  onChange={(e) => setCounterForm({ ...counterForm, serviceId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                >
                  <option value="">All Services in Venue</option>
                  {services
                    .filter((s) => s.organizationId === counterForm.organizationId)
                    .map((srv) => (
                      <option key={srv.id} value={srv.id}>{srv.name} ({srv.codePrefix})</option>
                    ))}
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCounterModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs"
                >
                  {actionLoading ? 'Saving...' : 'Save Counter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
