const API_BASE = '/api';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('smartqueue_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  if (!response.ok) {
    let errorMsg = `Request failed: ${response.statusText || response.status}`;
    if (isJson) {
      try {
        const errorData = await response.json();
        if (errorData && errorData.message) {
          errorMsg = errorData.message;
        }
      } catch {
        // ignore json parse error
      }
    } else {
      try {
        const text = await response.text();
        if (text && !text.trim().startsWith('<')) {
          errorMsg = text.slice(0, 100);
        }
      } catch {
        // ignore text read error
      }
    }
    throw new ApiError(response.status, errorMsg);
  }

  if (!isJson) {
    const text = await response.text();
    if (text.trim().startsWith('<')) {
      throw new ApiError(
        response.status,
        `Unexpected HTML response from endpoint ${endpoint}`
      );
    }
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new ApiError(response.status, `Invalid JSON response: ${text.slice(0, 60)}`);
    }
  }

  return response.json() as Promise<T>;
}
