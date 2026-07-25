// Shree ERP - API Client wrapper

const BASE_URL = window.location.origin.startsWith('file') || !window.location.origin.includes('5000') 
  ? 'http://localhost:5000' 
  : window.location.origin;

const apiClient = {
  getHeaders: () => {
    const headers = {
      'Content-Type': 'application/json'
    };
    const token = localStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  },

  get: async (endpoint) => {
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'GET',
        headers: apiClient.getHeaders()
      });
      return await apiClient.handleResponse(response);
    } catch (err) {
      console.error(`API_GET_ERROR [${endpoint}]:`, err);
      throw err;
    }
  },

  post: async (endpoint, data) => {
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: apiClient.getHeaders(),
        body: JSON.stringify(data)
      });
      return await apiClient.handleResponse(response);
    } catch (err) {
      console.error(`API_POST_ERROR [${endpoint}]:`, err);
      throw err;
    }
  },

  put: async (endpoint, data) => {
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'PUT',
        headers: apiClient.getHeaders(),
        body: JSON.stringify(data)
      });
      return await apiClient.handleResponse(response);
    } catch (err) {
      console.error(`API_PUT_ERROR [${endpoint}]:`, err);
      throw err;
    }
  },

  // File Upload Helper (excludes JSON Content-Type to allow browser boundary setting)
  upload: async (endpoint, formData) => {
    try {
      const headers = {};
      const token = localStorage.getItem('token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'POST',
        headers,
        body: formData
      });
      return await apiClient.handleResponse(response);
    } catch (err) {
      console.error(`API_UPLOAD_ERROR [${endpoint}]:`, err);
      throw err;
    }
  },

  handleResponse: async (response) => {
    if (!response.ok) {
      // If token expired or invalid, log out user
      if (response.status === 401 || response.status === 403) {
        if (localStorage.getItem('token')) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.reload();
        }
      }
      const errPayload = await response.json().catch(() => ({}));
      const errorMsg = errPayload.error || `HTTP Error ${response.status}: ${response.statusText}`;
      throw new Error(errorMsg);
    }
    return await response.json();
  }
};
