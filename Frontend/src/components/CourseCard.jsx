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
        <Card hover className="group relative flex flex-col h-full">
            <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-emerald-500/10 rounded-xl group-hover:bg-emerald-500/20 transition-colors border border-emerald-500/20">
                    <BookOpen className="w-6 h-6 text-emerald-400" />
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleStatus(course.id, 'favorite');
                        }}
                        className={`hover:bg-zinc-800 ${course.is_favorite ? 'text-yellow-400' : 'text-zinc-500 hover:text-yellow-400'}`}
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
                        className={`hover:bg-zinc-800 ${course.is_archived ? 'text-emerald-400' : 'text-zinc-500 hover:text-emerald-400'}`}
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
                        className="text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            <h3 className="text-xl font-bold text-zinc-100 mb-2 line-clamp-2 group-hover:text-emerald-400 transition-colors tracking-tight">
                {course.title}
            </h3>

            <div className="space-y-3 mb-6 flex-1">
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                    <LinkIcon className="w-3.5 h-3.5 text-zinc-500" />
                    <span className="truncate max-w-[200px] font-mono text-xs">{course.url}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-zinc-500">
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
                className="w-full group-hover:border-emerald-500/30 group-hover:bg-zinc-800"
            >
                Continue Learning
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
        </Card>
    );
};

export default CourseCard;
