import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Users, Lock, Mail, ArrowRight, Shield, Activity, AlertCircle, ChevronRight, UserCheck } from 'lucide-react';
import { request } from '../services/api';

export const LoginPage: React.FC = () => {
  const { login, switchRole } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [roleLoading, setRoleLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data = await request<{ token: string; user: any }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      login(data.token, data.user);
      if (data.user.role === 'ADMIN') navigate('/admin');
      else if (data.user.role === 'STAFF') navigate('/staff');
      else navigate('/customer');
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleEntry = async (role: 'CUSTOMER' | 'STAFF' | 'ADMIN') => {
    setRoleLoading(role);
    setError(null);

    try {
      await switchRole(role);
      if (role === 'ADMIN') navigate('/admin');
      else if (role === 'STAFF') navigate('/staff');
      else navigate('/customer');
    } catch (err: any) {
      setError(err.message || `Unable to enter as ${role}`);
    } finally {
      setRoleLoading(null);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-xl w-full space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center mx-auto mb-4 shadow-md shadow-blue-500/20">
            <Users className="w-6 h-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">SmartQueue Portal</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Role-separated queue orchestration for customers, counter staff, and operations administrators
          </p>
        </div>

        {/* Clean Role-Based Entry Points */}
        <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-md">
          <div className="text-center mb-5">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
              Role-Based Access
            </span>
            <h2 className="text-base font-bold text-slate-800 mt-0.5">Select Role Entry</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Customer Entry */}
            <button
              type="button"
              onClick={() => handleRoleEntry('CUSTOMER')}
              disabled={roleLoading !== null}
              className="p-4 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-2xl text-left transition-all group flex flex-col justify-between cursor-pointer"
            >
              <div>
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <Users className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-extrabold text-slate-900 group-hover:text-blue-700">Customer</h3>
                <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                  Join queues, track waiting time &amp; digital pass
                </p>
              </div>
              <div className="mt-4 flex items-center justify-between text-[11px] font-bold text-blue-600 pt-2 border-t border-slate-200/60">
                <span>{roleLoading === 'CUSTOMER' ? 'Entering...' : 'Enter as Customer'}</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>

            {/* Staff Entry */}
            <button
              type="button"
              onClick={() => handleRoleEntry('STAFF')}
              disabled={roleLoading !== null}
              className="p-4 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-2xl text-left transition-all group flex flex-col justify-between cursor-pointer"
            >
              <div>
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <Activity className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-extrabold text-slate-900 group-hover:text-emerald-700">Staff</h3>
                <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                  Counter console, call next customer &amp; timers
                </p>
              </div>
              <div className="mt-4 flex items-center justify-between text-[11px] font-bold text-emerald-600 pt-2 border-t border-slate-200/60">
                <span>{roleLoading === 'STAFF' ? 'Entering...' : 'Enter as Staff'}</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>

            {/* Admin Entry */}
            <button
              type="button"
              onClick={() => handleRoleEntry('ADMIN')}
              disabled={roleLoading !== null}
              className="p-4 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-2xl text-left transition-all group flex flex-col justify-between cursor-pointer"
            >
              <div>
                <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <Shield className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-extrabold text-slate-900 group-hover:text-indigo-700">Admin</h3>
                <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                  Hospital settings, counters, audit history &amp; metrics
                </p>
              </div>
              <div className="mt-4 flex items-center justify-between text-[11px] font-bold text-indigo-600 pt-2 border-t border-slate-200/60">
                <span>{roleLoading === 'ADMIN' ? 'Entering...' : 'Enter as Admin'}</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>
          </div>
        </div>

        {/* Standard Credentials Sign In */}
        <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-md">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px bg-slate-200 flex-1" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Or Sign In with Credentials
            </span>
            <div className="h-px bg-slate-200 flex-1" />
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-800 text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  placeholder="name@organization.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer"
            >
              {loading ? 'Authenticating...' : 'Sign In with Email'}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          <div className="mt-5 text-center text-xs text-slate-500">
            Need a new account?{' '}
            <Link to="/register" className="text-blue-600 font-bold hover:underline">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
