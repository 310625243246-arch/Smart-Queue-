import React from 'react';
import { useQueue } from '../context/QueueContext';
import { BellRing, X, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export const NotificationModal: React.FC = () => {
  const { activeAlert, dismissAlert } = useQueue();

  if (!activeAlert) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md w-full animate-bounce sm:animate-none">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl shadow-2xl p-5 border border-blue-400/30 flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0 backdrop-blur">
          <BellRing className="w-6 h-6 text-white animate-pulse" />
        </div>

        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-200">
              Counter Calling Alert
            </span>
            <button
              onClick={dismissAlert}
              className="text-white/70 hover:text-white p-1 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <h3 className="font-extrabold text-base text-white mt-1">
            {activeAlert.title}
          </h3>
          <p className="text-sm text-blue-100 mt-1 leading-snug">
            {activeAlert.message}
          </p>

          <div className="mt-4 flex items-center gap-3">
            <Link
              to="/customer"
              onClick={dismissAlert}
              className="px-3.5 py-1.5 bg-white text-blue-700 text-xs font-bold rounded-lg shadow-sm hover:bg-blue-50 transition-colors flex items-center gap-1.5"
            >
              View Live Token
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <button
              onClick={dismissAlert}
              className="text-xs font-semibold text-white/80 hover:text-white"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
