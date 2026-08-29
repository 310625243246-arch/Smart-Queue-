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
  AlertCircle
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
import { request } from '../services/api';
import { Organization, Service, Counter, QueueToken } from '../types';

export const AdminPage: React.FC = () => {
  const { user } = useAuth();

  // Navigation tab
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'ORGS' | 'SERVICES' | 'COUNTERS' | 'LIVE_QUEUES' | 'HISTORY'>('OVERVIEW');

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
      }
    } catch (e) {
      console.warn('Error fetching admin portal data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllAdminData();
  }, []);

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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-indigo-100 text-indigo-800 uppercase">
              Admin & Analytics Control
            </span>
            <span className="text-xs text-slate-400">&bull;</span>
            <span className="text-xs text-slate-500 font-medium">SmartQueue Master Operations</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            System Administration & Analytics
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchAllAdminData}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`mb-6 p-4 rounded-xl flex items-center justify-between text-xs font-medium ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <span>{toastMessage.text}</span>
          <button onClick={() => setToastMessage(null)} className="font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Admin Tab Switcher */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-4 mb-6">
        {[
          { id: 'OVERVIEW', label: 'Overview & Charts', icon: BarChart3 },
          { id: 'LIVE_QUEUES', label: 'Live Multi-Queue Board', icon: Activity },
          { id: 'ORGS', label: 'Organizations', icon: Building2 },
          { id: 'SERVICES', label: 'Services & Timing', icon: Layers },
          { id: 'COUNTERS', label: 'Counters & Staff', icon: Sliders },
          { id: 'HISTORY', label: 'Audit History & Export', icon: Download },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW & ANALYTICS */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-8">
          {/* Key Metrics Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-[11px] font-semibold text-slate-400 mb-1">Total Generated</div>
              <div className="text-2xl font-black text-slate-900">{dashboardStats?.totalCustomers || 0}</div>
              <div className="text-[10px] text-emerald-600 font-bold mt-1">All time tokens</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-[11px] font-semibold text-slate-400 mb-1">Waiting In Queue</div>
              <div className="text-2xl font-black text-amber-500">{dashboardStats?.waitingCustomers || 0}</div>
              <div className="text-[10px] text-amber-600 font-bold mt-1">Live active line</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-[11px] font-semibold text-slate-400 mb-1">Currently Serving</div>
              <div className="text-2xl font-black text-blue-600">{dashboardStats?.currentlyServing || 0}</div>
              <div className="text-[10px] text-blue-600 font-bold mt-1">Active at desks</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-[11px] font-semibold text-slate-400 mb-1">Completed Today</div>
              <div className="text-2xl font-black text-emerald-600">{dashboardStats?.completedToday || 0}</div>
              <div className="text-[10px] text-emerald-600 font-bold mt-1">Visits served</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-[11px] font-semibold text-slate-400 mb-1">Avg Waiting Time</div>
              <div className="text-2xl font-black text-slate-900">
                {dashboardStats?.averageWaitingTimeMinutes || 14}m
              </div>
              <div className="text-[10px] text-slate-500 font-bold mt-1">Queue SLA target</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-[11px] font-semibold text-slate-400 mb-1">Active Desks</div>
              <div className="text-2xl font-black text-slate-900">{dashboardStats?.activeCounters || 0}</div>
              <div className="text-[10px] text-indigo-600 font-bold mt-1">Operational</div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Daily Trend Chart */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <h3 className="font-bold text-sm text-slate-900 mb-1">Weekly Queue Volume & Throughput</h3>
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

      {/* TAB 2: LIVE MULTI-QUEUE BOARD */}
      {activeTab === 'LIVE_QUEUES' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Live Multi-Service Queue Monitor</h3>
              <p className="text-xs text-slate-500">Real-time status across hospitals, banks, and citizen hubs</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {queues.map((q) => (
              <div key={q.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2 py-0.5 rounded text-xs font-black bg-indigo-100 text-indigo-800">
                    Prefix {q.codePrefix}
                  </span>
                  <span className="text-[11px] font-bold text-slate-400 uppercase">
                    {q.organizationType?.replace('_', ' ')}
                  </span>
                </div>

                <h4 className="font-bold text-base text-slate-900">{q.serviceName}</h4>
                <p className="text-xs text-slate-500 mb-6">{q.organizationName}</p>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-3 bg-slate-50 rounded-xl text-center">
                    <div className="text-[10px] text-slate-400 font-semibold mb-0.5">Now Serving</div>
                    <div className="text-xl font-black text-blue-600">{q.currentToken}</div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl text-center">
                    <div className="text-[10px] text-slate-400 font-semibold mb-0.5">In Waiting Line</div>
                    <div className="text-xl font-black text-amber-600">{q.waitingCount}</div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Active Desks: <strong>{q.activeCounters}</strong></span>
                  <span>Est. Wait: <strong>~{q.estimatedWaitTime}m</strong></span>
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

      {/* TAB 6: AUDIT HISTORY & EXPORT */}
      {activeTab === 'HISTORY' && (
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
