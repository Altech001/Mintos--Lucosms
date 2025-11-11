import { Construction, Rocket, Clock, MessageCircleMore, Sparkles } from 'lucide-react';
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";

function Whatsapp() {
  return (
    <>
      <PageMeta
        title="WhatsApp Messaging - Under Development"
        description="WhatsApp messaging feature coming soon"
      />
      <PageBreadcrumb pageTitle="WhatsApp Message" />

      <div className="flex items-center justify-center min-h-[60vh] w-full">
        <div className="max-w-6xl w-full mx-auto px-4">
          {/* Main Card */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-green-900/20 dark:via-emerald-900/20 dark:to-teal-900/20 border-2 border-green-200 dark:border-green-800 ">
            {/* Decorative Elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-green-400/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-400/10 rounded-full blur-3xl"></div>
            
            <div className="relative p-8 md:p-12 text-center">
              {/* Icon */}
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-green-500/20 rounded-full blur-xl animate-pulse"></div>
                  <div className="relative bg-gradient-to-br from-green-500 to-emerald-600 rounded-full p-6 shadow-lg">
                    <MessageCircleMore className="h-16 w-16 text-white" />
                  </div>
                  {/* Floating Badge */}
                  <div className="absolute -top-2 -right-2 bg-yellow-400 rounded-full p-2 shadow-lg animate-bounce">
                    <Construction className="h-5 w-5 text-yellow-900" />
                  </div>
                </div>
              </div>

              {/* Title */}
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Bulk WhatsApp 
              </h1>
              
              {/* Subtitle */}
              <div className="flex items-center justify-center gap-2 mb-6">
                <Sparkles className="h-5 w-5 text-green-600 dark:text-green-400" />
                <p className="text-xl font-semibold text-green-600 dark:text-green-400">
                  Coming Soon
                </p>
                <Sparkles className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>

              {/* Description */}
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
                We're working hard to bring you an amazing Bulk WhatsApp messaging experience. 
                Send bulk messages, manage contacts, and engage with your customers seamlessly.
              </p>

              {/* Features Preview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 max-w-4xl mx-auto">
                <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl p-6 border border-green-200 dark:border-green-800">
                  <Rocket className="h-8 w-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">
                    Bulk Messaging
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Send messages to multiple contacts
                  </p>
                </div>
                
                <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl p-6 border border-green-200 dark:border-green-800">
                  <MessageCircleMore className="h-8 w-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">
                    Rich Media
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Send images, videos, and documents
                  </p>
                </div>
                
                <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl p-6 border border-green-200 dark:border-green-800">
                  <Clock className="h-8 w-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">
                    Schedule Messages
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Plan your campaigns ahead
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full shadow-lg">
                <Construction className="h-5 w-5 animate-pulse" />
                <span className="font-semibold">Under Active Development</span>
              </div>

              {/* Timeline */}
              <div className="mt-8 pt-8 border-t border-green-200 dark:border-green-800">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Expected Launch: <span className="font-semibold text-green-600 dark:text-green-400">Q1 2026</span>
                </p>
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Have questions or suggestions? Contact our support team
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

export default Whatsapp;