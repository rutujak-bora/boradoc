
// In development, we use the local backend URL.
// In production (when served from the same domain), we use a relative path.
// This allows the app to work seamlessly when deployed.
// export const API_BASE_URL = import.meta.env.VITE_API_DIR || (import.meta.env.DEV ? 'http://localhost:5000/api' : '/api');
export const API_BASE_URL = import.meta.env.VITE_API_DIR || (import.meta.env.DEV ? 'http://174.129.157.255:5000/api' : '/api');
