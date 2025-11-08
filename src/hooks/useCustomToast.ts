"use client";

import { toast } from "react-toastify";

const useCustomToast = () => {
  const showSuccessToast = (description: string) => {
    toast.success(description, { position: "top-right" });
  };

  const showErrorToast = (description: string) => {
    toast.error(description, { position: "top-right" });
  };

  return { showSuccessToast, showErrorToast };
};

export default useCustomToast;
