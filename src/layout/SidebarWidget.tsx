"use client";

import { useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function SidebarWidget() {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleRating = (value: number) => {
    if (isSubmitted) return;

    setRating(value);
    setIsSubmitted(true);

    toast.success(
      `Your ${value} star${value > 1 ? "s" : ""} Helps Alot Thanks!`,
      {
        position: "top-right",
        autoClose: 2000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: "colored",
      }
    );

    setTimeout(() => {
      setRating(0);
      setIsSubmitted(false);
    }, 2300);
  };

  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        limit={1}
        toastClassName={() =>
          "!bg-blue-500 !rounded !border !border-gray-200 dark:!border-white/20 !p-3 "
        }
      />


      <div
        className={`
          mx-auto mb-10 w-full max-w-60 rounded-2xl bg-gray-100 px-4 py-5 text-center 
          dark:bg-white/3 transition-all duration-300`}
      >
        <h3 className="mb-3 font-semibold text-sm text-gray-900 dark:text-white">
         Luco Quality Rating
        </h3>

        <div className="flex justify-center items-center gap-1 mb-3">
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
                  group transition-all duration-200 p-1 rounded-full
                  hover:scale-110 focus:outline-none focus:ring-2 focus:ring-brand-500/50
                  ${isDisabled ? "cursor-default opacity-70" : "cursor-pointer"}
                `}
                aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
              >
                <svg
                  className={`
                    w-6 h-6 transition-all duration-300
                    ${
                      isFilled
                        ? "text-blue-500 scale-110"
                        : "text-gray-300 dark:text-gray-600"
                    }
                    group-hover:text-blue-400
                    dark:group-hover:text-blue-500
                  `}
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                  />
                </svg>
              </button>
            );
          })}
        </div>

        <p className="text-gray-500 text-xs dark:text-gray-400">
          Help us improve by rating your experience!
        </p>
      </div>
    </>
  );
}
