const KEY = "cyberquest_token";
export const getToken = () => (typeof window === "undefined" ? null : localStorage.getItem(KEY));
export const setToken = (t: string) => localStorage.setItem(KEY, t);
export const clearToken = () => localStorage.removeItem(KEY);
