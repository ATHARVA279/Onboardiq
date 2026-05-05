import axios from "axios";
import { auth } from "./firebaseConfig";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:8000",
});

api.interceptors.request.use(async (config) => {
  let user = auth.currentUser;
  
  if (!user) {
    await new Promise(resolve => {
      const unsubscribe = auth.onAuthStateChanged(u => {
        user = u;
        unsubscribe();
        resolve();
      });
    });
  }

  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
