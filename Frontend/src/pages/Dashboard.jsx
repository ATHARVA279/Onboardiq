import React, { useEffect, useState } from "react";
import { getLibrary, deleteDocument } from "../api/library";
import api from "../api/backend";
import CourseCard from "../components/CourseCard";
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  BookOpen,
  Target,
  MessageCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import PageLayout from "../components/layout/PageLayout";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Card from "../components/ui/Card";
import UsageStats from "../components/UsageStats";
import { auth } from "../api/firebaseConfig";

const Dashboard = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [activeTab, setActiveTab] = useState("all");
  const [userStats, setUserStats] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchLibrary();
    fetchUserStats();
  }, []);

  const fetchUserStats = async () => {
    try {
      const response = await api.get("/auth/me");
      setUserStats(response.data);
    } catch (error) {
      console.error("Failed to fetch user stats", error);
    }
  };

  const fetchLibrary = async () => {
    try {
      const data = await getLibrary();
      setCourses(data);
    } catch (error) {
      toast.error("Failed to load library");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this course?")) {
      try {
        await deleteDocument(id);
        setCourses(courses.filter((c) => c.id !== id));
        toast.success("Course deleted");
      } catch (error) {
        toast.error("Failed to delete course");
      }
    }
  };

  const handleToggleStatus = async (id, type) => {
    const updatedCourses = courses.map((c) => {
      if (c.id === id) {
        return {
          ...c,
          [type === "favorite" ? "is_favorite" : "is_archived"]:
            !c[type === "favorite" ? "is_favorite" : "is_archived"],
        };
      }
      return c;
    });
    setCourses(updatedCourses);

    try {
      const course = courses.find((c) => c.id === id);
      const newValue =
        !course[type === "favorite" ? "is_favorite" : "is_archived"];

      await api.patch(`/library/${id}/status`, {
        [type === "favorite" ? "is_favorite" : "is_archived"]: newValue,
      });
    } catch (error) {
      toast.error("Failed to update status");
      setCourses(courses);
    }
  };

  const filteredCourses = courses.filter((course) => {
    const matchesSearch =
      course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.url.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (activeTab === "favorites") return course.is_favorite;
    if (activeTab === "archived") return course.is_archived;

    return !course.is_archived;
  });

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const userName = auth.currentUser?.displayName?.split(" ")[0] || "Scholar";

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-zinc-400">
        Loading dashboard...
      </div>
    );
  }

  return (
    <PageLayout>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-3 space-y-8">
          {/* Header Section */}
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold text-zinc-100 tracking-tight">
              {greeting},{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-500">
                {userName}
              </span>
            </h1>
            <p className="text-zinc-400">
              Here is what's happening with your learning today.
            </p>
          </div>

          {/* Stats Overview Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-5 border-zinc-800 bg-gradient-to-br from-zinc-900/50 to-zinc-900/30 hover:border-zinc-700 transition-all duration-300 group">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-colors">
                  <BookOpen className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="flex-1">
                  <p className="text-3xl font-bold text-zinc-100 mb-1">
                    {courses.filter((c) => !c.is_archived).length}
                  </p>
                  <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">
                    Active Courses
                  </p>
                </div>
              </div>
            </Card>
            <Card className="p-5 border-zinc-800 bg-gradient-to-br from-zinc-900/50 to-zinc-900/30 hover:border-zinc-700 transition-all duration-300 group">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-colors">
                  <Target className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="flex-1">
                  <p className="text-3xl font-bold text-zinc-100 mb-1">
                    {userStats?.usage?.extract || 0}
                  </p>
                  <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">
                    Documents Extracted
                  </p>
                </div>
              </div>
            </Card>
            <Card className="p-5 border-zinc-800 bg-gradient-to-br from-zinc-900/50 to-zinc-900/30 hover:border-zinc-700 transition-all duration-300 group">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 group-hover:bg-amber-500/20 transition-colors">
                  <MessageCircle className="w-5 h-5 text-amber-400" />
                </div>
                <div className="flex-1">
                  <p className="text-3xl font-bold text-zinc-100 mb-1">
                    {userStats?.usage?.chat || 0}
                  </p>
                  <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">
                    Chat Uses
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Controls & Filters */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-zinc-800 pb-6">
            <div className="flex items-center gap-1 bg-zinc-900/50 p-1 rounded-lg border border-zinc-800">
              {["all", "favorites", "archived"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === tab
                    ? "bg-zinc-800 text-zinc-100 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-300"
                    } capitalize`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-10 bg-zinc-900 border-zinc-800 focus:border-emerald-500 text-sm"
                />
              </div>
              <div className="flex items-center gap-1 border-l border-zinc-800 pl-3">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 rounded-lg transition-colors ${viewMode === "grid" ? "text-emerald-400 bg-emerald-500/10" : "text-zinc-500 hover:text-zinc-300"}`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 rounded-lg transition-colors ${viewMode === "list" ? "text-emerald-400 bg-emerald-500/10" : "text-zinc-500 hover:text-zinc-300"}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
              <Button
                variant="gradient"
                size="sm"
                onClick={() => navigate("/new")}
                className="h-10 px-4"
              >
                <Plus className="w-4 h-4 mr-2" />
                New
              </Button>
            </div>
          </div>

          {/* Content Grid */}
          {filteredCourses.length === 0 ? (
            <Card className="text-center py-24 border-dashed border-zinc-800 bg-zinc-900/20">
              <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-zinc-800 shadow-inner">
                <Plus className="w-8 h-8 text-zinc-600" />
              </div>
              <h3 className="text-xl font-semibold text-zinc-100 mb-2">
                No courses found
              </h3>
              <p className="text-zinc-400 mb-8 max-w-sm mx-auto">
                {searchTerm
                  ? "Try adjusting your search terms."
                  : "Get started by extracting content from a URL to create your first course."}
              </p>
              <Button variant="secondary" onClick={() => navigate("/new")}>
                Create Course &rarr;
              </Button>
            </Card>
          ) : (
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-1 md:grid-cols-2 gap-6"
                  : "space-y-4"
              }
            >
              {filteredCourses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  onDelete={handleDelete}
                  onToggleStatus={handleToggleStatus}
                  viewMode={viewMode}
                />
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <UsageStats stats={userStats} />
        </div>
      </div>
    </PageLayout>
  );
};

export default Dashboard;
