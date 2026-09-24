import React, { useState, useEffect } from 'react';
import { Search, Clock, Users, Building2, CheckCircle2, AlertCircle, RefreshCw, BellRing, ArrowRight } from 'lucide-react';
import { request } from '../services/api';
import { QueueToken } from '../types';
import { Link, useSearchParams } from 'react-router-dom';
import { sseManager } from '../services/sse';

export const StatusCheckPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialToken = searchParams.get('token') || '';

  const [searchQuery, setSearchQuery] = useState(initialToken);
  const [tokenData, setTokenData] = useState<QueueToken | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLookup = async (queryToSearch?: string) => {
    const q = (queryToSearch || searchQuery).trim();
    if (!q) {
      setError('Please enter a valid token number or token ID.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await request<{ token: QueueToken }>(`/tokens/${encodeURIComponent(q)}`);
      setTokenData(data.token);
    } catch (err: any) {
      setError(err.message || `No active or recent record found for token "${q}".`);
      setTokenData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialToken) {
      handleLookup(initialToken);
    }
  }, [initialToken]);

  // Live SSE update when this token changes
  useEffect(() => {
    const unsub = sseManager.on('QUEUE_ADVANCED', () => {
      if (tokenData) {
        handleLookup(tokenData.tokenNumber);
      }
    });
    return () => unsub();
  }, [tokenData]);

  const isCalled = tokenData?.status === 'CALLED';
  const isServing = tokenData?.status === 'SERVING';
  const isCompleted = tokenData?.status === 'COMPLETED';

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <span className="px-3 py-1 text-xs font-extrabold rounded-full bg-blue-100 text-blue-800 uppercase tracking-wider">
          Live Token Lookup
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-2 mb-3">
          Check Your Real-Time Queue Status
        </h1>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          Enter your token number (e.g. <strong>A105</strong>, <strong>B101</strong>) to view your live position, estimated wait time, and counter assignment.
        </p>
      </div>

      {/* Search Input Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleLookup();
        }}
        className="bg-white p-2 rounded-2xl border border-slate-200 shadow-md flex items-center gap-2 mb-8"
      >
        <div className="pl-3 text-slate-400">
          <Search className="w-5 h-5" />
        </div>
        <input
          type="text"
          placeholder="Enter Token Number (e.g. A105, B101)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
          className="flex-1 py-3 px-2 text-sm font-bold text-slate-800 uppercase placeholder:normal-case placeholder:font-normal focus:outline-hidden"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
        >
          {loading ? 'Checking...' : 'Check Status'}
        </button>
      </form>

      {/* Quick sample token buttons */}
      <div className="flex items-center justify-center gap-2 text-xs text-slate-400 mb-8 flex-wrap">
        <span>Sample active tokens:</span>
        {['Q02', 'Q03', 'P02', 'P03', 'L02', 'B02'].map((sample) => (
          <button
            key={sample}
            type="button"
            onClick={() => {
              setSearchQuery(sample);
              handleLookup(sample);
            }}
            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors cursor-pointer"
          >
            {sample}
          </button>
        ))}
      </div>

      {/* Error View */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-3 text-rose-800 text-xs mb-8">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <div>{error}</div>
        </div>
      )}

      {/* Live Result Card */}
      {tokenData && (
        <div
          className={`bg-white rounded-3xl border shadow-xl p-6 sm:p-8 transition-all relative overflow-hidden ${
            isCalled
              ? 'border-blue-500 ring-2 ring-blue-500/20 bg-gradient-to-b from-blue-50/50 to-white'
              : isServing
              ? 'border-emerald-500 bg-gradient-to-b from-emerald-50/50 to-white'
              : 'border-slate-200'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-6 border-b border-slate-100 mb-6">
            <div>
              <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                {tokenData.organizationName}
              </div>
              <h2 className="text-xl font-black text-slate-900 leading-tight mt-0.5">
                {tokenData.serviceName}
              </h2>
              <div className="text-xs text-slate-500 mt-1">Customer: {tokenData.customerName}</div>
            </div>

            <div className="text-right">
              <span
                className={`px-3 py-1 text-xs font-black rounded-full uppercase border ${
                  isCalled
                    ? 'bg-blue-600 text-white border-blue-600 animate-pulse'
                    : isServing
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : isCompleted
                    ? 'bg-slate-100 text-slate-700 border-slate-300'
                    : 'bg-amber-100 text-amber-800 border-amber-300'
                }`}
              >
                {tokenData.status}
              </span>
              <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-end gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Live Stream
              </div>
            </div>
          </div>

          {/* Called Alert */}
          {isCalled && (
            <div className="mb-6 p-4 bg-blue-600 text-white rounded-2xl text-center font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 animate-bounce">
              <BellRing className="w-5 h-5" />
              PROCEED NOW TO {tokenData.counterNumber ? tokenData.counterNumber.toUpperCase() : 'YOUR COUNTER'}!
            </div>
          )}

          {/* Big Number Metrics */}
          <div className="grid grid-cols-3 gap-4 text-center mb-8">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="text-xs text-slate-400 font-semibold mb-1">Your Token</div>
              <div className="text-3xl sm:text-4xl font-black text-blue-600">{tokenData.tokenNumber}</div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="text-xs text-slate-400 font-semibold mb-1">Ahead in Queue</div>
              <div className="text-3xl sm:text-4xl font-black text-slate-900">
                {isServing ? '0' : isCalled ? '0' : tokenData.peopleAhead}
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="text-xs text-slate-400 font-semibold mb-1">Estimated Wait</div>
              <div className="text-3xl sm:text-4xl font-black text-slate-900">
                {isServing ? 'Now' : isCalled ? 'Now' : `~${tokenData.estimatedWaitMinutes}m`}
              </div>
            </div>
          </div>

          {/* Counter details */}
          <div className="bg-slate-50 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
            <div>
              Assigned Desk:{' '}
              <strong className="text-slate-900">
                {tokenData.counterNumber || 'Will be announced when called'}
              </strong>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => handleLookup(tokenData.tokenNumber)}
                className="text-blue-600 hover:underline font-bold flex items-center gap-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
