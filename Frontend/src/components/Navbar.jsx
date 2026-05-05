import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, BookOpen, MessageCircle, Sparkles, LogOut } from "lucide-react";
import { useState, useEffect } from "react";
import { auth } from "../api/firebaseConfig";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { toast } from "react-toastify";

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success("Logged out successfully");
      navigate("/auth");
    } catch (error) {
      toast.error("Error logging out");
    }
  };

  const isActive = (path) => location.pathname === path;

  const navItems = [
    { path: "/", label: "Library", Icon: Home },
    { path: "/new", label: "Add Course", Icon: BookOpen },
    { path: "/chat", label: "Chat", Icon: MessageCircle },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-red-600 rounded-xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
              <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-orange-600 to-red-600 flex items-center justify-center transform group-hover:scale-110 transition-transform">
                <Sparkles className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold bg-gradient-to-r from-orange-400 via-red-400 to-orange-400 bg-clip-text text-transparent">
                Onboardiq
              </h1>
              <p className="text-xs text-slate-500 -mt-1">Developer Onboarding Intelligence</p>
            </div>
          </Link>

          {/* Navigation */}
          {user && (
            <div className="flex items-center gap-2">
              {navItems.map((item) => {
                const { Icon } = item;
                const active = isActive(item.path);

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`
                      relative px-4 py-2 rounded-xl font-medium text-sm
                      flex items-center gap-2 transition-all duration-300
                      ${active
                        ? 'text-white'
                        : 'text-slate-400 hover:text-slate-200'
                      }
                    `}
                  >
                    {active && (
                      <div className="absolute inset-0 bg-gradient-to-r from-orange-600/20 to-red-600/20 rounded-xl border border-orange-500/30" />
                    )}
                    <Icon
                      className={`w-4 h-4 transition-transform ${active ? 'scale-110' : ''}`}
                      strokeWidth={active ? 2.5 : 2}
                    />
                    <span className="hidden md:inline relative">{item.label}</span>

                    {active && (
                      <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-gradient-to-r from-orange-500 to-red-500 rounded-full" />
                    )}
                  </Link>
                );
              })}

              <button
                onClick={handleLogout}
                className="ml-2 px-4 py-2 rounded-xl font-medium text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-all flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden md:inline">Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
