import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../api/firebaseConfig";
import {
  getUserWorkspaces,
  getStoredActiveWorkspaceId,
  setStoredActiveWorkspaceId,
} from "../api/backend";

const WorkspaceContext = createContext(null);

export function WorkspaceProvider({ children }) {
  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspace, setActiveWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadWorkspaces = async () => {
    if (!auth.currentUser) {
      setWorkspaces([]);
      setActiveWorkspace(null);
      setError("");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const all = await getUserWorkspaces();
      setWorkspaces(all);

      // Restore active workspace from localStorage, or fall back to most recent
      const storedId = getStoredActiveWorkspaceId();
      const found = all.find((w) => w.id === storedId || w._id === storedId);
      const active = found || all[0] || null;
      setActiveWorkspace(active);
      if (active) {
        setStoredActiveWorkspaceId(active.id || active._id);
      }
    } catch (err) {
      setError(err.message);
      setWorkspaces([]);
      setActiveWorkspace(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setWorkspaces([]);
        setActiveWorkspace(null);
        setError("");
        setLoading(false);
        return;
      }
      await loadWorkspaces();
    });
    return () => unsubscribe();
  }, []);

  const switchWorkspace = (workspaceId) => {
    const ws = workspaces.find((w) => w.id === workspaceId || w._id === workspaceId);
    if (ws) {
      setActiveWorkspace(ws);
      setStoredActiveWorkspaceId(ws.id || ws._id);
    }
  };

  const addWorkspace = (ws) => {
    setWorkspaces((prev) => [ws, ...prev]);
    setActiveWorkspace(ws);
    setStoredActiveWorkspaceId(ws.id || ws._id);
  };

  // Backwards-compat alias: old code uses `workspace` (singular)
  const workspace = activeWorkspace;
  const setWorkspace = setActiveWorkspace;

  // Legacy single-workspace refresh (used by WorkspaceSetup page)
  const refreshWorkspace = loadWorkspaces;

  return (
    <WorkspaceContext.Provider
      value={{
        // Multi-workspace API
        workspaces,
        activeWorkspace,
        switchWorkspace,
        addWorkspace,
        refreshWorkspaces: loadWorkspaces,
        // Legacy single-workspace API (backward compat)
        workspace,
        setWorkspace,
        refreshWorkspace,
        loading,
        error,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
}
