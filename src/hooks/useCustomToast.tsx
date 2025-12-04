"use client";

import { useToast } from "../context/ToastContext";

const useCustomToast = () => {
  const { showSuccessToast, showErrorToast, showInfoToast, showWarningToast } = useToast();

  return {
    showSuccessToast,
    showErrorToast,
    showInfoToast,
    showWarningToast
  };
};

export default useCustomToast;
