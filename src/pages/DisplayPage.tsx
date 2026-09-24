import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Monitor, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  Minimize2, 
  Radio, 
  Clock, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  RotateCcw, 
  ArrowLeft, 
  Building2,
  Layers,
  ChevronDown
} from 'lucide-react';
import { request } from '../services/api';
import { connectSSE } from '../services/sse';
import { QueueToken } from '../types';

interface DisplayData {
  facility?: {
    id: string;
    name: string;
    type: string;
    address: string;
  } | null;
  service?: {
    id: string;
    name: string;
    codePrefix: string;
    averageServiceTime: number;
  } | null;
  nowServing: {
    tokenNumber: string;
    counterNumber: string;
    customerName?: string;
    serviceName?: string;
  } | null;
  nextQueue: string[];
  waitingTokens: QueueToken[];
  totalWaiting: number;
  lastUpdated: string;
  availableFacilities?: {
    id: string;
    name: string;
    type: string;
    services: {
      id: string;
      name: string;
      codePrefix: string;
      waitingCount: number;
      nowServing: string;
    }[];
  }[];
}

export const DisplayPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const urlFacilityId = searchParams.get('facilityId') || '';
  const urlServiceId = searchParams.get('serviceId') || '';

  const [selectedFacilityId, setSelectedFacilityId] = useState<string>(urlFacilityId);
  const [selectedServiceId, setSelectedServiceId] = useState<string>(urlServiceId);

  const [data, setData] = useState<DisplayData>({
    facility: null,
    service: null,
    nowServing: null,
    nextQueue: [],
    waitingTokens: [],
    totalWaiting: 0,
    lastUpdated: new Date().toISOString(),
    availableFacilities: [],
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastCalled, setLastCalled] = useState<string | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;

  // Clock tick
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Audio chime
  const playChime = () => {
    if (!soundEnabledRef.current) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.6);
    } catch {
      // Audio playback restricted by autoplay
    }
  };

  const fetchDisplayData = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedFacilityId) params.append('facilityId', selectedFacilityId);
      if (selectedServiceId) params.append('serviceId', selectedServiceId);

      const queryString = params.toString() ? `?${params.toString()}` : '';
      const res = await request<DisplayData>(`/display/queue${queryString}`);

      setError(null);
      setData((prev) => {
        if (res.nowServing?.tokenNumber && res.nowServing.tokenNumber !== prev.nowServing?.tokenNumber) {
          setIsFlashing(true);
          playChime();
          setLastCalled(res.nowServing.tokenNumber);
          setTimeout(() => setIsFlashing(false), 2500);
        }
        return res;
      });

      // Synchronize internal state with server resolved service
      if (!selectedServiceId && res.service?.id) {
        setSelectedServiceId(res.service.id);
      }
      if (!selectedFacilityId && res.facility?.id) {
        setSelectedFacilityId(res.facility.id);
      }
    } catch {
      setError('Unable to load live queue data.');
    } finally {
      setLoading(false);
    }
  };

  // Sync state when URL params change
  useEffect(() => {
    if (urlFacilityId && urlFacilityId !== selectedFacilityId) {
      setSelectedFacilityId(urlFacilityId);
    }
    if (urlServiceId && urlServiceId !== selectedServiceId) {
      setSelectedServiceId(urlServiceId);
    }
  }, [urlFacilityId, urlServiceId]);

  // Real-time SSE + polling fallback
  useEffect(() => {
    fetchDisplayData();
    const pollInterval = setInterval(fetchDisplayData, 3000);

    const sse = connectSSE();
    const unsub = sse.subscribe((event) => {
      if (event.type === 'QUEUE_ADVANCED' || event.type === 'COUNTERS_UPDATED') {
        fetchDisplayData();
      }
    });

    return () => {
      clearInterval(pollInterval);
      unsub();
    };
  }, [selectedFacilityId, selectedServiceId]);

  const handleFacilitySelect = (facilityId: string) => {
    setSelectedFacilityId(facilityId);
    const facility = data.availableFacilities?.find((f) => f.id === facilityId);
    const firstService = facility?.services[0];
    const newServiceId = firstService?.id || '';
    setSelectedServiceId(newServiceId);

    setSearchParams({
      facilityId,
      ...(newServiceId ? { serviceId: newServiceId } : {}),
    });
  };

  const handleServiceSelect = (serviceId: string) => {
    setSelectedServiceId(serviceId);
    setSearchParams({
      ...(selectedFacilityId ? { facilityId: selectedFacilityId } : {}),
      serviceId,
    });
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Active facility & services list
  const currentFacility = data.availableFacilities?.find((f) => f.id === selectedFacilityId) || data.availableFacilities?.[0];
  const activeServices = currentFacility?.services || [];

  if (error && !data.nowServing && data.nextQueue.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center font-sans p-6 text-center select-none">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-white mb-2">Unable to load live queue data.</h2>
        <p className="text-sm text-slate-400 max-w-md mb-6">
          Could not connect to the queue server. Please check your network connection or try again.
        </p>
        <button
          onClick={() => {
            setLoading(true);
            fetchDisplayData();
          }}
          className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-colors flex items-center gap-2 cursor-pointer shadow-lg shadow-blue-600/30"
        >
          <RotateCcw className="w-4 h-4" />
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans select-none antialiased">
      {error && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-2 text-center text-xs text-amber-400 font-semibold flex items-center justify-center gap-2">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Unable to refresh live queue data. Reconnecting...</span>
          <button onClick={fetchDisplayData} className="underline hover:text-white ml-2 cursor-pointer">Retry</button>
        </div>
      )}

      {/* Top TV Header Bar */}
      <header className="px-6 lg:px-10 py-4 border-b border-slate-800 bg-slate-900/95 backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center font-black text-2xl text-white shadow-lg shadow-blue-500/30">
            {data.service?.codePrefix || 'Q'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-wider text-white uppercase flex items-center gap-2.5">
                {data.facility?.name || 'SMARTQUEUE FACILITY'}
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-400 border border-blue-500/30 uppercase tracking-widest">
                DEDICATED DISPLAY
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium tracking-wide flex items-center gap-1.5 mt-0.5">
              <Building2 className="w-3.5 h-3.5 text-blue-400" />
              <span>{data.facility?.address || 'Main Campus Facility'}</span>
            </p>
          </div>
        </div>

        {/* Right Header Controls */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="hidden sm:flex items-center gap-2 text-slate-300 font-mono text-xs bg-slate-800/90 px-3.5 py-2 rounded-xl border border-slate-700">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          </div>

          {/* Exit Display Navigation to /admin */}
          <button
            onClick={() => navigate('/admin')}
            title="Exit Display and return to Admin Dashboard"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white transition-all text-xs font-semibold shadow-xs cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-400 group-hover:text-white shrink-0" />
            <span>Exit Display</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Mute announcement chime' : 'Enable announcement chime'}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                soundEnabled
                  ? 'bg-blue-600/30 border-blue-500 text-blue-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button
              onClick={toggleFullscreen}
              title="Toggle Fullscreen"
              className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* SERVICE SELECTION BAR: Allows switching which service queue this screen displays */}
      <div className="bg-slate-900 border-b border-slate-800/80 px-6 lg:px-10 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            Service Queue:
          </span>

          {/* Facility Selector */}
          {data.availableFacilities && data.availableFacilities.length > 1 && (
            <div className="relative">
              <select
                value={selectedFacilityId}
                onChange={(e) => handleFacilitySelect(e.target.value)}
                className="appearance-none bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold py-1.5 pl-3 pr-8 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                {data.availableFacilities.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}

          {/* Service Buttons: Direct 1-click switcher */}
          <div className="flex items-center gap-2 overflow-x-auto py-0.5">
            {activeServices.map((srv) => {
              const isCurrent = srv.id === selectedServiceId || srv.id === data.service?.id;
              return (
                <button
                  key={srv.id}
                  onClick={() => handleServiceSelect(srv.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    isCurrent
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-1 ring-blue-400'
                      : 'bg-slate-800/90 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700'
                  }`}
                >
                  <span className="w-5 h-5 rounded-md bg-black/20 flex items-center justify-center font-mono text-[10px]">
                    {srv.codePrefix}
                  </span>
                  <span>{srv.name}</span>
                  {srv.waitingCount > 0 && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${isCurrent ? 'bg-blue-800 text-white' : 'bg-slate-700 text-slate-300'}`}>
                      {srv.waitingCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Currently Configured Service Banner */}
        <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
          <span>Active Service:</span>
          <span className="text-white font-bold bg-blue-500/20 text-blue-300 px-2.5 py-1 rounded-md border border-blue-500/30">
            {data.service?.name ? data.service.name.toUpperCase() : 'ALL SERVICES'}
          </span>
        </div>
      </div>

      {/* Main TV Screen Content */}
      <main className="flex-1 p-6 lg:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch max-w-7xl mx-auto w-full">
        {/* Left Column: Huge NOW SERVING Card */}
        <section className="lg:col-span-7 flex flex-col justify-center">
          <div
            className={`rounded-3xl border transition-all duration-500 p-8 lg:p-12 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-2xl ${
              isFlashing
                ? 'bg-gradient-to-b from-blue-900/70 to-slate-900 border-blue-400 ring-8 ring-blue-500/30'
                : 'bg-slate-900/90 border-slate-800'
            }`}
          >
            {/* Ambient Background Glow */}
            <div className="absolute -top-24 -left-24 w-72 h-72 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-400 font-extrabold tracking-widest text-xs uppercase mb-4">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
              NOW SERVING &bull; {data.service?.name ? data.service.name.toUpperCase() : 'SERVICE'}
            </div>

            {loading ? (
              <div className="py-16 text-slate-500 flex flex-col items-center gap-3">
                <Clock className="w-10 h-10 animate-spin text-blue-500" />
                <span className="text-sm font-medium">Synchronizing {data.service?.name || 'queue'}...</span>
              </div>
            ) : data.nowServing ? (
              <>
                <div className="text-8xl sm:text-9xl lg:text-[11rem] font-black tracking-tight text-white leading-none my-2 drop-shadow-[0_10px_25px_rgba(59,130,246,0.45)] font-mono">
                  {data.nowServing.tokenNumber}
                </div>

                <div className="mt-6 px-8 py-3.5 rounded-2xl bg-blue-600 text-white font-extrabold text-2xl lg:text-3xl tracking-wider uppercase shadow-xl shadow-blue-600/30">
                  {data.nowServing.counterNumber || 'COUNTER 01'}
                </div>

                <div className="mt-6 text-slate-400 text-base font-medium flex items-center gap-3">
                  <span>Customer: <strong className="text-white">{data.nowServing.customerName || 'Customer'}</strong></span>
                  <span>&bull;</span>
                  <span>Department: <strong className="text-blue-300">{data.service?.name || data.nowServing.serviceName}</strong></span>
                </div>
              </>
            ) : (
              <div className="py-16 flex flex-col items-center">
                <div className="w-20 h-20 rounded-3xl bg-slate-800 flex items-center justify-center text-slate-500 mb-4">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                </div>
                <h3 className="text-3xl font-black text-white mb-2">Queue is Ready</h3>
                <p className="text-slate-400 text-sm max-w-sm">
                  {data.service?.name || 'This service'} counter is open. Waiting for the next customer to take a token.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Right Column: NEXT IN QUEUE Grid */}
        <section className="lg:col-span-5 flex flex-col justify-between">
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 lg:p-8 flex-1 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between pb-5 border-b border-slate-800 mb-6">
              <div>
                <h2 className="text-xl font-black text-white tracking-wide uppercase">
                  NEXT IN QUEUE
                </h2>
                <p className="text-xs text-slate-400">
                  {data.service?.name ? `${data.service.name} Waiting Line` : 'Please be ready when your number appears'}
                </p>
              </div>
              <span className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-400" />
                {data.totalWaiting} waiting
              </span>
            </div>

            {data.nextQueue.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-500">
                <Users className="w-12 h-12 text-slate-700 mb-3" />
                <p className="font-bold text-slate-400">No Customers Waiting</p>
                <p className="text-xs text-slate-500 mt-1">
                  The {data.service?.name || 'service'} queue is currently clear.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 flex-1 content-start">
                {data.nextQueue.map((tok, idx) => (
                  <div
                    key={tok}
                    className="p-5 rounded-2xl bg-slate-950 border border-slate-800/90 flex flex-col items-center justify-center text-center hover:border-slate-700 transition-all shadow-md"
                  >
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                      {idx === 0 ? 'NEXT' : `POSITION #${idx + 1}`}
                    </span>
                    <span className="text-4xl lg:text-5xl font-black text-blue-400 font-mono tracking-tight">
                      {tok}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Bottom Status Ticker */}
            <div className="pt-6 mt-6 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Service Feed &bull; {data.service?.name || 'Active'}
              </span>
              <span>Audio Chime: {soundEnabled ? 'On' : 'Muted'}</span>
            </div>
          </div>
        </section>
      </main>

      {/* Screen Footer Information */}
      <footer className="px-8 py-4 bg-slate-950 border-t border-slate-900 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>
          SmartQueue Dedicated Service Monitor &bull; {data.facility?.name || 'Facility'} &bull; {data.service?.name || 'Service'}
        </span>
        <span>
          Remote tracking on your mobile: <strong className="text-slate-300">smartqueue.app/customer</strong>
        </span>
      </footer>
    </div>
  );
};
