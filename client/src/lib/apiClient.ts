import axios from 'axios';

export function createApiClient(token: string | null) {
  return axios.create({
    baseURL: '/api',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}
