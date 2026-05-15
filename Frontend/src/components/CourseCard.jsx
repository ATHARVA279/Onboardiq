import React from 'react';
import { BookOpen, Trash2, Calendar, Link as LinkIcon, ArrowRight, Star, Archive } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Card from './ui/Card';
import Button from './ui/Button';
import Badge from './ui/Badge';

const CourseCard = ({ course, onDelete, onToggleStatus }) => {
    const navigate = useNavigate();

    const date = new Date(course.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });

    return (
        <Card hover className="group relative flex flex-col h-full bg-[var(--bg-surface)] border-[var(--bg-hover)]">
            <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-[var(--accent-muted)] rounded-xl group-hover:bg-[var(--accent-glow)] transition-colors border border-[var(--accent-muted)]">
                    <BookOpen className="w-6 h-6 text-[var(--accent-primary)]" />
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleStatus(course.id, 'favorite');
                        }}
                        className={`hover:bg-[var(--bg-hover)] ${course.is_favorite ? 'text-[var(--status-medium)]' : 'text-[var(--text-tertiary)] hover:text-[var(--status-medium)]'}`}
                    >
                        <Star className="w-4 h-4" fill={course.is_favorite ? "currentColor" : "none"} />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleStatus(course.id, 'archived');
                        }}
                        className={`hover:bg-[var(--bg-hover)] ${course.is_archived ? 'text-[var(--status-success)]' : 'text-[var(--text-tertiary)] hover:text-[var(--status-success)]'}`}
                    >
                        <Archive className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(course.id);
                        }}
                        className="text-[var(--text-tertiary)] hover:text-[var(--status-high)] hover:bg-[var(--status-high)]/10"
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2 line-clamp-2 group-hover:text-[var(--accent-primary)] transition-colors tracking-tight">
                {course.title}
            </h3>

            <div className="space-y-3 mb-6 flex-1">
                <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                    <LinkIcon className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                    <span className="truncate max-w-[200px] font-mono text-xs">{course.url}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-[var(--text-tertiary)]">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Added {date}</span>
                </div>
                {course.concepts_count > 0 && (
                    <Badge variant="green">
                        {course.concepts_count} Concepts
                    </Badge>
                )}
            </div>

            <Button
                variant="secondary"
                onClick={() => navigate(`/study/${course.id}`)}
                className="w-full group-hover:border-[var(--accent-primary)]/30 group-hover:bg-[var(--bg-hover)]"
            >
                Continue Learning
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
        </Card>
    );
};

export default CourseCard;
