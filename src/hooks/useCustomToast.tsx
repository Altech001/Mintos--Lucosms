"use client";

import { AlertCircle, CheckCircle, X } from "lucide-react";
import { toast } from "react-toastify";

const useCustomToast = () => {
  const showSuccessToast = (message: string) => {
    toast.success(
      <div className="flex flex-col gap-1">
        <h4 className="font-semibold text-gray-900 dark:text-white text-sm">Success</h4>
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-tight">{message}</p>
      </div>,
      {
        icon: <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />,
        className: "!bg-white dark:!bg-gray-900 !border !border-gray-100 dark:!border-gray-800 !shadow-xl !rounded !p-4 !min-h-[auto] !flex !items-start !gap-3",
        progressClassName: "!bg-green-500 !h-1",
        closeButton: ({ closeToast }) => (
          <button onClick={closeToast} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        ),
      }
    );
  };

  const showErrorToast = (message: string) => {
    toast.error(
      <div className="flex flex-col gap-1">
        <h4 className="font-semibold text-gray-900 dark:text-white text-sm">Error</h4>
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-tight">{message}</p>
      </div>,
      {
        icon: <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />,
        className: "!bg-white dark:!bg-gray-900 !border !border-gray-100 dark:!border-gray-800 !shadow-xl !rounded !p-4 !min-h-[auto] !flex !items-start !gap-3",
        progressClassName: "!bg-red-500 !h-1",
        closeButton: ({ closeToast }) => (
          <button onClick={closeToast} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        ),
      }
    );
  };

  return { showSuccessToast, showErrorToast };
};

export default useCustomToast;
