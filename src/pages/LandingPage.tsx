import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  Clock, 
  Building2, 
  ShieldCheck, 
  ArrowRight, 
  Activity, 
  HeartPulse, 
  Landmark, 
  Sparkles, 
  CheckCircle2, 
  BellRing,
  Smartphone,
  BarChart3,
  Search
} from 'lucide-react';
import { request } from '../services/api';

export const LandingPage: React.FC = () => {
  const [queues, setQueues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadQueues() {
      try {
        const data = await request<{ queues: any[] }>('/queues');
        setQueues(data.queues || []);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    loadQueues();
  }, []);

  return (
    <div className="space-y-16 py-8">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-8 pb-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          Next-Generation Digital Queue Management
        </div>

        <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight max-w-4xl mx-auto leading-tight sm:leading-none">
          Eliminate Physical Waiting Lines with <span className="text-blue-600">SmartQueue</span>
        </h1>

        <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto mt-6 leading-relaxed">
          Take digital tokens on your phone, track queue positions in real-time, get notified when your turn approaches, and arrive directly at your assigned service counter.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
          <Link
            to="/customer"
            className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-extrabold rounded-2xl shadow-lg shadow-blue-600/25 transition-all flex items-center gap-2"
          >
            <Users className="w-4 h-4" />
            Join a Queue (Get Token)
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            to="/status"
            className="px-6 py-3.5 bg-white hover:bg-slate-50 text-slate-800 text-sm font-bold rounded-2xl border border-slate-200 shadow-xs transition-all flex items-center gap-2"
          >
            <Search className="w-4 h-4 text-slate-400" />
            Track Token Status
          </Link>
        </div>
      </section>

      {/* Live Venue Queues Snapshot */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Queue Board
            </h2>
            <p className="text-xs text-slate-500">Real-time status across participating healthcare, banking, and public venues</p>
          </div>
          <Link to="/customer" className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1">
            View All Venues <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {queues.slice(0, 3).map((q) => (
            <div key={q.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-md flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-700 font-extrabold text-xs">
                    Code {q.codePrefix}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    {q.organizationType?.replace('_', ' ')}
                  </span>
                </div>
                <h3 className="font-extrabold text-base text-slate-900">{q.serviceName}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{q.organizationName}</p>
              </div>

              <div className="my-6 grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                <div>
                  <div className="text-[10px] text-slate-400 font-semibold mb-0.5">Now Serving</div>
                  <div className="text-2xl font-black text-blue-600">{q.currentToken}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-semibold mb-0.5">Waiting Line</div>
                  <div className="text-2xl font-black text-slate-800">{q.waitingCount}</div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                <span className="text-slate-500">Est. Wait: <strong>~{q.estimatedWaitTime} min</strong></span>
                <Link
                  to="/customer"
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition-colors"
                >
                  Join Queue
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Feature Pillars */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 border-t border-slate-200">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Engineered for High-Traffic Service Environments
          </h2>
          <p className="text-sm text-slate-500 mt-2">
            Built with atomic concurrency locking, instant Server-Sent Events, and automated wait-time prediction.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
              <HeartPulse className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">Hospitals & Clinics</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Triage general consultations, cardiology, laboratories, and pharmacies without crowded waiting rooms.
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <Landmark className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">Banks & Financial Branches</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Organize tellers, loan desks, and new account openings with accurate SLA wait estimations and counter routing.
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
              <Building2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">Government & Citizen Centers</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Streamline document verification, licensing, and citizen inquiries with multi-counter distribution.
            </p>
          </div>
        </div>
      </section>

      {/* Role Navigation Cards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="bg-slate-900 text-white rounded-3xl p-8 sm:p-12 shadow-2xl relative overflow-hidden">
          <div className="relative z-10 max-w-2xl">
            <span className="text-xs font-extrabold uppercase tracking-widest text-blue-400">
              Role-Based Access
            </span>
            <h2 className="text-2xl sm:text-4xl font-black mt-2 mb-4">
              Dedicated Interfaces for Everyone
            </h2>
            <p className="text-sm text-slate-300 mb-8 leading-relaxed">
              Explore the dedicated staff counter desk with 1-click calling and service timers, or enter the admin portal for full analytics and organization management.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link
                to="/staff"
                className="px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold rounded-xl shadow-md transition-colors flex items-center gap-2"
              >
                <Activity className="w-4 h-4" />
                Staff Counter Console
              </Link>
              <Link
                to="/admin"
                className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-white text-xs font-extrabold rounded-xl border border-slate-700 transition-colors flex items-center gap-2"
              >
                <BarChart3 className="w-4 h-4" />
                Admin Dashboard & Analytics
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
