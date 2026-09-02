import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useQueue } from '../context/QueueContext';
import { 
  Building2, 
  HeartPulse, 
  Landmark, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  ArrowRight, 
  Layers, 
  RefreshCw, 
  Search,
  BellRing,
  Check,
  User,
  History,
  Timer
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { request } from '../services/api';
import { Organization, Service, QueueToken } from '../types';

export const CustomerPage: React.FC = () => {
  const { user } = useAuth();
  const { refreshTokens } = useQueue();

  // Data states
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [activeTokens, setActiveTokens] = useState<QueueToken[]>([]);
  const [pastTokens, setPastTokens] = useState<QueueToken[]>([]);
  const [historyRecords, setHistoryRecords] = useState<any[]>([]);

  // Selection states
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [guestName, setGuestName] = useState<string>(user?.name || '');
  const [guestEmail, setGuestEmail] = useState<string>(user?.email || '');

  // UI States
  const [activeTab, setActiveTab] = useState<'JOIN' | 'MY_TOKENS' | 'HISTORY'>('JOIN');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'HOSPITAL' | 'BANK' | 'SERVICE_CENTER'>('ALL');
  const [orgSearch, setOrgSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [tokenToCancel, setTokenToCancel] = useState<QueueToken | null>(null);

  // Fetch all initial customer data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [orgsRes, srvRes] = await Promise.all([
        request<{ organizations: Organization[] }>('/organizations'),
        request<{ services: Service[] }>('/services'),
      ]);
      setOrganizations(orgsRes.organizations || []);
      setServices(srvRes.services || []);

      if (user) {
        const tokenData = await request<{ activeTokens: QueueToken[]; pastTokens: QueueToken[] }>('/customer/tokens');
        setActiveTokens(tokenData.activeTokens || []);
        setPastTokens(tokenData.pastTokens || []);

        const histData = await request<{ history: any[] }>('/customer/history');
        setHistoryRecords(histData.history || []);
      }
    } catch (err: any) {
      console.warn('Error fetching customer portal data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  // Handle Token Generation (Join Queue)
  const handleJoinQueue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedServiceId) {
      setErrorMessage('Please choose a service to take a token.');
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setActionLoading(true);

    try {
      const data = await request<{ token: QueueToken; message: string }>('/queues/join', {
        method: 'POST',
        body: JSON.stringify({
          serviceId: selectedServiceId,
          customerName: user ? user.name : (guestName || 'Guest Customer'),
          customerEmail: user ? user.email : (guestEmail || 'guest@smartqueue.com'),
        }),
      });

      setSuccessMessage(`Success! Your Digital Token is ${data.token.tokenNumber}`);
      setActiveTokens((prev) => [data.token, ...prev]);
      refreshTokens();
      setActiveTab('MY_TOKENS');
      // Reset service selection
      setSelectedServiceId('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to join queue. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Cancel Token
  const handleConfirmCancel = async () => {
    if (!tokenToCancel) return;
    setActionLoading(true);
    try {
      await request(`/tokens/${tokenToCancel.id}/cancel`, { method: 'POST' });
      setActiveTokens((prev) => prev.filter((t) => t.id !== tokenToCancel.id));
      setTokenToCancel(null);
      setSuccessMessage(`Token ${tokenToCancel.tokenNumber} was cancelled.`);
      fetchData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to cancel token.');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredOrgs = organizations.filter((org) => {
    const matchesCategory = categoryFilter === 'ALL' || org.type === categoryFilter;
    const matchesSearch = org.name.toLowerCase().includes(orgSearch.toLowerCase()) ||
      org.address.toLowerCase().includes(orgSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const availableServices = selectedOrgId
    ? services.filter((s) => s.organizationId === selectedOrgId && s.isActive)
    : [];

  const selectedOrg = organizations.find((o) => o.id === selectedOrgId);
  const selectedService = services.find((s) => s.id === selectedServiceId);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-blue-100 text-blue-800 uppercase">
              Customer Portal
            </span>
            <span className="text-xs text-slate-400">&bull;</span>
            <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Queue Synced
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Digital Queue & Token Tracker
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {user ? `Logged in as ${user.name} (${user.email})` : 'Join any service queue and track your position in real time.'}
          </p>
        </div>

        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 self-start md:self-auto">
          <button
            onClick={() => setActiveTab('JOIN')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'JOIN' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            Take Token
          </button>

          <button
            onClick={() => setActiveTab('MY_TOKENS')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'MY_TOKENS' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Active Tokens
            {activeTokens.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-blue-600 text-white text-[10px] font-black">
                {activeTokens.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'HISTORY' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Visit History
          </button>
        </div>
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-emerald-800 text-sm">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>{successMessage}</div>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-xs font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between text-rose-800 text-sm">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <div>{errorMessage}</div>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-xs font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* TAB 1: JOIN QUEUE WIZARD */}
      {activeTab === 'JOIN' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Step 1: Select Organization */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">1</span>
                    Choose Organization
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">Select a hospital, bank branch, or citizen service center</p>
                </div>

                {/* Filter chips */}
                <div className="flex flex-wrap gap-1.5">
                  {(['ALL', 'HOSPITAL', 'BANK', 'SERVICE_CENTER'] as const).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                        categoryFilter === cat
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {cat === 'ALL' ? 'All Venues' : cat === 'HOSPITAL' ? 'Hospitals' : cat === 'BANK' ? 'Banks' : 'Govt Hubs'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative mb-4">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Search organization by name or location..."
                  value={orgSearch}
                  onChange={(e) => setOrgSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              {/* Org List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
                {filteredOrgs.map((org) => {
                  const isSelected = selectedOrgId === org.id;
                  return (
                    <div
                      key={org.id}
                      onClick={() => {
                        setSelectedOrgId(org.id);
                        setSelectedServiceId('');
                      }}
                      className={`p-4 rounded-xl border transition-all cursor-pointer text-left flex flex-col justify-between ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/50 shadow-xs ring-1 ring-blue-600'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className={`p-1.5 rounded-lg ${
                            org.type === 'HOSPITAL' ? 'bg-rose-100 text-rose-700' :
                            org.type === 'BANK' ? 'bg-blue-100 text-blue-700' :
                            'bg-emerald-100 text-emerald-700'
                          }`}>
                            {org.type === 'HOSPITAL' ? <HeartPulse className="w-4 h-4" /> :
                             org.type === 'BANK' ? <Landmark className="w-4 h-4" /> :
                             <Building2 className="w-4 h-4" />}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 uppercase">
                            {org.type.replace('_', ' ')}
                          </span>
                        </div>
                        <h3 className="font-bold text-sm text-slate-900 leading-tight">{org.name}</h3>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-1">{org.address}</p>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                        <span>{org.contactPhone || 'Available'}</span>
                        {isSelected && <span className="font-bold text-blue-600 flex items-center gap-1"><Check className="w-3 h-3" /> Selected</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Select Service */}
            {selectedOrgId && (
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs animate-in fade-in">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-1">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">2</span>
                  Select Service at {selectedOrg?.name}
                </h2>
                <p className="text-xs text-slate-500 mb-4">Choose the specific service queue you want to join</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {availableServices.length === 0 ? (
                    <div className="col-span-2 text-center p-6 text-slate-400 text-xs bg-slate-50 rounded-xl">
                      No active services configured for this venue.
                    </div>
                  ) : (
                    availableServices.map((srv) => {
                      const isSelected = selectedServiceId === srv.id;
                      return (
                        <div
                          key={srv.id}
                          onClick={() => setSelectedServiceId(srv.id)}
                          className={`p-4 rounded-xl border transition-all cursor-pointer ${
                            isSelected
                              ? 'border-blue-600 bg-blue-50/50 shadow-xs ring-1 ring-blue-600'
                              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="px-2 py-0.5 rounded text-xs font-black bg-blue-600 text-white">
                              Code {srv.codePrefix}
                            </span>
                            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                              <Timer className="w-3 h-3 text-slate-400" />
                              ~{srv.averageServiceTime}m avg
                            </span>
                          </div>
                          <h4 className="font-bold text-sm text-slate-900">{srv.name}</h4>
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2">{srv.description}</p>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Step 3: Summary & Generate Token Card */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-md sticky top-24">
              <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">3</span>
                Token Confirmation
              </h3>

              {!user && (
                <div className="space-y-3 mb-4 pb-4 border-b border-slate-100">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Your Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Alex Johnson"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Email (for alerts)</label>
                    <input
                      type="email"
                      required
                      placeholder="customer@example.com"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-3 bg-slate-50 p-4 rounded-xl text-xs mb-6">
                <div className="flex justify-between">
                  <span className="text-slate-500">Selected Venue:</span>
                  <span className="font-bold text-slate-900 text-right">{selectedOrg ? selectedOrg.name : 'None selected'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Selected Service:</span>
                  <span className="font-bold text-blue-600 text-right">{selectedService ? selectedService.name : 'None selected'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Token Format:</span>
                  <span className="font-bold text-slate-900">{selectedService ? `${selectedService.codePrefix}100+` : '--'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Est. Service Duration:</span>
                  <span className="font-bold text-slate-900">{selectedService ? `~${selectedService.averageServiceTime} min` : '--'}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleJoinQueue}
                disabled={!selectedOrgId || !selectedServiceId || actionLoading}
                className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold rounded-xl text-sm shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                {actionLoading ? 'Generating Token...' : 'Generate Digital Token'}
              </button>

              <p className="text-[11px] text-slate-400 text-center mt-3">
                Live queue position and SMS/In-app alerts will be attached to this token.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ACTIVE TOKENS TRACKER */}
      {activeTab === 'MY_TOKENS' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Your Active Digital Tokens</h2>
            <button
              onClick={fetchData}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
          </div>

          {activeTokens.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 shadow-xs text-center max-w-md mx-auto">
              <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="font-bold text-slate-800 text-base mb-1">No Active Tokens</h3>
              <p className="text-xs text-slate-500 mb-6">
                You currently don't have any active queue tokens. Select a venue and service to take a new token.
              </p>
              <button
                onClick={() => setActiveTab('JOIN')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs"
              >
                Join a Queue Now
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {activeTokens.map((token) => {
                const isCalled = token.status === 'CALLED';
                const isServing = token.status === 'SERVING';

                return (
                  <div
                    key={token.id}
                    className={`bg-white rounded-2xl border transition-all p-6 relative overflow-hidden shadow-md ${
                      isCalled
                        ? 'border-blue-500 ring-2 ring-blue-500/20 bg-gradient-to-b from-blue-50/40 to-white'
                        : isServing
                        ? 'border-emerald-500 bg-gradient-to-b from-emerald-50/40 to-white'
                        : 'border-slate-200'
                    }`}
                  >
                    {/* Status Ribbon */}
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                      <div>
                        <div className="text-xs text-slate-400 font-medium">Service & Venue</div>
                        <h4 className="font-bold text-base text-slate-900 leading-tight">{token.serviceName}</h4>
                        <p className="text-xs text-slate-500">{token.organizationName}</p>
                      </div>

                      <span className={`px-3 py-1 text-xs font-bold rounded-full border ${
                        isCalled ? 'bg-blue-600 text-white border-blue-600 animate-pulse' :
                        isServing ? 'bg-emerald-600 text-white border-emerald-600' :
                        'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {token.status}
                      </span>
                    </div>

                    {/* Calling Alert Banner */}
                    {isCalled && (
                      <div className="mb-4 p-3 bg-blue-600 text-white rounded-xl text-center font-bold text-xs flex items-center justify-center gap-2 animate-bounce shadow-md">
                        <BellRing className="w-4 h-4" />
                        YOUR TURN! PLEASE PROCEED TO {token.counterNumber ? `COUNTER ${token.counterNumber}` : 'THE COUNTER'}
                      </div>
                    )}

                    {/* Metric Cards Grid */}
                    <div className="grid grid-cols-3 gap-3 text-center mb-6">
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="text-[11px] text-slate-400 font-medium mb-0.5">Your Token</div>
                        <div className="text-2xl font-black text-blue-600">{token.tokenNumber}</div>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="text-[11px] text-slate-400 font-medium mb-0.5">People Ahead</div>
                        <div className="text-2xl font-black text-slate-800">
                          {isServing ? '0 (Serving)' : isCalled ? '0 (Called)' : token.peopleAhead}
                        </div>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="text-[11px] text-slate-400 font-medium mb-0.5">Est. Wait</div>
                        <div className="text-2xl font-black text-slate-800">
                          {isServing ? 'In Progress' : isCalled ? 'Immediate' : `~${token.estimatedWaitMinutes}m`}
                        </div>
                      </div>
                    </div>

                    {/* Details and Actions */}
                    <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
                      <div>
                        Assigned Counter:{' '}
                        <span className="font-bold text-slate-800">
                          {token.counterNumber ? token.counterNumber : 'Pending Assignment'}
                        </span>
                      </div>

                      {token.status === 'WAITING' && (
                        <button
                          onClick={() => setTokenToCancel(token)}
                          className="text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Cancel Token
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: VISIT HISTORY */}
      {activeTab === 'HISTORY' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Queue Visit History</h2>
              <p className="text-xs text-slate-500">Record of completed, skipped, and cancelled queue visits</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 uppercase font-bold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Token</th>
                  <th className="px-6 py-3">Organization & Service</th>
                  <th className="px-6 py-3">Counter</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Wait Time</th>
                  <th className="px-6 py-3">Service Time</th>
                  <th className="px-6 py-3">Completed Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {historyRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                      No past queue records found.
                    </td>
                  </tr>
                ) : (
                  historyRecords.map((hist) => (
                    <tr key={hist.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-3.5 font-black text-blue-600">{hist.tokenNumber}</td>
                      <td className="px-6 py-3.5">
                        <div className="font-bold text-slate-900">{hist.serviceName}</div>
                        <div className="text-[11px] text-slate-400">{hist.organizationName}</div>
                      </td>
                      <td className="px-6 py-3.5 font-medium">{hist.counterNumber || 'Counter 01'}</td>
                      <td className="px-6 py-3.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">
                          {hist.status}
                        </span>
                      </td>
                      <td className="px-6 py-3.5">{hist.waitingTimeMinutes} mins</td>
                      <td className="px-6 py-3.5">{hist.serviceTimeMinutes} mins</td>
                      <td className="px-6 py-3.5 text-slate-400">
                        {new Date(hist.completedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Token Cancellation */}
      {tokenToCancel && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-2">Cancel Token {tokenToCancel.tokenNumber}?</h3>
            <p className="text-xs text-slate-600 mb-6 leading-relaxed">
              Are you sure you want to leave the queue? You will forfeit your current position of {tokenToCancel.peopleAhead} people ahead.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setTokenToCancel(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors"
              >
                Keep Token
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={actionLoading}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
              >
                {actionLoading ? 'Cancelling...' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
