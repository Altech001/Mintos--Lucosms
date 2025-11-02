import React from "react";
import ThemeTogglerTwo from "../../components/common/ThemeTogglerTwo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative p-6 bg-white z-1 dark:bg-gray-900 sm:p-0">
      <div className="relative flex flex-col justify-center w-full h-screen lg:flex-row dark:bg-gray-900 sm:p-0">
        {children}
        <div className="relative hidden w-full lg:w-1/2 lg:flex overflow-hidden bg-brand-950 dark:bg-white/5">
          {/* Full Background Image */}
          <img
            src="/images/auth/imac1.svg"
            alt="Luco-SMS Background"
            className="absolute inset-0 w-full h-full object-cover object-center opacity-20"
          />

          {/* Overlay Content */}
          <div className="relative z-10 flex flex-col items-center justify-center w-full h-full p-8 text-center">
            <h1 className="text-3xl md:text-2xl font-bold text-gray-300 mb-4">
              LUCO-SMS
            </h1>
            <p className="text-sm md:text-sm text-gray-200 dark:text-white/80 max-w-md">
              Uganda's Premier Bulk SMS Service Provider.
            </p>
            <p className="mt-3 text-xs text-gray-400 dark:text-white/60">
              Send messages that matter — fast, reliable, and affordable.
            </p>
          </div>
        </div>
        <div className="fixed z-50 hidden bottom-6 right-6 sm:block">
          <ThemeTogglerTwo />
        </div>
      </div>
    </div>
  );
}
