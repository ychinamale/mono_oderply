import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    post:  { 'Content-Type': 'application/json' },
    put:   { 'Content-Type': 'application/json' },
    patch: { 'Content-Type': 'application/json' },
  },
});

export function setAuthToken(token: string) {
  apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

export function clearAuthToken() {
  delete apiClient.defaults.headers.common['Authorization'];
}

export default apiClient;
