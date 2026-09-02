import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { sseManager } from '../services/sse';
import { useAuth } from './AuthContext';
import { AppNotification, QueueToken } from '../types';
import { request } from '../services/api';

interface QueueContextType {
  notifications: AppNotification[];
  unreadNotificationCount: number;
  activeTokens: QueueToken[];
  refreshTokens: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  activeAlert: { title: string; message: string; counterNumber?: string; tokenNumber?: string } | null;
  dismissAlert: () => void;
}

const QueueContext = createContext<QueueContextType | undefined>(undefined);

export const QueueProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [activeTokens, setActiveTokens] = useState<QueueToken[]>([]);
  const [activeAlert, setActiveAlert] = useState<{
    title: string;
    message: string;
    counterNumber?: string;
    tokenNumber?: string;
  } | null>(null);

  const refreshNotifications = useCallback(async () => {
    if (!token) {
      setNotifications([]);
      return;
    }
    try {
      const data = await request<{ notifications: AppNotification[] }>('/notifications');
      setNotifications(data.notifications || []);
    } catch {
      // ignore
    }
  }, [token]);

  const refreshTokens = useCallback(async () => {
    if (!token) {
      setActiveTokens([]);
      return;
    }
    try {
      const data = await request<{ activeTokens: QueueToken[] }>('/customer/tokens');
      setActiveTokens(data.activeTokens || []);
    } catch {
      // ignore
    }
  }, [token]);

  const markNotificationRead = async (id: string) => {
    try {
      await request(`/notifications/${id}/read`, { method: 'POST' });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (e) {
      console.warn(e);
    }
  };

  const clearAllNotifications = async () => {
    try {
      await request('/notifications/clear', { method: 'POST' });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (e) {
      console.warn(e);
    }
  };

  const dismissAlert = () => setActiveAlert(null);

  // Play audio chime when token is called
  const playChime = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch {
      // Audio context might be restricted
    }
  };

  useEffect(() => {
    sseManager.connect(token);

    const unsubAdv = sseManager.on('QUEUE_ADVANCED', (data) => {
      refreshTokens();
      refreshNotifications();
    });

    const unsubCalled = sseManager.on('TOKEN_CALLED', (data) => {
      playChime();
      setActiveAlert({
        title: `Your Token ${data.tokenNumber} is Called!`,
        message: `Please proceed immediately to ${data.counterNumber || 'Counter 1'}.`,
        counterNumber: data.counterNumber,
        tokenNumber: data.tokenNumber,
      });
      refreshTokens();
      refreshNotifications();
    });

    return () => {
      unsubAdv();
      unsubCalled();
      sseManager.disconnect();
    };
  }, [token, refreshTokens, refreshNotifications]);

  useEffect(() => {
    if (token) {
      refreshTokens();
      refreshNotifications();
    }
  }, [token, refreshTokens, refreshNotifications]);

  const unreadNotificationCount = notifications.filter((n) => !n.isRead).length;

  return (
    <QueueContext.Provider
      value={{
        notifications,
        unreadNotificationCount,
        activeTokens,
        refreshTokens,
        refreshNotifications,
        markNotificationRead,
        clearAllNotifications,
        activeAlert,
        dismissAlert,
      }}
    >
      {children}
    </QueueContext.Provider>
  );
};

export const useQueue = () => {
  const context = useContext(QueueContext);
  if (!context) {
    throw new Error('useQueue must be used within a QueueProvider');
  }
  return context;
};
