import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Users, 
  Play, 
  CheckCircle2, 
  SkipForward, 
  RotateCcw, 
  Power, 
  PauseCircle, 
  Activity, 
  AlertCircle, 
  Timer, 
  Volume2, 
  Clock, 
  Building2, 
  RefreshCw,
  PhoneCall,
  UserCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { request } from '../services/api';
import { Counter, Service, QueueToken } from '../types';

export const StaffPage: React.FC = () => {
  const { user, loading: authLoading, switchRole } = useAuth();
  const navigate = useNavigate();
  const [roleSwitching, setRoleSwitching] = useState(false);

  // State
  const [counters, setCounters] = useState<Counter[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedCounterId, setSelectedCounterId] = useState<string>('');
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');

  // Queue state for selected service
  const [waitingTokens, setWaitingTokens] = useState<QueueToken[]>([]);
  const [servingTokens, setServingTokens] = useState<QueueToken[]>([]);
  const [currentActiveToken, setCurrentActiveToken] = useState<QueueToken | null>(null);

  // Status & Timers
  const [counterStatus, setCounterStatus] = useState<'ACTIVE' | 'PAUSED' | 'OFFLINE'>('ACTIVE');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [serviceTimeSeconds, setServiceTimeSeconds] = useState(0);
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Fetch initial counters & services
  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [cntRes, srvRes] = await Promise.all([
        request<{ counters: Counter[] }>('/counters'),
        request<{ services: Service[] }>('/services'),
      ]);

      const availableCounters = cntRes.counters || [];
      const availableServices = srvRes.services || [];

      setCounters(availableCounters);
      setServices(availableServices);

      if (availableCounters.length > 0) {
        // Pick counter assigned to staff or first
        const userCounter = availableCounters.find((c) => c.staffId === user?.id) || availableCounters[0];
        setSelectedCounterId(userCounter.id);
        setSelectedServiceId(userCounter.serviceId || availableServices[0]?.id || '');
        setCounterStatus(userCounter.status);
      }
    } catch (err: any) {
      console.warn('Error loading staff console:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading || (user?.role !== 'STAFF' && user?.role !== 'ADMIN')) {
      return;
    }
    fetchInitialData();
  }, [authLoading, user?.role, user?.id]);

  // Fetch live queue status for selected service
  const refreshQueueStatus = async () => {
    if (!selectedServiceId) return;
    try {
      const data = await request<{
        waitingTokens: QueueToken[];
        servingTokens: QueueToken[];
      }>(`/queues/${selectedServiceId}/status`);

      setWaitingTokens(data.waitingTokens || []);
      setServingTokens(data.servingTokens || []);

      // Check if current counter has an active token
      const currentCounter = counters.find((c) => c.id === selectedCounterId);
      if (currentCounter && currentCounter.currentTokenId) {
        try {
          const tokRes = await request<{ token: QueueToken }>(`/tokens/${currentCounter.currentTokenId}`);
          setCurrentActiveToken(tokRes.token);
        } catch {
          setCurrentActiveToken(null);
        }
      } else {
        // Fallback check if any serving token matches this counter
        const servingAtCounter = (data.servingTokens || []).find((t) => t.counterId === selectedCounterId);
        setCurrentActiveToken(servingAtCounter || null);
      }
    } catch (e) {
      console.warn('Error refreshing queue status:', e);
    }
  };

  useEffect(() => {
    if (authLoading || (user?.role !== 'STAFF' && user?.role !== 'ADMIN') || !selectedServiceId) {
      return;
    }
    refreshQueueStatus();
    const interval = setInterval(refreshQueueStatus, 4000);
    return () => clearInterval(interval);
  }, [authLoading, user?.role, selectedServiceId, selectedCounterId, counters]);

  // Service stopwatch timer
  useEffect(() => {
    let timer: any;
    if (currentActiveToken && (currentActiveToken.status === 'SERVING' || currentActiveToken.status === 'CALLED')) {
      timer = setInterval(() => {
        setServiceTimeSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setServiceTimeSeconds(0);
    }
    return () => clearInterval(timer);
  }, [currentActiveToken]);

  // Actions: CALL NEXT
  const handleCallNext = async () => {
    if (!selectedCounterId || !selectedServiceId) {
      setAlertMessage({ type: 'error', text: 'Please select an active Counter and Service.' });
      return;
    }

    setActionLoading(true);
    setAlertMessage(null);

    try {
      const res = await request<{ token: QueueToken; message: string }>('/staff/queue/next', {
        method: 'POST',
        body: JSON.stringify({
          counterId: selectedCounterId,
          serviceId: selectedServiceId,
        }),
      });

      setCurrentActiveToken(res.token);
      setServiceTimeSeconds(0);
      setAlertMessage({ type: 'success', text: `Called Token ${res.token.tokenNumber} to Counter!` });
      refreshQueueStatus();
    } catch (err: any) {
      setAlertMessage({ type: 'error', text: err.message || 'No waiting customers or queue error.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Action: START SERVING
  const handleStartServing = async () => {
    if (!currentActiveToken) return;
    setActionLoading(true);
    try {
      const res = await request<{ token: QueueToken }>(`/staff/tokens/${currentActiveToken.id}/start`, {
        method: 'POST',
      });
      setCurrentActiveToken(res.token);
      setAlertMessage({ type: 'info', text: `Service started for ${res.token.tokenNumber}. Timer active.` });
      refreshQueueStatus();
    } catch (err: any) {
      setAlertMessage({ type: 'error', text: err.message || 'Failed to start service.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Action: COMPLETE SERVICE
  const handleCompleteService = async () => {
    if (!currentActiveToken) return;
    setActionLoading(true);
    try {
      await request(`/staff/tokens/${currentActiveToken.id}/complete`, {
        method: 'POST',
      });
      setAlertMessage({ type: 'success', text: `Token ${currentActiveToken.tokenNumber} marked as Completed!` });
      setCurrentActiveToken(null);
      setServiceTimeSeconds(0);
      refreshQueueStatus();
    } catch (err: any) {
      setAlertMessage({ type: 'error', text: err.message || 'Failed to complete service.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Action: SKIP CUSTOMER
  const handleSkipCustomer = async () => {
    if (!currentActiveToken) return;
    setActionLoading(true);
    try {
      await request(`/staff/tokens/${currentActiveToken.id}/skip`, {
        method: 'POST',
      });
      setAlertMessage({ type: 'info', text: `Token ${currentActiveToken.tokenNumber} was skipped.` });
      setCurrentActiveToken(null);
      refreshQueueStatus();
    } catch (err: any) {
      setAlertMessage({ type: 'error', text: err.message || 'Failed to skip token.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Action: RECALL TOKEN
  const handleRecallToken = async (tokenId: string) => {
    setActionLoading(true);
    try {
      const res = await request<{ token: QueueToken }>(`/staff/tokens/${tokenId}/recall`, {
        method: 'POST',
        body: JSON.stringify({ counterId: selectedCounterId }),
      });
      setCurrentActiveToken(res.token);
      setAlertMessage({ type: 'success', text: `Recalled token ${res.token.tokenNumber} to counter.` });
      refreshQueueStatus();
    } catch (err: any) {
      setAlertMessage({ type: 'error', text: err.message || 'Failed to recall token.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Toggle Counter Status
  const handleStatusChange = async (newStatus: 'ACTIVE' | 'PAUSED' | 'OFFLINE') => {
    if (!selectedCounterId) return;
    try {
      await request(`/staff/counter/status`, {
        method: 'POST',
        body: JSON.stringify({ counterId: selectedCounterId, status: newStatus }),
      });
      setCounterStatus(newStatus);
      setAlertMessage({ type: 'info', text: `Counter status updated to ${newStatus}` });
    } catch (err: any) {
      setAlertMessage({ type: 'error', text: err.message || 'Failed to change counter status.' });
    }
  };

  const handleRoleSwitch = async (role: 'STAFF') => {
    setRoleSwitching(true);
    try {
      await switchRole(role);
    } catch (err: any) {
      setAlertMessage({ type: 'error', text: err.message || 'Unable to switch to staff account.' });
    } finally {
      setRoleSwitching(false);
    }
  };

  const selectedCounter = counters.find((c) => c.id === selectedCounterId);
  const selectedService = services.find((s) => s.id === selectedServiceId);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // If session initialization is still loading, show clean loading message
  if (authLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold text-slate-700">Loading staff session...</p>
      </div>
    );
  }

  // Role separation guard: Customer accounts are blocked from accessing staff controls
  if (user?.role !== 'STAFF' && user?.role !== 'ADMIN') {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-sm">
          <Activity className="w-7 h-7" />
        </div>
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
          Role-Protected Area
        </span>
        <h2 className="text-xl font-bold text-slate-900 mt-1">Staff Counter Console</h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-2 mb-6">
          This portal is reserved for service counter operators to call tokens, record service times, and manage active desks.
        </p>

        <div className="space-y-3">
          <button
            onClick={() => handleRoleSwitch('STAFF')}
            disabled={roleSwitching}
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
          >
            {roleSwitching ? 'Switching Profile...' : 'Enter with Staff Profile'}
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-emerald-100 text-emerald-800 uppercase">
              Staff Queue Console
            </span>
            <span className="text-xs text-slate-400">&bull;</span>
            <span className="text-xs text-slate-600 font-medium">
              Operator: <strong className="text-slate-900">{user?.name || 'Staff User'}</strong>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Counter Desk & Queue Controller
          </h1>
        </div>

        {/* Counter and Service Selector */}
        <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Assigned Counter
            </label>
            <select
              value={selectedCounterId}
              onChange={(e) => setSelectedCounterId(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500"
            >
              {counters.map((cnt) => (
                <option key={cnt.id} value={cnt.id}>
                  {cnt.counterNumber} ({cnt.organizationName || 'Venue'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Active Queue Service
            </label>
            <select
              value={selectedServiceId}
              onChange={(e) => setSelectedServiceId(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500"
            >
              {services.map((srv) => (
                <option key={srv.id} value={srv.id}>
                  {srv.name} (Code {srv.codePrefix})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Counter Status
            </label>
            <div className="flex gap-1">
              {(['ACTIVE', 'PAUSED', 'OFFLINE'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => handleStatusChange(st)}
                  className={`px-2 py-1 text-[10px] font-extrabold rounded-md transition-colors ${
                    counterStatus === st
                      ? st === 'ACTIVE'
                        ? 'bg-emerald-600 text-white'
                        : st === 'PAUSED'
                        ? 'bg-amber-500 text-white'
                        : 'bg-rose-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Alert Banners */}
      {alertMessage && (
        <div
          className={`mb-6 p-4 rounded-xl flex items-center justify-between text-xs font-medium ${
            alertMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : alertMessage.type === 'error'
              ? 'bg-rose-50 text-rose-800 border border-rose-200'
              : 'bg-blue-50 text-blue-800 border border-blue-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{alertMessage.text}</span>
          </div>
          <button onClick={() => setAlertMessage(null)} className="font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Grid: Control Deck + Waiting Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Spotlight Serving Card & Call Next Console (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Current Serving Spotlight */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-6 sm:p-8 relative overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {selectedCounter?.counterNumber || 'Counter 01'}
                </span>
                <h3 className="text-lg font-bold text-slate-900">Current Serving Token</h3>
              </div>

              {currentActiveToken && (
                <span
                  className={`px-3 py-1 text-xs font-black rounded-full uppercase ${
                    currentActiveToken.status === 'SERVING'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse'
                      : 'bg-blue-100 text-blue-800 border border-blue-300'
                  }`}
                >
                  {currentActiveToken.status}
                </span>
              )}
            </div>

            {currentActiveToken ? (
              <div>
                <div className="text-center py-6 bg-slate-50 rounded-2xl border border-slate-100 mb-6">
                  <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">
                    Token Number
                  </div>
                  <div className="text-5xl sm:text-6xl font-black text-blue-600 tracking-tight">
                    {currentActiveToken.tokenNumber}
                  </div>

                  <div className="mt-4 flex items-center justify-center gap-2 text-slate-700 font-semibold text-sm">
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                    <span>{currentActiveToken.customerName}</span>
                    <span className="text-slate-300">&bull;</span>
                    <span className="text-slate-500 text-xs">{currentActiveToken.customerEmail}</span>
                  </div>

                  {/* Stopwatch Counter */}
                  <div className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 bg-white rounded-full border border-slate-200 shadow-xs">
                    <Timer className="w-4 h-4 text-blue-600 animate-spin" />
                    <span className="text-xs text-slate-500 font-medium">Session Duration:</span>
                    <span className="text-sm font-mono font-bold text-slate-900">
                      {formatTimer(serviceTimeSeconds)}
                    </span>
                  </div>
                </div>

                {/* Serving Actions */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {currentActiveToken.status === 'CALLED' ? (
                    <button
                      onClick={handleStartServing}
                      disabled={actionLoading}
                      className="py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 sm:col-span-2"
                    >
                      <Play className="w-4 h-4 fill-white" />
                      Start Serving Customer
                    </button>
                  ) : (
                    <button
                      onClick={handleCompleteService}
                      disabled={actionLoading}
                      className="py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2 sm:col-span-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Complete Service & Advance
                    </button>
                  )}

                  <button
                    onClick={handleSkipCustomer}
                    disabled={actionLoading}
                    className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2"
                  >
                    <SkipForward className="w-4 h-4 text-slate-500" />
                    Skip Token
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h4 className="text-base font-bold text-slate-800">Counter is Currently Idle</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-6">
                  Ready to serve the next customer in line. Click &ldquo;Call Next Customer&rdquo; to pull from the active queue.
                </p>

                <button
                  onClick={handleCallNext}
                  disabled={actionLoading || waitingTokens.length === 0 || counterStatus !== 'ACTIVE'}
                  className="py-4 px-8 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-black text-sm rounded-xl shadow-lg shadow-blue-600/25 transition-all inline-flex items-center gap-2"
                >
                  <PhoneCall className="w-4 h-4" />
                  {waitingTokens.length === 0
                    ? 'No Customers in Queue'
                    : `Call Next Customer (${waitingTokens.length} Waiting)`}
                </button>
              </div>
            )}
          </div>

          {/* Quick Counter Info & Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 text-center shadow-xs">
              <div className="text-xs text-slate-400 font-semibold mb-1">Queue Depth</div>
              <div className="text-2xl font-black text-slate-900">{waitingTokens.length}</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 text-center shadow-xs">
              <div className="text-xs text-slate-400 font-semibold mb-1">Active Serving</div>
              <div className="text-2xl font-black text-emerald-600">{servingTokens.length}</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 text-center shadow-xs">
              <div className="text-xs text-slate-400 font-semibold mb-1">Target Service Time</div>
              <div className="text-2xl font-black text-slate-900">
                {selectedService?.averageServiceTime || 10}m
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Waiting Line & Recall (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                  Waiting Customers Line
                </h3>
                <p className="text-xs text-slate-500">Service: {selectedService?.name}</p>
              </div>

              <button
                onClick={refreshQueueStatus}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                title="Refresh Queue"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {waitingTokens.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No customers waiting in line for this service.
                </div>
              ) : (
                waitingTokens.map((token, index) => (
                  <div
                    key={token.id}
                    className="p-4 hover:bg-slate-50/70 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 font-black text-xs flex items-center justify-center">
                        #{index + 1}
                      </span>
                      <div>
                        <div className="font-extrabold text-sm text-slate-900">{token.tokenNumber}</div>
                        <div className="text-xs text-slate-600">{token.customerName}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Joined {new Date(token.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                        WAITING
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
