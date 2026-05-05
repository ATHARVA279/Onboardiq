import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../api/firebaseConfig";
import { getUserWorkspace } from "../api/backend";

const WorkspaceContext = createContext(null);

export function WorkspaceProvider({ children }) {
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refreshWorkspace = async () => {
    if (!auth.currentUser) {
      setWorkspace(null);
      setError("");
      setLoading(false);
      return null;
    }

    setLoading(true);
    setError("");
    try {
      const nextWorkspace = await getUserWorkspace();
      setWorkspace(nextWorkspace);
      return nextWorkspace;
    } catch (err) {
      setError(err.message);
      setWorkspace(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setWorkspace(null);
        setError("");
        setLoading(false);
        return;
      }

      await refreshWorkspace();
    });

    return () => unsubscribe();
  }, []);

  return (
    <WorkspaceContext.Provider
      value={{
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
