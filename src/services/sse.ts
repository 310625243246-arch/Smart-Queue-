type EventHandler = (data: any) => void;

class SSEClientManager {
  private eventSource: EventSource | null = null;
  private listeners: Map<string, Set<EventHandler>> = new Map();
  private isConnecting: boolean = false;

  public connect(token?: string | null) {
    if (this.eventSource) {
      this.eventSource.close();
    }

    const url = token 
      ? `/api/realtime/events?token=${encodeURIComponent(token)}`
      : '/api/realtime/events';

    try {
      this.eventSource = new EventSource(url);

      this.eventSource.addEventListener('connected', (event) => {
        this.emit('connected', JSON.parse(event.data));
      });

      this.eventSource.addEventListener('QUEUE_ADVANCED', (event) => {
        this.emit('QUEUE_ADVANCED', JSON.parse(event.data));
      });

      this.eventSource.addEventListener('TOKEN_CALLED', (event) => {
        this.emit('TOKEN_CALLED', JSON.parse(event.data));
      });

      this.eventSource.addEventListener('ORGANIZATIONS_UPDATED', (event) => {
        this.emit('ORGANIZATIONS_UPDATED', JSON.parse(event.data));
      });

      this.eventSource.addEventListener('SERVICES_UPDATED', (event) => {
        this.emit('SERVICES_UPDATED', JSON.parse(event.data));
      });

      this.eventSource.addEventListener('COUNTERS_UPDATED', (event) => {
        this.emit('COUNTERS_UPDATED', JSON.parse(event.data));
      });

      this.eventSource.onerror = (err) => {
        // SSE reconnects automatically
      };
    } catch (e) {
      console.warn('SSE connection failed:', e);
    }
  }

  public on(event: string, handler: EventHandler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);

    return () => {
      this.listeners.get(event)?.delete(handler);
    };
  }

  public emit(event: string, data: any) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach((fn) => fn(data));
    }
  }

  public disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }
}

export const sseManager = new SSEClientManager();
