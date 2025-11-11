import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';

interface TopProgressBarProps {
  message?: string;
}

export default function TopProgressBar({ message = 'Loading...' }: TopProgressBarProps) {
  const [progress, setProgress] = useState(0);
  const { user } = useAuth();


  // Generate avatar URL based on user email or name
  const getAvatarUrl = () => {
    const seed = user?.email || user?.fullName || 'default';
    // Using DiceBear API for avatars - multiple styles available
    return `https://api.dicebear.com/7.x/micah/svg?seed=${encodeURIComponent(seed)}&backgroundColor=3b82f6,8b5cf6,ec4899,f59e0b,10b981`;
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 10;
      });
    }, 200);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 bg-white dark:bg-gray-950 z-50">
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-800">
        <div
          className="h-full bg-gradient-to-r from-brand-500 via-brand-600 to-brand-700 transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Center Content */}
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        {/* Logo or Brand */}
        <div className="mb-4">
          
          <div className={`h-16 w-auto animate-pulse rounded-full overflow-hidden border-4 border-primary shadow-lg transition-all duration-300`}>
            <img
              src={getAvatarUrl()}
              alt={user?.fullName || user?.email || "User"}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        </div>

        {/* Loading Text */}
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <span className="w-2 h-2 bg-brand-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
            <span className="w-2 h-2 bg-brand-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
            <span className="w-2 h-2 bg-brand-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
          </div>
        </div>
        
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {message}
        </p>
      </div>
    </div>
  );
}
