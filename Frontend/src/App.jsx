import { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./api/firebaseConfig";
import Loader from "./components/Loader";
import { WorkspaceProvider, useWorkspace } from "./context/WorkspaceContext";
import Ask from "./pages/Ask";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Sources from "./pages/Sources";
import Staleness from "./pages/Staleness";
import Team from "./pages/Team";
import WorkspaceSetup from "./pages/WorkspaceSetup";

function ProtectedRoute({ children }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setReady(true);
    });
    return () => unsubscribe();
  }, []);

  if (!ready) return <Loader />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function WorkspaceGuard({ children }) {
  const location = useLocation();
  const { workspace, loading } = useWorkspace();

  if (loading) return <Loader />;

  if (!workspace && location.pathname !== "/workspace/setup") {
    return <Navigate to="/workspace/setup" replace />;
  }

  if (workspace && location.pathname === "/workspace/setup") {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/landing" element={<Navigate to="/" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Auth initialIsLogin={false} />} />
      <Route path="/auth" element={<Navigate to="/login" replace />} />
      <Route path="/app" element={<Navigate to="/dashboard" replace />} />
      <Route
        path="/workspace/setup"
        element={
          <ProtectedRoute>
            <WorkspaceGuard>
              <WorkspaceSetup />
            </WorkspaceGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <WorkspaceGuard>
              <Dashboard />
            </WorkspaceGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/ask"
        element={
          <ProtectedRoute>
            <WorkspaceGuard>
              <Ask />
            </WorkspaceGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/sources"
        element={
          <ProtectedRoute>
            <WorkspaceGuard>
              <Sources />
            </WorkspaceGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/staleness"
        element={
          <ProtectedRoute>
            <WorkspaceGuard>
              <Staleness />
            </WorkspaceGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/team"
        element={
          <ProtectedRoute>
            <WorkspaceGuard>
              <Team />
            </WorkspaceGuard>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <Router>
      <WorkspaceProvider>
        <AppRoutes />
        <ToastContainer position="top-right" autoClose={3000} theme="light" />
      </WorkspaceProvider>
    </Router>
  );
}
