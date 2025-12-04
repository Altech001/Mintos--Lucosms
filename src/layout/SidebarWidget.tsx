"use client";

import { useState, useMemo } from "react";
import { Star, Sparkles, Heart, TrendingUp, Activity } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { apiClient } from "../lib/api/client";
import useCustomToast from "../hooks/useCustomToast";

export default function SidebarWidget() {
  const { user } = useAuth();
  const isAdmin = !!user?.isSuperuser;
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { showSuccessToast } = useCustomToast();

  // Fetch all transactions to calculate rating
  const { data: transactions } = useQuery({
    queryKey: ['allTransactions'],
    queryFn: async () => {
      const response = await apiClient.api.transactions.transactionsListAllTransactions({ skip: 0, limit: 1000 });
      return response;
    },
    enabled: isAdmin,
    staleTime: 60_000,
  });

  // Calculate rating based on transaction count
  const communityRating = useMemo(() => {
    if (!transactions?.count) return { rating: 0, reviews: 0 };

    const count = transactions.count;
    // Rating algorithm: More transactions = higher rating
    // 0-100 transactions: 3.0-3.5 stars
    // 100-500: 3.5-4.0 stars
    // 500-1000: 4.0-4.5 stars
    // 1000+: 4.5-5.0 stars

    let calculatedRating = 3.0;
    if (count >= 1000) {
      calculatedRating = 4.5 + Math.min(0.5, (count - 1000) / 2000);
    } else if (count >= 500) {
      calculatedRating = 4.0 + ((count - 500) / 500) * 0.5;
    } else if (count >= 100) {
      calculatedRating = 3.5 + ((count - 100) / 400) * 0.5;
    } else {
      calculatedRating = 3.0 + (count / 100) * 0.5;
    }

    return {
      rating: Math.min(5.0, Math.round(calculatedRating * 10) / 10),
      reviews: count
    };
  }, [transactions]);

  // Calculate rating distribution
  const ratingDistribution = useMemo(() => {
    if (!transactions?.data) return [];

    const total = transactions.count || 0;
    if (total === 0) return [];

    // Simulate distribution based on actual transaction count
    const rating = communityRating.rating;

    return [
      { stars: 5, percentage: Math.round((rating >= 4.5 ? 70 : rating >= 4.0 ? 50 : 30) * 100) / 100 },
      { stars: 4, percentage: Math.round((rating >= 4.0 ? 20 : 25) * 100) / 100 },
      { stars: 3, percentage: Math.round((rating >= 3.5 ? 7 : 20) * 100) / 100 },
      { stars: 2, percentage: Math.round((rating >= 3.0 ? 2 : 15) * 100) / 100 },
      { stars: 1, percentage: Math.round((rating >= 3.0 ? 1 : 10) * 100) / 100 },
    ];
  }, [transactions, communityRating]);

  const handleRating = (value: number) => {
    if (isSubmitted) return;

    setRating(value);
    setIsSubmitted(true);

    // Show success toast with custom message based on rating
    const messages = [
      "Thanks for your feedback! 🌟",
      "We appreciate your input! ⭐⭐",
      "Great! We'll keep improving! ⭐⭐⭐",
      "Awesome! Thanks for the support! ⭐⭐⭐⭐",
      "Amazing! You're the best! ⭐⭐⭐⭐⭐"
    ];

    showSuccessToast(messages[value - 1] || "Thank you for rating!");

    // Reset after animation
    setTimeout(() => {
      setRating(0);
      setIsSubmitted(false);
    }, 3000);
  };

  // Admin view - Only show community rating
  if (isAdmin) {
    return (
      <div className="mx-auto mb-6 w-full max-w-auto">
        {/* Community Stats Card for Admin */}
        <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-brand-50 dark:bg-brand-900/20 rounded-full p-2.5">
              <Activity className="w-5 h-5 text-brand-500" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Platform Stats
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Real-time metrics
              </p>
            </div>
          </div>

          {/* Overall Rating */}
          <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Community Rating
            </span>
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                {communityRating.rating.toFixed(1)}
              </span>
            </div>
          </div>

          {/* Rating Distribution */}
          <div className="space-y-2 mb-4">
            {ratingDistribution.map((item) => (
              <div key={item.stars} className="flex items-center gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-500 w-3">{item.stars}</span>
                <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full transition-all duration-500"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
                <span className="text-xs text-gray-400 dark:text-gray-600 w-10 text-right">
                  {item.percentage}%
                </span>
              </div>
            ))}
          </div>

          {/* Transaction Count */}
          <div className="pt-3 border-t border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-500">
                Total Transactions
              </span>
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-green-500" />
                <span className="text-sm font-bold text-gray-900 dark:text-white">
                  {communityRating.reviews.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Regular user view - Show rating widget
  return (
    <div className="mx-auto mb-6 w-full max-w-auto">
      {/* Main Rating Card */}
      <div
        className={`
          relative overflow-hidden rounded-2xl bg-transparent 
          dark:from-brand-900/20 dark:to-purple-900/20 
          border border-brand-100 dark:border-brand-800/30
          p-6 text-center transition-all duration-300
          ${isSubmitted ? 'scale-[0.98]' : 'hover:shadow-2xl'}
        `}
      >
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 w-20 h-20 bg-brand-200/20 dark:bg-brand-700/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-16 h-16 bg-purple-200/20 dark:bg-purple-700/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

        {/* Icon Header */}
        <div className="relative mb-4 flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-brand-400/20 dark:bg-brand-500/20 rounded-full blur-xl animate-pulse" />
            <div className="relative bg-white dark:bg-gray-900 rounded-full p-3 border ">
              {isSubmitted ? (
                <Heart className="w-6 h-6 text-brand-500 fill-brand-500 animate-bounce" />
              ) : (
                <Sparkles className="w-6 h-6 text-brand-500" />
              )}
            </div>
          </div>
        </div>

        {/* Title */}
        <h3 className="mb-2 font-bold text-base text-gray-900 dark:text-white">
          Rate Your Experience
        </h3>
        <p className="mb-4 text-xs text-gray-600 dark:text-gray-400">
          Help us serve you better
        </p>

        {/* Star Rating */}
        <div className="flex justify-center items-center gap-2 mb-4">
          {[1, 2, 3, 4, 5].map((star) => {
            const isFilled = star <= (hovered || rating);
            const isDisabled = isSubmitted;

            return (
              <button
                key={star}
                onClick={() => handleRating(star)}
                onMouseEnter={() => !isDisabled && setHovered(star)}
                onMouseLeave={() => !isDisabled && setHovered(0)}
                disabled={isDisabled}
                className={`
                  group relative transition-all duration-200 
                  focus:outline-none focus:ring-2 focus:ring-brand-400/50 rounded-full
                  ${isDisabled ? "cursor-default" : "cursor-pointer hover:scale-125 active:scale-110"}
                `}
                aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
              >
                {/* Glow effect on hover */}
                {!isDisabled && (
                  <div className="absolute inset-0 bg-brand-400/30 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                )}

                <Star
                  className={`
                    relative w-7 h-7 transition-all duration-300
                    ${isFilled
                      ? "text-yellow-400 fill-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]"
                      : "text-gray-300 dark:text-gray-600"
                    }
                    ${!isDisabled && "group-hover:text-yellow-300 group-hover:fill-yellow-300"}
                  `}
                />
              </button>
            );
          })}
        </div>

        {/* Status Message */}
        <div className="min-h-[20px]">
          {isSubmitted ? (
            <p className="text-xs font-medium text-brand-600 dark:text-brand-400 animate-pulse">
              ✨ Thank you for your feedback!
            </p>
          ) : (
            <p className="text-xs text-gray-500 dark:text-gray-500">
              Tap a star to rate
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
