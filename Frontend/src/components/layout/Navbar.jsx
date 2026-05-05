import { Link, useLocation, useNavigate } from "react-router-dom";
import { BookOpen, MessageCircle, LogOut, Sparkles, LayoutDashboard } from "lucide-react";
import { useState, useEffect } from "react";
import { auth } from "../../api/firebaseConfig";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { toast } from "react-toastify";
import Button from "../ui/Button";
import Badge from "../ui/Badge";

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
            localStorage.clear();
            toast.success("Logged out successfully");
            navigate("/login");
        } catch (error) {
            toast.error("Error logging out");
        }
    };

    const isActive = (path) => location.pathname === path;

    const navItems = [
        { path: "/app", label: "Dashboard", Icon: LayoutDashboard },
        { path: "/new", label: "Add Course", Icon: BookOpen },
        { path: "/chat", label: "Chat", Icon: MessageCircle },
    ];

    return (
        <nav className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-zinc-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Logo */}
                    <Link to="/app" className="flex items-center gap-2 group">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/40 transition-all">
                            <Sparkles className="w-4 h-4 text-white" strokeWidth={2.5} />
                        </div>
                        <span className="font-bold text-lg tracking-tight text-zinc-100">
                            Onboardiq
                        </span>
                        <Badge variant="green" className="ml-1 hidden sm:inline-flex">Beta</Badge>
                    </Link>

                    {/* Navigation */}
                    {user && (
                        <div className="flex items-center gap-1">
                            <div className="hidden md:flex items-center gap-1 mr-2">
                                {navItems.map((item) => {
                                    const { Icon } = item;
                                    const active = isActive(item.path);

                                    return (
                                        <Link
                                            key={item.path}
                                            to={item.path}
                                        >
                                            <Button
                                                variant={active ? "secondary" : "ghost"}
                                                className={active ? "bg-zinc-800 text-zinc-100" : "text-zinc-400 hover:text-zinc-100"}
                                            >
                                                <Icon className="w-5 h-5" />
                                                <span className="relative top-[1px]">{item.label}</span>
                                            </Button>
                                        </Link>
                                    );
                                })}
                            </div>

                            {/* Mobile Nav (Icons only) */}
                            <div className="flex md:hidden items-center gap-1 mr-2">
                                {navItems.map((item) => {
                                    const { Icon } = item;
                                    const active = isActive(item.path);
                                    return (
                                        <Link key={item.path} to={item.path}>
                                            <Button
                                                variant={active ? "secondary" : "ghost"}
                                                size="sm"
                                                className="px-2"
                                            >
                                                <Icon className="w-4 h-4" />
                                            </Button>
                                        </Link>
                                    )
                                })}
                            </div>

                            <div className="h-6 w-px bg-zinc-800 mx-2" />

                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleLogout}
                                className="text-zinc-400 hover:text-red-400"
                            >
                                <LogOut className="w-4 h-4" />
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
}
