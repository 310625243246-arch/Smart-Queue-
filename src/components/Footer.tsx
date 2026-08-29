import React from 'react';
import { Users, Shield, Activity, HeartPulse, Landmark, Building2, Github } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-200 bg-white mt-12 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-sm">
                <Users className="w-4 h-4" />
              </div>
              <span className="text-base font-extrabold text-slate-900">SmartQueue</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Full-Stack Digital Queue Management System for healthcare hospitals, banking institutions, and citizen service centers.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider mb-3">Service Sectors</h4>
            <ul className="space-y-2 text-xs text-slate-500">
              <li className="flex items-center gap-1.5"><HeartPulse className="w-3.5 h-3.5 text-rose-500" /> Hospital Clinics & Labs</li>
              <li className="flex items-center gap-1.5"><Landmark className="w-3.5 h-3.5 text-blue-500" /> Banks & Cash Counters</li>
              <li className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-emerald-500" /> Citizen Service Hubs</li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider mb-3">Quick Portals</h4>
            <ul className="space-y-2 text-xs text-slate-500">
              <li><Link to="/customer" className="hover:text-blue-600 transition-colors">Join Live Queue</Link></li>
              <li><Link to="/status" className="hover:text-blue-600 transition-colors">Track Token Status</Link></li>
              <li><Link to="/staff" className="hover:text-blue-600 transition-colors">Staff Counter Desk</Link></li>
              <li><Link to="/admin" className="hover:text-blue-600 transition-colors">Admin Dashboard</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider mb-3">Architecture Stack</h4>
            <div className="flex flex-wrap gap-1.5 text-[11px] text-slate-600">
              <span className="px-2 py-0.5 rounded bg-slate-100 font-semibold">PostgreSQL</span>
              <span className="px-2 py-0.5 rounded bg-slate-100 font-semibold">Redis Lock</span>
              <span className="px-2 py-0.5 rounded bg-slate-100 font-semibold">SSE Realtime</span>
              <span className="px-2 py-0.5 rounded bg-slate-100 font-semibold">Express REST</span>
              <span className="px-2 py-0.5 rounded bg-slate-100 font-semibold">React + Vite</span>
              <span className="px-2 py-0.5 rounded bg-slate-100 font-semibold">Docker</span>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
          <div>&copy; {new Date().getFullYear()} SmartQueue Digital Queue Management System. All rights reserved.</div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-emerald-600 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              All Systems Operational
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
