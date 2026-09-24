import React from 'react';
import { Users, Monitor, Shield, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-200 bg-white py-10 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-lg shadow-sm shadow-blue-500/20">
              Q
            </div>
            <div>
              <div className="text-base font-extrabold text-slate-900 leading-tight">SmartQueue</div>
              <div className="text-xs text-slate-500 font-medium">Digital Queue Management System</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-semibold text-slate-600">
            <Link to="/customer" className="hover:text-blue-600 transition-colors">Customer Portal</Link>
            <Link to="/display" className="hover:text-blue-600 transition-colors flex items-center gap-1">
              <Monitor className="w-3.5 h-3.5 text-blue-500" />
              Live Display Board
            </Link>
            <Link to="/admin" className="hover:text-blue-600 transition-colors flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-indigo-500" />
              Admin Dashboard
            </Link>
            <Link to="/status" className="hover:text-blue-600 transition-colors">Check Token</Link>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-3">
          <div>
            Built with React • TypeScript • Node.js • Express
          </div>
          <div>
            &copy; {new Date().getFullYear()} SmartQueue. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
};
