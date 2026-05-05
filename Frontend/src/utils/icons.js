// Centralized icon mapping for consistency across the app
import {
  // Navigation & Actions
  Home, MessageCircle, Sparkles, Settings,
  // Content & Learning  
  BookOpen, Target, Lightbulb, GraduationCap, Award, Bookmark,
  // Status & Feedback
  Check, X, AlertCircle, Info, CheckCircle, XCircle,
  // UI Elements
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  Search, Filter, Trash2, Plus, Minus, Edit,
  // Data & Analytics
  TrendingUp, BarChart, PieChart, Activity,
  // Communication
  Send, Mail, Bell, User,
  // Misc
  Link, ExternalLink, Download, Upload, Copy,
  Zap, Clock, Calendar, Star,
  Play, Pause, RotateCw, Loader2
} from 'lucide-react';

// Icon components with consistent sizing and styling
export const icons = {
  // Navigation
  home: Home,
  chat: MessageCircle,
  
  // Learning
  concept: Target,
  sparkle: Sparkles,
  lightbulb: Lightbulb,
  graduation: GraduationCap,
  book: BookOpen,
  award: Award,
  bookmark: Bookmark,
  
  // Status
  check: Check,
  cross: X,
  checkCircle: CheckCircle,
  crossCircle: XCircle,
  alert: AlertCircle,
  info: Info,
  
  // Actions
  search: Search,
  filter: Filter,
  trash: Trash2,
  plus: Plus,
  minus: Minus,
  edit: Edit,
  link: Link,
  externalLink: ExternalLink,
  send: Send,
  
  // UI
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  chevronDown: ChevronDown,
  chevronUp: ChevronUp,
  
  // Data
  trending: TrendingUp,
  barChart: BarChart,
  pieChart: PieChart,
  activity: Activity,
  
  // Misc
  zap: Zap,
  clock: Clock,
  calendar: Calendar,
  star: Star,
  settings: Settings,
  loader: Loader2,
  refresh: RotateCw,
  play: Play,
  pause: Pause,
};

// Default icon props for consistency
export const defaultIconProps = {
  size: 20,
  strokeWidth: 2,
};

// Icon sizes
export const iconSizes = {
  xs: 14,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
  '2xl': 40,
};

// Helper function to get icon with default props
export const getIcon = (name, props = {}) => {
  const Icon = icons[name];
  if (!Icon) return null;
  return <Icon {...defaultIconProps} {...props} />;
};
