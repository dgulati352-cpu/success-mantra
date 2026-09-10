const API_BASE = '/api';

export async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('sm_token');
  const headers = {
    ...(options.headers || {})
  };

  let body = options.body;
  if (body !== undefined && body !== null) {
    if (typeof body === 'object' && !(body instanceof FormData) && !(body instanceof Blob)) {
      body = JSON.stringify(body);
      if (!headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }
    }
  }

  const method = (options.method || 'GET').toUpperCase();
  if (['POST', 'PUT', 'PATCH'].includes(method) && body && !(body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const fetchOptions = {
    ...options,
    headers
  };

  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && body !== undefined && body !== null) {
    fetchOptions.body = body;
  } else {
    delete fetchOptions.body;
  }

  const url = endpoint.startsWith('http') 
    ? endpoint 
    : endpoint.startsWith('/api') 
      ? endpoint 
      : `${API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const response = await fetch(url, fetchOptions);

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const defaultMsg = response.status === 413
      ? 'File attachment exceeds serverless payload size. Please upload via Cloudflare R2 direct upload.'
      : response.status === 500 
        ? 'Server encountered an error. Please try again or sign in with Google.' 
        : response.status === 401 
          ? 'Invalid email or password. Please verify your credentials.'
          : `Request failed with status ${response.status}`;
    throw new Error(data.message || data.error || defaultMsg);
  }

  return data;
}
