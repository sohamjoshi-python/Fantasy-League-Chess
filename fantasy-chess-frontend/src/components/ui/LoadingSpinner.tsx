import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  text?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8'
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  className = '', 
  text 
}) => {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="flex flex-col items-center space-y-2">
        <div 
          className={`${sizeClasses[size]} border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin`}
        />
        {text && (
          <p className="text-sm text-gray-600 animate-pulse">{text}</p>
        )}
      </div>
    </div>
  );
};

interface SkeletonProps {
  className?: string;
  lines?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', lines = 1 }) => {
  return (
    <div className={`animate-pulse ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div 
          key={i}
          className="h-4 bg-gray-200 rounded mb-2 last:mb-0"
          style={{ 
            width: i === lines - 1 ? '75%' : '100%',
            animationDelay: `${i * 0.1}s`
          }}
        />
      ))}
    </div>
  );
};

interface LoadingCardProps {
  className?: string;
}

export const LoadingCard: React.FC<LoadingCardProps> = ({ className = '' }) => {
  return (
    <div className={`bg-white rounded-lg shadow-md p-4 ${className}`}>
      <div className="flex items-center space-x-3 mb-3">
        <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse" />
        <div className="flex-1">
          <Skeleton lines={2} />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton lines={3} />
      </div>
    </div>
  );
};

interface LoadingGridProps {
  count?: number;
  className?: string;
}

export const LoadingGrid: React.FC<LoadingGridProps> = ({ count = 6, className = '' }) => {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <LoadingCard key={i} />
      ))}
    </div>
  );
};

export const SkeletonBlock: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse rounded bg-neutral-200 ${className}`} />
);

/** Reserves the space a typical early/late point table occupies. */
export const PointBreakdownSkeleton: React.FC = () => (
  <div className="space-y-6" aria-hidden="true">
    {[0, 1].map((section) => (
      <div key={section}>
        <SkeletonBlock className="mb-3 h-6 w-32" />
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-7 w-full" />
          ))}
        </div>
      </div>
    ))}
    <SkeletonBlock className="h-20 w-full" />
  </div>
);

const cardShell = 'bg-white rounded-lg shadow-lg border-2 p-4 lg:p-6';

export const DashboardPageSkeleton: React.FC = () => (
  <div className="w-full max-w-6xl mx-auto bg-white min-h-screen pt-24" aria-busy="true" aria-label="Loading dashboard">
    <div className="mb-8 flex flex-col items-center">
      <SkeletonBlock className="h-12 w-56" />
      <SkeletonBlock className="mt-3 h-1 w-16" />
    </div>
    <div className="space-y-6 lg:space-y-8">
      <div className={`${cardShell} border-royalBlue`}>
        <SkeletonBlock className="mb-4 h-8 w-48" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <SkeletonBlock className="h-12" />
          <SkeletonBlock className="h-12" />
          <SkeletonBlock className="h-12" />
        </div>
      </div>
      <div className={`${cardShell} border-royalBlue`}>
        <SkeletonBlock className="mb-4 h-7 w-40" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-20" />
          ))}
        </div>
      </div>
      <div className={`${cardShell} border-royalBlue`}>
        <SkeletonBlock className="mb-4 h-7 w-48" />
        <PointBreakdownSkeleton />
      </div>
      <div className={`${cardShell} border-royalBlue`}>
        <SkeletonBlock className="mb-4 h-7 w-52" />
        <SkeletonBlock className="h-16 w-full" />
      </div>
    </div>
  </div>
);

export const LeaguePageSkeleton: React.FC = () => (
  <div className="w-full max-w-6xl mx-auto bg-white min-h-screen p-4 lg:p-6" aria-busy="true" aria-label="Loading league">
    <div className={`${cardShell} mb-6 border-gold lg:mb-8`}>
      <SkeletonBlock className="mb-4 h-9 w-64" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SkeletonBlock className="h-10" />
        <SkeletonBlock className="h-10" />
        <SkeletonBlock className="h-10" />
      </div>
    </div>
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
      <div className={`${cardShell} border-gold`}>
        <SkeletonBlock className="mb-4 h-7 w-32" />
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-14 w-full" />
          ))}
        </div>
      </div>
      <div className="space-y-4 lg:space-y-6">
        <div className={`${cardShell} border-gold`}>
          <SkeletonBlock className="mb-4 h-7 w-32" />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonBlock key={i} className="h-20" />
            ))}
          </div>
        </div>
        <div className={`${cardShell} border-gold`}>
          <SkeletonBlock className="mb-4 h-7 w-40" />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonBlock key={i} className="h-20" />
            ))}
          </div>
        </div>
      </div>
    </div>
    <div className="mt-8">
      <MarketplaceSkeleton />
    </div>
  </div>
);

export const ProfilePageSkeleton: React.FC = () => (
  <div className="w-full max-w-4xl mx-auto pt-24 px-4 pb-12" aria-busy="true" aria-label="Loading profile">
    <div className={`${cardShell} border-royalBlue`}>
      <div className="mb-6 flex items-center gap-4">
        <SkeletonBlock className="h-16 w-16 rounded-full" />
        <SkeletonBlock className="h-8 w-48" />
      </div>
      <div className="space-y-6">
        <SkeletonBlock className="h-16 w-full" />
        <SkeletonBlock className="h-16 w-full" />
        <SkeletonBlock className="h-10 w-32" />
      </div>
    </div>
  </div>
);

export const LeaderboardPageSkeleton: React.FC = () => (
  <div className="min-h-screen bg-gradient-to-br from-royalBlue to-purple-900" aria-busy="true" aria-label="Loading leaderboards">
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-8 flex flex-col items-center">
        <SkeletonBlock className="mb-2 h-10 w-80 bg-white/20" />
        <SkeletonBlock className="h-6 w-64 bg-white/20" />
      </div>
      <SkeletonBlock className="mb-8 h-12 w-full bg-white/20" />
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-16 w-full bg-white/20" />
        ))}
      </div>
    </div>
  </div>
);

export const PlayerHistorySkeleton: React.FC = () => (
  <div className="min-h-screen bg-gray-50 py-8" aria-busy="true" aria-label="Loading player">
    <div className="mx-auto max-w-6xl px-4">
      <SkeletonBlock className="mb-6 h-6 w-24" />
      <SkeletonBlock className="mb-6 h-40 w-full" />
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-28" />
        ))}
      </div>
      <SkeletonBlock className="h-64 w-full" />
    </div>
  </div>
);

export const MarketplaceSkeleton: React.FC = () => (
  <div className="w-full bg-white p-4 shadow-md sm:p-6" aria-busy="true" aria-label="Loading marketplace">
    <div className="mb-6 flex flex-col items-center">
      <SkeletonBlock className="mb-2 h-8 w-64" />
      <SkeletonBlock className="h-4 w-80" />
    </div>
    <SkeletonBlock className="mb-6 h-20 w-full" />
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <SkeletonBlock key={i} className="h-28" />
      ))}
    </div>
  </div>
);
