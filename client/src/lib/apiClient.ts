import axios from 'axios';

const apiClient = axios.create({ baseURL: '/api' });

export function setAuthToken(token: string) {
  apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

export function clearAuthToken() {
  delete apiClient.defaults.headers.common['Authorization'];
}

export default apiClient;
