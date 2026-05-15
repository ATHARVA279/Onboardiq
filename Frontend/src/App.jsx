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
import { motion, AnimatePresence } from "framer-motion";
import { auth } from "./api/firebaseConfig";
import Loader from "./components/Loader";
import { WorkspaceProvider, useWorkspace } from "./context/WorkspaceContext";
import Ask from "./pages/Ask";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Sources from "./pages/Sources";
import Staleness from "./pages/Staleness";
import Team from "./pages/Team";
import WorkspaceSetup from "./pages/WorkspaceSetup";

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } }
};

function PageWrapper({ children }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {children}
    </motion.div>
  );
}

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
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageWrapper><Landing /></PageWrapper>} />
        <Route path="/landing" element={<Navigate to="/" replace />} />
        <Route path="/login" element={<PageWrapper><Login /></PageWrapper>} />
        <Route path="/signup" element={<PageWrapper><Signup /></PageWrapper>} />
        <Route path="/auth" element={<Navigate to="/login" replace />} />
        <Route path="/app" element={<Navigate to="/dashboard" replace />} />
        <Route
          path="/workspace/setup"
          element={
            <ProtectedRoute>
              <WorkspaceGuard>
                <PageWrapper><WorkspaceSetup /></PageWrapper>
              </WorkspaceGuard>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <WorkspaceGuard>
                <PageWrapper><Dashboard /></PageWrapper>
              </WorkspaceGuard>
            </ProtectedRoute>
          }
        />
        <Route
          path="/ask"
          element={
            <ProtectedRoute>
              <WorkspaceGuard>
                <PageWrapper><Ask /></PageWrapper>
              </WorkspaceGuard>
            </ProtectedRoute>
          }
        />
        <Route
          path="/sources"
          element={
            <ProtectedRoute>
              <WorkspaceGuard>
                <PageWrapper><Sources /></PageWrapper>
              </WorkspaceGuard>
            </ProtectedRoute>
          }
        />
        <Route
          path="/staleness"
          element={
            <ProtectedRoute>
              <WorkspaceGuard>
                <PageWrapper><Staleness /></PageWrapper>
              </WorkspaceGuard>
            </ProtectedRoute>
          }
        />
        <Route
          path="/team"
          element={
            <ProtectedRoute>
              <WorkspaceGuard>
                <PageWrapper><Team /></PageWrapper>
              </WorkspaceGuard>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <Router>
      <WorkspaceProvider>
        <AppRoutes />
        <ToastContainer 
          position="top-right" 
          autoClose={3000} 
          theme="dark"
          toastClassName="bg-[var(--bg-surface)] border border-[var(--bg-hover)] text-[var(--text-primary)]"
          bodyClassName="text-sm font-medium"
          progressClassName="bg-[var(--accent-primary)]"
        />
      </WorkspaceProvider>
    </Router>
  );
}
