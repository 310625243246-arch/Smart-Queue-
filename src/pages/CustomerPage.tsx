import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  BellRing, 
  ArrowRight, 
  Volume2, 
  VolumeX, 
  RefreshCw, 
  Check, 
  ChevronRight, 
  Building2, 
  Sparkles, 
  X, 
  Ticket, 
  ExternalLink,
  ChevronDown,
  MapPin
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { request } from '../services/api';
import { connectSSE } from '../services/sse';
import { QueueToken, Service, Organization } from '../types';

const STANDARD_SERVICES = [
  { id: 'srv-gen-enquiry', name: 'General Enquiry', description: 'Quick inquiries, receptionist assistance, desk routing', avgTime: 8 },
  { id: 'srv-cust-support', name: 'Customer Support', description: 'Assistance with inquiries, complaints, and technical support', avgTime: 8 },
  { id: 'srv-acc-service', name: 'Account Service', description: 'Account registration, profile updates, and statements', avgTime: 8 },
  { id: 'srv-consultation', name: 'Consultation', description: 'Specialist case assessment and one-on-one review', avgTime: 8 },
  { id: 'srv-other', name: 'Other', description: 'Special requests, notary, and general counter services', avgTime: 8 },
];

export const CustomerPage: React.FC = () => {
  const { user } = useAuth();

  // Form State
  const [customerName, setCustomerName] = useState(user?.name || '');
  const [selectedService, setSelectedService] = useState('General Enquiry');
  const [customerEmail, setCustomerEmail] = useState(user?.email || '');

  // Active Token & Queue State
  const [activeToken, setActiveToken] = useState<QueueToken | null>(null);
  const [allTokens, setAllTokens] = useState<QueueToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [viewMode, setViewMode] = useState<'SIMPLE' | 'EXPLORE_ALL'>('SIMPLE');

  // Multi-venue queues state (preserves existing feature)
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');

  const previousStatusRef = useRef<string | null>(null);

  // Play audio alert chime
  const playAlertChime = () => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.18); // G5
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } catch {
      // Audio context may be restricted by autoplay policy
    }
  };

  // Sync user prop
  useEffect(() => {
    if (user?.name && !customerName) setCustomerName(user.name);
    if (user?.email && !customerEmail) setCustomerEmail(user.email);
  }, [user]);

  // Fetch active token and venues
  const refreshTokens = async () => {
    try {
      setErrorMessage(null);
      // 1. Fetch user/guest tokens
      const localTokenId = localStorage.getItem('smartqueue_active_token_id');
      const token = localStorage.getItem('smartqueue_token');

      let list: QueueToken[] = [];
      if (token) {
        try {
          const tokenRes = await request<{ activeTokens: QueueToken[]; historyTokens: QueueToken[] }>('/customer/tokens');
          list = tokenRes.activeTokens || [];
          setAllTokens(list);
        } catch {
          // guest or session unauthenticated
        }
      }

      // Find best active token
      let current: QueueToken | null = null;
      if (localTokenId) {
        current = list.find((t) => t.id === localTokenId) || null;
        if (!current) {
          // Try fetching by ID directly
          try {
            const single = await request<{ token: QueueToken }>(`/tokens/${localTokenId}`);
            if (single.token && !['COMPLETED', 'CANCELLED', 'SKIPPED'].includes(single.token.status)) {
              current = single.token;
            } else {
              localStorage.removeItem('smartqueue_active_token_id');
            }
          } catch {
            localStorage.removeItem('smartqueue_active_token_id');
          }
        }
      }

      if (!current && list.length > 0) {
        current = list[0];
        localStorage.setItem('smartqueue_active_token_id', current.id);
      }

      // Check if status changed to CALLED
      if (current) {
        if (current.status === 'CALLED' && previousStatusRef.current !== 'CALLED') {
          playAlertChime();
        }
        previousStatusRef.current = current.status;
      }

      setActiveToken(current);
    } catch (err: any) {
      console.warn('Queue refresh error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch venue data for explore mode & hospital selection
  const fetchVenueData = async () => {
    try {
      const [orgRes, srvRes] = await Promise.all([
        request<{ organizations: Organization[] }>('/organizations'),
        request<{ services: Service[] }>('/services'),
      ]);
      const orgs = orgRes.organizations || [];
      const srvs = srvRes.services || [];
      setOrganizations(orgs);
      setServices(srvs);

      if (orgs.length > 0) {
        // Prioritize hospital organization by default
        const hospital = orgs.find((o) => o.type === 'HOSPITAL') || orgs[0];
        setSelectedOrgId(hospital.id);
        const matched = srvs.filter((s) => s.organizationId === hospital.id);
        if (matched.length > 0) {
          setSelectedService(matched[0].id);
        }
      }
    } catch {
      // optional
    }
  };

  const handleOrgChange = (newOrgId: string) => {
    setSelectedOrgId(newOrgId);
    const orgServices = services.filter((s) => s.organizationId === newOrgId);
    if (orgServices.length > 0) {
      setSelectedService(orgServices[0].id);
    }
  };

  // Initial load + Real-time SSE + polling fallback
  useEffect(() => {
    refreshTokens();
    fetchVenueData();

    const interval = setInterval(() => {
      const hasToken = localStorage.getItem('smartqueue_token');
      const hasLocalTokenId = localStorage.getItem('smartqueue_active_token_id');
      if (hasToken || hasLocalTokenId) {
        refreshTokens();
      }
    }, 4000);

    const sse = connectSSE();
    const unsub = sse.subscribe((event) => {
      if (event.type === 'QUEUE_ADVANCED' || event.type === 'TOKEN_UPDATED') {
        refreshTokens();
      }
    });

    return () => {
      clearInterval(interval);
      unsub();
    };
  }, []);

  // Form Submit: JOIN QUEUE
  const handleJoinQueue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      setErrorMessage('Please enter your full name to generate a token.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const payload = {
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim() || `${customerName.trim().toLowerCase().replace(/\s+/g, '')}@smartqueue.com`,
        facilityId: selectedOrgId,
        organizationId: selectedOrgId,
        serviceId: selectedService,
      };

      const res = await request<{ message: string; token: QueueToken }>('/queues/join', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res.token) {
        setActiveToken(res.token);
        localStorage.setItem('smartqueue_active_token_id', res.token.id);
        refreshTokens();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to join queue right now. Please check your connection.');
    } finally {
      setSubmitting(false);
    }
  };

  // Action: LEAVE QUEUE (Cancel Token)
  const handleLeaveQueue = async () => {
    if (!activeToken) return;
    if (!confirm('Are you sure you want to cancel your queue token? You will lose your position.')) return;

    try {
      await request(`/tokens/${activeToken.id}/cancel`, { method: 'POST' });
      localStorage.removeItem('smartqueue_active_token_id');
      setActiveToken(null);
      refreshTokens();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to cancel token');
    }
  };

  // Derive dynamic waiting time
  const peopleAhead = activeToken ? (activeToken.status === 'WAITING' ? activeToken.peopleAhead : 0) : 0;
  const estimatedWait = activeToken 
    ? (activeToken.status === 'WAITING' ? activeToken.estimatedWaitMinutes || peopleAhead * 8 : 0) 
    : 0;

  // Derive visual sequence path strictly for this service
  const nowServingToken = activeToken?.nowServing && activeToken.nowServing !== 'None' 
    ? activeToken.nowServing 
    : 'None';

  const sequencePath = activeToken?.sequencePath && activeToken.sequencePath.length > 0
    ? activeToken.sequencePath
    : (activeToken ? [activeToken.tokenNumber] : []);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Top Brand Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold uppercase tracking-wider mb-3">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          SmartQueue
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Digital Queue Management System
        </h1>
        <p className="text-base text-slate-500 mt-2 font-medium">
          Skip the line. Track your turn in real time.
        </p>

        {/* View Switcher: Simplified Standard Form vs Advanced Venue Browser */}
        <div className="flex items-center justify-center gap-2 mt-5">
          <button
            onClick={() => setViewMode('SIMPLE')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'SIMPLE'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Digital Token Portal
          </button>
          <button
            onClick={() => setViewMode('EXPLORE_ALL')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'EXPLORE_ALL'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Explore Hospital & Bank Venues
          </button>
        </div>
      </div>

      {/* Error Alert Banner */}
      {errorMessage && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-3 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={refreshTokens}
            className="px-3 py-1 bg-white hover:bg-rose-100 text-rose-700 font-bold rounded-lg border border-rose-200 flex items-center gap-1 shrink-0"
          >
            <RefreshCw className="w-3 h-3" />
            Retry
          </button>
        </div>
      )}

      {/* VIEW MODE 1: STANDARD SMARTQUEUE FORM & ACTIVE TICKET */}
      {viewMode === 'SIMPLE' && (
        <>
          {loading ? (
            <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center shadow-xs">
              <Clock className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-700">Connecting to queue server...</p>
            </div>
          ) : activeToken ? (
            /* ========================================================
               FEATURE 2 & 4: DIGITAL QUEUE TICKET (Active Token)
               ======================================================== */
            <div className="space-y-6">
              <div
                className={`bg-white rounded-3xl border shadow-xl p-8 sm:p-10 relative overflow-hidden transition-all duration-300 ${
                  activeToken.status === 'CALLED'
                    ? 'border-blue-500 ring-4 ring-blue-500/20 bg-gradient-to-b from-blue-50/50 to-white'
                    : activeToken.status === 'SERVING'
                    ? 'border-emerald-500 ring-4 ring-emerald-500/20 bg-gradient-to-b from-emerald-50/40 to-white'
                    : 'border-slate-200'
                }`}
              >
                {/* Status Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 mb-6">
                  <div>
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-600 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5" />
                      {activeToken.organizationName || 'Metropolitan Central Hospital'}
                    </span>
                    <h2 className="text-xl font-black text-slate-900 mt-0.5">
                      {activeToken.serviceName || selectedService}
                    </h2>
                    <p className="text-xs text-slate-500 flex flex-wrap items-center gap-2 mt-1">
                      <span>Customer: <strong className="text-slate-700">{activeToken.customerName}</strong></span>
                      <span>&bull;</span>
                      <span className="flex items-center gap-1 text-slate-500">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {organizations.find((o) => o.id === activeToken.organizationId)?.address || 'Main Campus Facility'}
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSoundEnabled(!soundEnabled)}
                      className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
                      title={soundEnabled ? 'Mute chimes' : 'Enable audio chime'}
                    >
                      {soundEnabled ? <Volume2 className="w-4 h-4 text-blue-600" /> : <VolumeX className="w-4 h-4" />}
                    </button>

                    {/* STATUS BADGE */}
                    <div
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-extrabold tracking-wide uppercase ${
                        activeToken.status === 'WAITING'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : activeToken.status === 'CALLED'
                          ? 'bg-blue-600 text-white animate-pulse shadow-md shadow-blue-500/30'
                          : activeToken.status === 'SERVING'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-current" />
                      {activeToken.status}
                    </div>
                  </div>
                </div>

                {/* CALL ALERT BANNER */}
                {activeToken.status === 'CALLED' && (
                  <div className="mb-6 p-4 rounded-2xl bg-blue-600 text-white text-center font-bold text-sm flex items-center justify-center gap-2 animate-bounce shadow-lg shadow-blue-600/30">
                    <BellRing className="w-5 h-5" />
                    YOUR TURN! PLEASE PROCEED TO {activeToken.counterNumber ? activeToken.counterNumber.toUpperCase() : 'COUNTER 1'}
                  </div>
                )}

                {/* TICKET CENTER: YOU ARE IN QUEUE + TOKEN NUMBER */}
                <div className="text-center py-4">
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    YOU ARE IN QUEUE
                  </span>
                  <div className="text-7xl sm:text-8xl font-black text-slate-900 tracking-tight font-mono my-2 text-blue-600">
                    {activeToken.tokenNumber}
                  </div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Queue Token
                  </span>
                </div>

                {/* 4 CORE METRICS: POSITION, PEOPLE AHEAD, ESTIMATED WAIT, NOW SERVING */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-8">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                    <div className="text-xs text-slate-500 font-semibold mb-1">Queue Position</div>
                    <div className="text-2xl sm:text-3xl font-black text-slate-900">
                      {activeToken.status === 'SERVING'
                        ? '#1'
                        : activeToken.status === 'CALLED'
                        ? '#1'
                        : `#${activeToken.positionInQueue || peopleAhead + 1}`}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">Your line position</div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                    <div className="text-xs text-slate-500 font-semibold mb-1">People Ahead</div>
                    <div className="text-2xl sm:text-3xl font-black text-slate-900">
                      {activeToken.status === 'SERVING' ? '0 (Serving)' : activeToken.status === 'CALLED' ? '0 (Called)' : `${peopleAhead} in line`}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">Waiting before you</div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                    <div className="text-xs text-slate-500 font-semibold mb-1">Estimated Wait</div>
                    <div className="text-2xl sm:text-3xl font-black text-blue-600">
                      {activeToken.status === 'SERVING'
                        ? 'In Progress'
                        : activeToken.status === 'CALLED'
                        ? 'Immediate'
                        : estimatedWait > 0
                        ? `${estimatedWait} min`
                        : '< 1 min'}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      {peopleAhead > 0 ? `${peopleAhead} × 8 min avg` : 'Turn approaching'}
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                    <div className="text-xs text-slate-500 font-semibold mb-1">Now Serving</div>
                    <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
                      {nowServingToken}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      {activeToken.counterNumber || 'Counter 1'}
                    </div>
                  </div>
                </div>

                {/* FEATURE 4: PROFESSIONAL STATUS MESSAGE BOX */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center text-xs font-medium text-slate-600 mb-8">
                  {activeToken.status === 'WAITING' && (
                    <span className="flex items-center justify-center gap-1.5">
                      <Clock className="w-4 h-4 text-amber-500" />
                      You are in the queue. <strong>{peopleAhead} {peopleAhead === 1 ? 'person is' : 'people are'} ahead of you</strong>.
                    </span>
                  )}
                  {activeToken.status === 'CALLED' && (
                    <span className="flex items-center justify-center gap-1.5 text-blue-700 font-bold">
                      <BellRing className="w-4 h-4 text-blue-600" />
                      Your turn! Please proceed to {activeToken.counterNumber || 'Counter 1'}.
                    </span>
                  )}
                  {activeToken.status === 'SERVING' && (
                    <span className="flex items-center justify-center gap-1.5 text-emerald-700 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      You are currently being served at {activeToken.counterNumber || 'Counter 1'}.
                    </span>
                  )}
                  {activeToken.status === 'COMPLETED' && (
                    <span className="flex items-center justify-center gap-1.5 text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Thank you for using SmartQueue. Your service is complete.
                    </span>
                  )}
                  {activeToken.status === 'SKIPPED' && (
                    <span className="flex items-center justify-center gap-1.5 text-rose-700 font-bold">
                      <AlertCircle className="w-4 h-4 text-rose-600" />
                      Your token was skipped. Please contact the service counter.
                    </span>
                  )}
                </div>

                {/* PROGRESS INDICATOR */}
                <div className="mb-8">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    <span>Progress Indicator</span>
                    <span>Real-time queue chain</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-900 text-white flex flex-wrap items-center justify-between gap-2 overflow-x-auto">
                    {sequencePath.map((item, idx) => {
                      const isNow = idx === 0;
                      const isYou = item === activeToken.tokenNumber;

                      return (
                        <React.Fragment key={item}>
                          <div className="flex flex-col items-center">
                            <span
                              className={`px-3 py-1.5 rounded-xl font-mono text-xs font-black ${
                                isYou
                                  ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                                  : isNow
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : 'bg-slate-800 text-slate-300'
                              }`}
                            >
                              {item}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase">
                              {isNow ? 'NOW' : isYou ? 'YOU' : `#${idx + 1}`}
                            </span>
                          </div>
                          {idx < sequencePath.length - 1 && (
                            <ArrowRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>

                {/* ACTIONS */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-100">
                  <div className="text-xs text-slate-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Auto-updating live queue via SSE &amp; Cloud Polling
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button
                      onClick={refreshTokens}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center justify-center gap-1.5 flex-1 sm:flex-none"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Refresh
                    </button>

                    <button
                      onClick={handleLeaveQueue}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors flex items-center justify-center gap-1.5 flex-1 sm:flex-none"
                    >
                      Leave Queue
                    </button>
                  </div>
                </div>
              </div>

              {/* Take Another Token Option */}
              <div className="text-center">
                <button
                  onClick={() => {
                    localStorage.removeItem('smartqueue_active_token_id');
                    setActiveToken(null);
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold underline"
                >
                  Need another token or service? Click here to fill the form again
                </button>
              </div>
            </div>
          ) : (
            /* ========================================================
               FEATURE 1: CUSTOMER LANDING FORM (Join Queue)
               ======================================================== */
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-8 sm:p-10">
              <form onSubmit={handleJoinQueue} className="space-y-5">
                {/* 1. SELECT HOSPITAL / ORGANIZATION */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-blue-600" />
                      Hospital / Facility
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">Select venue</span>
                  </label>
                  <div className="relative">
                    <select
                      value={selectedOrgId}
                      onChange={(e) => handleOrgChange(e.target.value)}
                      className="w-full appearance-none px-4 py-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 transition-all cursor-pointer"
                    >
                      {organizations.map((org) => (
                        <option key={org.id} value={org.id}>
                          {org.name} ({org.type})
                        </option>
                      ))}
                      {organizations.length === 0 && (
                        <option value="">Metropolitan Central Hospital (HOSPITAL)</option>
                      )}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* 2. FACILITY LOCATION DISPLAY */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5 text-xs text-slate-600">
                  <MapPin className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-800">Facility Location: </span>
                    <span>
                      {organizations.find((o) => o.id === selectedOrgId)?.address ||
                        '742 Evergreen Healthcare Blvd, Medical District'}
                    </span>
                  </div>
                </div>

                {/* 3. SELECT DEPARTMENT / SERVICE */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Department / Service
                  </label>
                  <div className="relative">
                    <select
                      value={selectedService}
                      onChange={(e) => setSelectedService(e.target.value)}
                      className="w-full appearance-none px-4 py-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 transition-all cursor-pointer"
                    >
                      {services
                        .filter((s) => !selectedOrgId || s.organizationId === selectedOrgId)
                        .map((srv) => (
                          <option key={srv.id} value={srv.id}>
                            {srv.name} (~{srv.averageServiceTime || 8} min avg wait)
                          </option>
                        ))}
                      {services.filter((s) => !selectedOrgId || s.organizationId === selectedOrgId).length === 0 && (
                        <>
                          <option value="General Consultation">General Consultation (~8 min avg)</option>
                          <option value="Cardiology Specialist">Cardiology Specialist (~15 min avg)</option>
                          <option value="Pharmacy & Dispensing">Pharmacy & Dispensing (~5 min avg)</option>
                        </>
                      )}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  <p className="text-xs text-slate-400 mt-1.5">
                    Select your service department to get assigned to the optimal queue counter.
                  </p>
                </div>

                {/* 4. FULL NAME */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter your full name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 transition-all placeholder:text-slate-400"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold text-base shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 group cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Clock className="w-5 h-5 animate-spin" />
                      Generating Your Token...
                    </>
                  ) : (
                    <>
                      Join Queue
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>

              {/* BENEFITS LIST */}
              <div className="mt-8 pt-8 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                  Live Queue Status
                </div>

                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                  Estimated Waiting Time
                </div>

                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                  Digital Queue Number
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* VIEW MODE 2: MULTI-VENUE QUEUES BROWSER (Preserves existing multi-venue feature) */}
      {viewMode === 'EXPLORE_ALL' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-md space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Hospital & Banking Queues</h2>
              <p className="text-xs text-slate-500">Take tokens for specialized departments across our network</p>
            </div>
            <button
              onClick={() => setViewMode('SIMPLE')}
              className="text-xs font-bold text-blue-600 hover:underline"
            >
              Back to Main Form
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {organizations.map((org) => (
              <div
                key={org.id}
                onClick={() => setSelectedOrgId(org.id)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  selectedOrgId === org.id
                    ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  {org.type.replace('_', ' ')}
                </span>
                <h4 className="font-bold text-sm text-slate-900 mt-2">{org.name}</h4>
                <p className="text-xs text-slate-500 mt-1 line-clamp-1">{org.address}</p>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Available Services</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {services
                .filter((s) => !selectedOrgId || s.organizationId === selectedOrgId)
                .map((srv) => (
                  <div
                    key={srv.id}
                    onClick={() => {
                      setSelectedService(srv.name);
                      setViewMode('SIMPLE');
                    }}
                    className="p-4 rounded-2xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/40 cursor-pointer transition-all flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-blue-600 text-white">
                          Prefix {srv.codePrefix}
                        </span>
                        <h4 className="font-bold text-xs text-slate-900">{srv.name}</h4>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">~{srv.averageServiceTime} min avg wait</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-blue-600" />
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
         FEATURE 16: HOW SMARTQUEUE WORKS (4-Step Guide)
         ======================================================== */}
      <div className="mt-16 pt-12 border-t border-slate-200">
        <div className="text-center mb-10">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
            Simple 4-Step Process
          </span>
          <h2 className="text-2xl font-extrabold text-slate-900 mt-1">
            How SmartQueue Works
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Experience frictionless queues from your smartphone or kiosk
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Step 1 */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="text-3xl font-black text-blue-600/30 mb-2 font-mono">01</div>
              <h3 className="font-bold text-sm text-slate-900 mb-1">Join Queue</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Enter your name and select the service you require from the dropdown.
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 text-[11px] font-semibold text-blue-600">
              Instant generation
            </div>
          </div>

          {/* Step 2 */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="text-3xl font-black text-blue-600/30 mb-2 font-mono">02</div>
              <h3 className="font-bold text-sm text-slate-900 mb-1">Get Your Token</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Receive your digital queue number (e.g. Q32) instantly on your screen.
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 text-[11px] font-semibold text-blue-600">
              No paper waste
            </div>
          </div>

          {/* Step 3 */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="text-3xl font-black text-blue-600/30 mb-2 font-mono">03</div>
              <h3 className="font-bold text-sm text-slate-900 mb-1">Track Your Position</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Monitor real-time people ahead and dynamic waiting time updates.
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 text-[11px] font-semibold text-blue-600">
              Auto-updating SSE
            </div>
          </div>

          {/* Step 4 */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="text-3xl font-black text-blue-600/30 mb-2 font-mono">04</div>
              <h3 className="font-bold text-sm text-slate-900 mb-1">Get Served</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Receive an alert when called, and proceed comfortably to Counter 1.
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 text-[11px] font-semibold text-blue-600">
              Chime &amp; banner alert
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
