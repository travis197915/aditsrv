export const getToken = (): string | null => {
  return window.localStorage.getItem('token');
};

export const setToken = (token: string) => {
  window.localStorage.setItem('token', token);
};

export const clearToken = () => {
  window.localStorage.removeItem('token');
};

export const AUTH_USER_KEY = 'auth_user';

export const clearAuth = () => {
  clearToken();
  try {
    window.localStorage.removeItem(AUTH_USER_KEY);
  } catch {
    /* ignore */
  }
};
