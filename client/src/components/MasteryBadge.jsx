import React from 'react';
import { Sparkles, BookOpen, Clock, CheckCircle2 } from 'lucide-react';

const MasteryBadge = ({ status = 'New', size = 'md', showIcon = true }) => {
  const configs = {
    New: {
      bg: 'bg-slate-800/80 text-slate-300 border-slate-700/60',
      icon: Sparkles,
      label: 'New Concept',
    },
    Learning: {
      bg: 'bg-blue-950/60 text-blue-300 border-blue-800/50',
      icon: BookOpen,
      label: 'Learning (1-2 reps)',
    },
    Reviewing: {
      bg: 'bg-amber-950/60 text-amber-300 border-amber-800/50',
      icon: Clock,
      label: 'Reviewing',
    },
    Mastered: {
      bg: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/50',
      icon: CheckCircle2,
      label: 'Mastered (21d+)',
    },
  };

  const config = configs[status] || configs.New;
  const IconComponent = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-medium',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-medium',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border backdrop-blur-sm transition-colors ${config.bg} ${sizeClasses[size] || sizeClasses.md}`}
      title={`SM-2 Status: ${status}`}
    >
      {showIcon && <IconComponent className={`${iconSizes[size] || iconSizes.md} shrink-0`} />}
      <span>{status}</span>
    </span>
  );
};

export default MasteryBadge;

