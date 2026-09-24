import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQueue } from '../context/QueueContext';
import { 
  Users, 
  Clock, 
  LogIn, 
  LogOut, 
  UserPlus, 
  Shield, 
  Activity, 
  Building2, 
  Bell, 
  Check, 
  Sparkles,
  ExternalLink,
  ChevronDown,
  Monitor
} from 'lucide-react';
import { request } from '../services/api';

export const Navbar: React.FC = () => {
  const { user, logout, login, switchRole } = useAuth();
  const { notifications, unreadNotificationCount, markNotificationRead, clearAllNotifications } = useQueue();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showDemoMenu, setShowDemoMenu] = useState(false);
  const [switchLoading, setSwitchLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const notifRef = useRef<HTMLDivElement>(null);
  const demoRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (demoRef.current && !demoRef.current.contains(e.target as Node)) {
        setShowDemoMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleQuickSwitch = async (role: 'ADMIN' | 'STAFF' | 'CUSTOMER') => {
    setSwitchLoading(true);
    try {
      await switchRole(role);
      setShowDemoMenu(false);

      if (role === 'ADMIN') navigate('/admin');
      else if (role === 'STAFF') navigate('/staff');
      else navigate('/customer');
    } catch (err) {
      console.warn('Failed to switch role:', err);
    } finally {
      setSwitchLoading(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-3 shrink-0 group">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:bg-blue-700 transition-colors">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-extrabold text-slate-900 leading-tight">SmartQueue</div>
            <div className="text-[11px] text-slate-500 font-medium">Digital Queue Engine</div>
          </div>
        </Link>

        {/* Center Navigation Links */}
        <nav className="hidden md:flex items-center gap-6">
          <Link
            to="/customer"
            className={`text-sm font-medium transition-colors flex items-center gap-1.5 ${
              location.pathname === '/customer' ? 'text-blue-600 font-bold' : 'text-slate-600 hover:text-blue-600'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Customer
          </Link>

          <Link
            to="/display"
            className={`text-sm font-medium transition-colors flex items-center gap-1.5 ${
              location.pathname === '/display' ? 'text-blue-600 font-bold' : 'text-slate-600 hover:text-blue-600'
            }`}
          >
            <Monitor className="w-4 h-4 text-blue-500" />
            Display
          </Link>

          <Link
            to="/staff"
            className={`text-sm font-medium transition-colors flex items-center gap-1.5 ${
              location.pathname === '/staff' ? 'text-emerald-600 font-bold' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Activity className="w-4 h-4 text-emerald-600" />
            Staff
          </Link>

          <Link
            to="/admin"
            className={`text-sm font-medium transition-colors flex items-center gap-1.5 ${
              location.pathname === '/admin' ? 'text-indigo-600 font-bold' : 'text-slate-600 hover:text-indigo-600'
            }`}
          >
            <Shield className="w-4 h-4 text-indigo-600" />
            Admin
          </Link>
        </nav>

        {/* Right Section: Role Switcher + Notifications + Auth */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Professional Role View Switcher */}
          <div className="relative" ref={demoRef}>
            <button
              onClick={() => setShowDemoMenu(!showDemoMenu)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors border border-slate-200 cursor-pointer"
              title="Switch role view"
            >
              <span className="hidden sm:inline text-slate-400 font-normal">Role:</span>
              <span className="font-bold text-blue-600">{user?.role || 'Guest'}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showDemoMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-1">
                <div className="px-3.5 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Switch Active Role
                </div>

                <button
                  onClick={() => handleQuickSwitch('CUSTOMER')}
                  disabled={switchLoading}
                  className="w-full text-left px-3.5 py-2.5 text-xs hover:bg-slate-50 flex items-center justify-between text-slate-800 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Users className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">Customer</div>
                      <div className="text-[10px] text-slate-400">Join queue &amp; track pass</div>
                    </div>
                  </div>
                  {user?.role === 'CUSTOMER' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                </button>

                <button
                  onClick={() => handleQuickSwitch('STAFF')}
                  disabled={switchLoading}
                  className="w-full text-left px-3.5 py-2.5 text-xs hover:bg-slate-50 flex items-center justify-between text-slate-800 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <Activity className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">Staff</div>
                      <div className="text-[10px] text-slate-400">Counter desk operator</div>
                    </div>
                  </div>
                  {user?.role === 'STAFF' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                </button>

                <button
                  onClick={() => handleQuickSwitch('ADMIN')}
                  disabled={switchLoading}
                  className="w-full text-left px-3.5 py-2.5 text-xs hover:bg-slate-50 flex items-center justify-between text-slate-800 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <Shield className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">Admin</div>
                      <div className="text-[10px] text-slate-400">Operations &amp; analytics</div>
                    </div>
                  </div>
                  {user?.role === 'ADMIN' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                </button>
              </div>
            )}
          </div>

          {/* Notifications Dropdown */}
          {user && (
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadNotificationCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                    {unreadNotificationCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 py-3 z-50 animate-in fade-in slide-in-from-top-1">
                  <div className="px-4 pb-2 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">Notifications</h4>
                      <p className="text-[11px] text-slate-500">Live queue alerts and calls</p>
                    </div>
                    {notifications.length > 0 && (
                      <button
                        onClick={clearAllNotifications}
                        className="text-[11px] font-semibold text-blue-600 hover:underline"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400">
                        No notifications yet. You will be alerted here when your token is called.
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => markNotificationRead(notif.id)}
                          className={`p-3.5 text-xs transition-colors cursor-pointer hover:bg-slate-50 ${
                            !notif.isRead ? 'bg-blue-50/50 font-medium' : 'text-slate-600'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                              notif.type === 'CALLED' ? 'bg-blue-100 text-blue-800' :
                              notif.type === 'TURN_NEXT' ? 'bg-amber-100 text-amber-800' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {notif.type}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="font-semibold text-slate-900">{notif.title}</div>
                          <div className="text-slate-600 text-[11px] mt-0.5">{notif.message}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* User Account Controls */}
          {user ? (
            <div className="flex items-center gap-2">
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                id="btn-nav-logout"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                id="btn-nav-login"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                Login
              </Link>
              <Link
                to="/register"
                id="btn-nav-register"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
