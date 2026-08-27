const API_BASE = '/api';

export async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('sm_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const defaultMsg = response.status === 500 
      ? 'Server encountered an error. Please try again or sign in with Google.' 
      : response.status === 401 
        ? 'Invalid email or password. Please verify your credentials.'
        : `Request failed with status ${response.status}`;
    throw new Error(data.message || data.error || defaultMsg);
  }

  return data;
}
