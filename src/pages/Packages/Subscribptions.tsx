import { useState, useEffect } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import Modal from "../../components/ui/modal/Modal";
import { useModal } from "../../hooks/useModal";
import useCustomToast from "../../hooks/useCustomToast";
import { useAuth } from "../../context/AuthContext";
import { PlanInfo } from "../../lib/api/models";
import Button from "../../components/ui/button/Button";
import { Loader2, Phone, CheckCircle, Shield } from 'lucide-react';
import Alert from "../../components/ui/alert/Alert";
import Input from "../../components/form/input/InputField";
import Label from "../../components/form/Label";

interface PackageRange {
  min: number;
  max: number | null;
  label: string;
}

const PACKAGE_RANGES: PackageRange[] = [
  { min: 100, max: 500, label: "100 - 500 SMS" },
];

function Subscribptions() {
  const { apiClient } = useAuth();
  const { isOpen, openModal, closeModal } = useModal();
  const { showSuccessToast, showErrorToast } = useCustomToast();
  
  const [plans, setPlans] = useState<{ [key: string]: PlanInfo }>({});
  const [currentPlan, setCurrentPlan] = useState<PlanInfo | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanInfo | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<PackageRange | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isChangingPlan, setIsChangingPlan] = useState(false);
  const [isCustomRange, setIsCustomRange] = useState(false);
  const [customSmsCount, setCustomSmsCount] = useState<string>("");
  
  // Payment states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [showNumberModal, setShowNumberModal] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [identityName, setIdentityName] = useState('');
  const [isValidatingNumber, setIsValidatingNumber] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [transactionUuid, setTransactionUuid] = useState('');
  const [alert, setAlert] = useState<{ variant: 'success' | 'error' | 'warning' | 'info'; title: string; message: string } | null>(null);

  useEffect(() => {
    fetchPlansAndCurrentPlan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchPlansAndCurrentPlan = async () => {
    try {
      setIsLoading(true);
      const [allPlansResponse, currentPlanResponse] = await Promise.all([
        apiClient.api.userData.userDataGetAllPlans(),
        apiClient.api.userData.userDataGetCurrentPlan(),
      ]);
      setPlans(allPlansResponse.plans);
      setCurrentPlan(currentPlanResponse);
    } catch (error) {
      console.error("Error fetching plans:", error);
      showErrorToast("Failed to load subscription plans");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPlan = (plan: PlanInfo) => {
    if (currentPlan?.planName === plan.planName) {
      showErrorToast("You are already on this plan");
      return;
    }
    setSelectedPlan(plan);
    openModal();
  };

  const handlePackageSelect = (packageRange: PackageRange) => {
    setSelectedPackage(packageRange);
    setIsCustomRange(false);
    setCustomSmsCount("");
  };

  const handleCustomRangeSelect = () => {
    setIsCustomRange(true);
    setSelectedPackage(null);
  };

  const calculateTotalCost = () => {
    if (!selectedPlan) return 0;
    const smsCost = parseFloat(selectedPlan.smsCost);
    
    if (isCustomRange && customSmsCount) {
      const count = parseInt(customSmsCount);
      return isNaN(count) ? 0 : smsCost * count;
    }
    
    if (selectedPackage) {
      const smsCount = selectedPackage.max || selectedPackage.min;
      return smsCost * smsCount;
    }
    
    return 0;
  };

  const maskNumber = (num: string) => {
    const digits = num.replace(/\D/g, '');
    if (digits.length <= 4) return digits;
    return `${digits.slice(0, 3)}***${digits.slice(-3)}`;
  };

  // Validate phone number and get identity name
  const validatePhoneNumber = async (msisdn: string): Promise<boolean> => {
    setIsValidatingNumber(true);
    try {
      const formattedNumber = msisdn.startsWith('+') ? msisdn : `+${msisdn}`;
      
      const response = await fetch('https://lucopay-backend.vercel.app/identity/msisdn', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ msisdn: formattedNumber }),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        setIdentityName(data.identityname);
        setAlert({ 
          variant: 'success', 
          title: 'Number Verified', 
          message: `Account holder: ${data.identityname}` 
        });
        return true;
      } else {
        setAlert({ 
          variant: 'error', 
          title: 'Validation Failed', 
          message: data.message || 'Could not validate phone number' 
        });
        return false;
      }
    } catch {
      setAlert({ 
        variant: 'error', 
        title: 'Validation Error', 
        message: 'Failed to validate phone number. Please try again.' 
      });
      return false;
    } finally {
      setIsValidatingNumber(false);
    }
  };

  // Initialize payment
  const handleInitiatePayment = async () => {
    const amount = calculateTotalCost();
    if (!amount || amount <= 0) return;
    
    if (!phoneNumber) {
      setAlert({ variant: 'warning', title: 'Add Phone Number', message: 'Please add your phone number to receive the payment prompt.' });
      setShowNumberModal(true);
      return;
    }

    setIsProcessingPayment(true);
    
    try {
      const reference = crypto.randomUUID();
      
      let formattedPhone = phoneNumber.replace(/\D/g, '');
      if (formattedPhone.startsWith('256')) {
        formattedPhone = '0' + formattedPhone.substring(3);
      }
      
      const amountInt = Math.round(amount);
      
      const payload = {
        amount: amountInt,
        callback_url: 'https://mintospay.vercel.app/v1/pay/webhook/callback',
        country: 'UG',
        description: `${selectedPlan?.planName} Plan - ${isCustomRange ? `${customSmsCount} SMS` : selectedPackage?.label}`,
        phone_number: formattedPhone,
        reference: reference,
      };
      
      const response = await fetch('https://mintospay.vercel.app/v1/pay/initialize', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      
      if (response.status === 201 && data.status === 'success') {
        const uuid = data.data.transaction.uuid;
        setTransactionUuid(uuid);
        
        setShowPaymentModal(false);
        setShowOTPModal(true);
        
        setAlert({ 
          variant: 'info', 
          title: 'Payment Initiated', 
          message: `Check your phone (${maskNumber(phoneNumber)}) to approve the payment.` 
        });
        
        pollPaymentStatus(uuid, amountInt);
      } else {
        let errorMessage = 'Could not initiate payment. Please try again.';
        
        if (response.status === 422 && data.detail) {
          if (Array.isArray(data.detail)) {
            errorMessage = data.detail.map((err: { loc?: string[]; msg: string }) => 
              `${err.loc?.join('.') || 'field'}: ${err.msg}`
            ).join(', ');
          } else if (typeof data.detail === 'string') {
            errorMessage = data.detail;
          }
        } else if (data.message) {
          errorMessage = data.message;
        }
        
        setAlert({ 
          variant: 'error', 
          title: 'Payment Failed', 
          message: errorMessage
        });
        setIsProcessingPayment(false);
      }
    } catch {
      setAlert({ 
        variant: 'error', 
        title: 'Payment Error', 
        message: 'Failed to initiate payment. Please check your connection and try again.' 
      });
      setIsProcessingPayment(false);
    }
  };

  // Poll payment status
  const pollPaymentStatus = async (uuid: string, amount: number) => {
    const maxAttempts = 30;
    let attempts = 0;
    
    const checkStatus = async () => {
      try {
        const response = await fetch(`https://mintospay.vercel.app/v1/pay/verify/${uuid}`, {
          method: 'GET',
          headers: {
            'accept': 'application/json',
          },
        });

        const data = await response.json();
        
        if (response.ok && data.status === 'success') {
          const txStatus = data.data.transaction.status;
          
          if (txStatus === 'completed' || txStatus === 'success') {
            // Payment successful - now change the plan
            await handleConfirmPurchase();
            
            setAlert({ 
              variant: 'success', 
              title: 'Payment Successful!', 
              message: `UGx ${amount.toFixed(2)} paid. Activating your ${selectedPlan?.planName} plan...` 
            });
            
            setIsProcessingPayment(false);
            setShowOTPModal(false);
            setTransactionUuid('');
            return;
          } else if (txStatus === 'failed' || txStatus === 'cancelled') {
            setAlert({ 
              variant: 'error', 
              title: 'Payment Failed', 
              message: 'Payment was declined or cancelled. Please try again.' 
            });
            
            setIsProcessingPayment(false);
            setShowOTPModal(false);
            setTransactionUuid('');
            return;
          } else if (txStatus === 'processing' || txStatus === 'pending') {
            attempts++;
            if (attempts < maxAttempts) {
              setTimeout(checkStatus, 10000);
            } else {
              setAlert({ 
                variant: 'warning', 
                title: 'Payment Pending', 
                message: 'Payment is taking longer than expected. Please check back later.' 
              });
              setIsProcessingPayment(false);
              setShowOTPModal(false);
            }
          }
        } else {
          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(checkStatus, 10000);
          } else {
            setAlert({ 
              variant: 'error', 
              title: 'Verification Error', 
              message: 'Could not verify payment status. Please contact support.' 
            });
            setIsProcessingPayment(false);
            setShowOTPModal(false);
          }
        }
      } catch {
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 10000);
        } else {
          setAlert({ 
            variant: 'error', 
            title: 'Verification Error', 
            message: 'Could not verify payment status. Please contact support.' 
          });
          setIsProcessingPayment(false);
          setShowOTPModal(false);
        }
      }
    };
    
    setTimeout(checkStatus, 5000);
  };

  const resetPaymentModals = () => {
    setShowPaymentModal(false);
    setShowOTPModal(false);
    setShowNumberModal(false);
    setIsProcessingPayment(false);
    setTransactionUuid('');
  };

  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => setAlert(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  const handleConfirmPurchase = async () => {
    if (!selectedPlan) {
      showErrorToast("Please select a plan");
      return;
    }

    if (!selectedPackage && !isCustomRange) {
      showErrorToast("Please select a package range");
      return;
    }

    if (isCustomRange && (!customSmsCount || parseInt(customSmsCount) <= 0)) {
      showErrorToast("Please enter a valid SMS count");
      return;
    }

    try {
      setIsChangingPlan(true);
      await apiClient.api.userData.userDataChangePlan({
        changePlanRequest: {
          newPlan: selectedPlan.planName,
        },
      });
      
      showSuccessToast(`Successfully upgraded to ${selectedPlan.planName} plan!`);
      closeModal();
      setSelectedPlan(null);
      setSelectedPackage(null);
      setIsCustomRange(false);
      setCustomSmsCount("");
      resetPaymentModals();
      await fetchPlansAndCurrentPlan();
    } catch (error) {
      console.error("Error changing plan:", error);
      showErrorToast("Failed to change plan. Please try again.");
    } finally {
      setIsChangingPlan(false);
    }
  };

  const handleProceedToPayment = () => {
    if (!selectedPlan) {
      showErrorToast("Please select a plan");
      return;
    }

    if (!selectedPackage && !isCustomRange) {
      showErrorToast("Please select a package range");
      return;
    }

    if (isCustomRange && (!customSmsCount || parseInt(customSmsCount) <= 0)) {
      showErrorToast("Please enter a valid SMS count");
      return;
    }

    closeModal();
    setShowPaymentModal(true);
  };

  const getPlanBadgeColor = (planName: string) => {
    switch (planName) {
      case "Basic":
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
      case "Standard":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "Premium":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
      case "Enterprise":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const getPlanButtonColor = (planName: string) => {
    switch (planName) {
      case "Basic":
        return "bg-gray-600 hover:bg-gray-700";
      case "Standard":
        return "bg-blue-600 hover:bg-blue-700";
      case "Premium":
        return "bg-purple-600 hover:bg-purple-700";
      case "Enterprise":
        return "bg-amber-600 hover:bg-amber-700";
      default:
        return "bg-primary hover:bg-primary-dark";
    }
  };

  return (
    <div>
      <PageMeta title="Subscriptions" description={""} />
      <PageBreadcrumb pageTitle="Subscriptions" />

      {/* Alert Feedback */}
      {alert && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-999999 animate-slide-down">
          <Alert
            variant={alert.variant}
            title={alert.title}
            message={alert.message}
            showLink={false}
          />
        </div>
      )}

      <ComponentCard title="Subscriptions & Packages" desc="Choose the perfect plan for your SMS needs">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div>
            {/* Current Plan Section */}
            {currentPlan && (
              <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-700 rounded-lg border border-blue-200 dark:border-gray-600">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Current Plan
                    </h3>
                    <div className="flex items-center gap-3">
                      <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getPlanBadgeColor(currentPlan.planName)}`}>
                        {currentPlan.planName}
                      </span>
                      <span className="text-2xl font-bold text-gray-900 dark:text-white">
                        {currentPlan.smsCost} UGX
                      </span>
                      <span className="text-gray-600 dark:text-gray-400">per SMS</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Plans Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="pb-4 pr-4 text-sm font-semibold text-gray-900 dark:text-white">Plan</th>
                    <th className="pb-4 pr-4 text-sm font-semibold text-gray-900 dark:text-white">SMS Cost</th>
                    <th className="pb-4 pr-4 text-sm font-semibold text-gray-900 dark:text-white">Description</th>
                    <th className="pb-4 pr-4 text-sm font-semibold text-gray-900 dark:text-white">Features</th>
                    <th className="pb-4 text-sm font-semibold text-gray-900 dark:text-white">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(plans).map(([key, plan]) => (
                    <tr key={key} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <td className="py-4 pr-4">
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getPlanBadgeColor(plan.planName)}`}>
                            {plan.planName}
                          </span>
                          {currentPlan?.planName === plan.planName && (
                            <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                              (Active)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 pr-4">
                        <span className="text-lg font-bold text-gray-900 dark:text-white">
                          {plan.smsCost} UGX
                        </span>
                      </td>
                      <td className="py-4 pr-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400 max-w-xs">
                          {plan.description}
                        </p>
                      </td>
                      <td className="py-4 pr-4">
                        <ul className="space-y-1">
                          {plan.features.map((feature, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                              <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td className="py-4">
                        <button
                          onClick={() => handleSelectPlan(plan)}
                          disabled={currentPlan?.planName === plan.planName}
                          className={`px-4 py-2 rounded-lg text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                            currentPlan?.planName === plan.planName
                              ? "bg-gray-400 dark:bg-gray-600"
                              : getPlanButtonColor(plan.planName)
                          }`}
                        >
                          {currentPlan?.planName === plan.planName ? "Current" : "Select Plan"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </ComponentCard>

      {/* Payment Modal */}
      <Modal isOpen={isOpen} onClose={closeModal} title={`Subscribe to ${selectedPlan?.planName} Plan`}>
        {selectedPlan && (
          <div className="space-y-4">
            {/* Plan Details */}
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-600 dark:text-gray-400">Selected Plan</span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getPlanBadgeColor(selectedPlan.planName)}`}>
                  {selectedPlan.planName}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">SMS Cost</span>
                <span className="text-lg font-bold text-gray-900 dark:text-white">
                  {selectedPlan.smsCost} UGX per SMS
                </span>
              </div>
            </div>

            {/* Package Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-3">
                Select SMS Package Range
              </label>
              <div className="grid grid-cols-1 gap-3">
                {PACKAGE_RANGES.map((packageRange, idx) => (
                  <button
                    key={idx}
                    onClick={() => handlePackageSelect(packageRange)}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      selectedPackage?.label === packageRange.label
                        ? "border-primary bg-primary/10 dark:bg-primary/20"
                        : "border-gray-200 dark:border-gray-600 hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-semibold text-base text-gray-900 dark:text-white mb-1">
                          {packageRange.label}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Cost: {(parseFloat(selectedPlan.smsCost) * (packageRange.max || packageRange.min)).toLocaleString()} UGX
                        </div>
                      </div>
                      {selectedPackage?.label === packageRange.label && (
                        <svg className="w-6 h-6 text-primary flex-shrink-0 ml-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </button>
                ))}

                {/* Custom Range Button */}
                <button
                  onClick={handleCustomRangeSelect}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    isCustomRange
                      ? "border-primary bg-primary/10 dark:bg-primary/20"
                      : "border-gray-200 dark:border-gray-600 hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-semibold text-base text-gray-900 dark:text-white mb-1">
                        Custom Range
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Enter your own SMS count
                      </div>
                    </div>
                    {isCustomRange && (
                      <svg className="w-6 h-6 text-primary flex-shrink-0 ml-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </button>

                {/* Custom Range Input */}
                {isCustomRange && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
                    <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                      Enter SMS Count
                    </label>
                    <input
                      type="number"
                      value={customSmsCount}
                      onChange={(e) => setCustomSmsCount(e.target.value)}
                      placeholder="e.g., 2500"
                      min="1"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                    {customSmsCount && parseInt(customSmsCount) > 0 && (
                      <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        Cost: <span className="font-semibold text-gray-900 dark:text-white">
                          {(parseFloat(selectedPlan.smsCost) * parseInt(customSmsCount)).toLocaleString()} UGX
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Total Cost */}
            {(selectedPackage || (isCustomRange && customSmsCount && parseInt(customSmsCount) > 0)) && (
              <div className="p-4 bg-gradient-to-r from-primary/10 to-purple-100/50 dark:from-primary/20 dark:to-purple-900/30 rounded-lg border border-primary/30">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">Total Cost</span>
                  <span className="text-2xl font-bold text-primary">
                    {calculateTotalCost().toLocaleString()} UGX
                  </span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                  {selectedPackage ? `For ${selectedPackage.label}` : `For ${parseInt(customSmsCount).toLocaleString()} SMS`}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={closeModal}
                disabled={isChangingPlan}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <Button
                onClick={handleProceedToPayment}
                disabled={(!selectedPackage && !isCustomRange) || (isCustomRange && (!customSmsCount || parseInt(customSmsCount) <= 0))}
                className="flex-1 px-4 py-2 bg-primary hover:bg-primary-dark rounded-lg text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                Proceed to Payment
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Payment Confirmation Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900">
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Confirm Payment
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Review your subscription details
              </p>
            </div>

            <div className="space-y-4">
              {/* Payment Summary */}
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Plan</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{selectedPlan?.planName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">SMS Package</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {isCustomRange ? `${parseInt(customSmsCount).toLocaleString()} SMS` : selectedPackage?.label}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Rate per SMS</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{selectedPlan?.smsCost} UGX</span>
                </div>
                <div className="pt-3 border-t border-gray-200 dark:border-gray-700 flex justify-between">
                  <span className="text-base font-semibold text-gray-900 dark:text-white">Total Amount</span>
                  <span className="text-xl font-bold text-primary">{calculateTotalCost().toLocaleString()} UGX</span>
                </div>
              </div>

              {/* Phone Number Display */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  {phoneNumber ? (
                    <span className="text-gray-700 dark:text-gray-300">
                      {identityName ? `${identityName} - ` : ''}{maskNumber(phoneNumber)}
                    </span>
                  ) : (
                    <span className="text-gray-500 dark:text-gray-400">No phone number added</span>
                  )}
                  <button
                    onClick={() => setShowNumberModal(true)}
                    className="ml-auto text-blue-600 dark:text-blue-400 hover:underline text-xs"
                  >
                    {phoneNumber ? 'Change' : 'Add Number'}
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPaymentModal(false);
                    openModal();
                  }}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleInitiatePayment}
                  disabled={!phoneNumber || isProcessingPayment}
                  className="flex-1"
                >
                  {isProcessingPayment ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Pay Now'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OTP Modal */}
      {showOTPModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-full bg-brand-100 p-2 dark:bg-brand-900/20">
                <Shield className="h-5 w-5 text-brand-600 dark:text-brand-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Approve Payment
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Check your phone {phoneNumber ? `(${maskNumber(phoneNumber)})` : ''} to approve the payment
                </p>
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-4 text-center">
                <Loader2 className="mx-auto h-12 w-12 animate-spin text-brand-600 dark:text-brand-400" />
                <p className="mt-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Waiting for payment approval...
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  This may take a few moments
                </p>
                {transactionUuid && (
                  <p className="mt-2 text-xs text-gray-400 dark:text-gray-500 font-mono">
                    Ref: {transactionUuid.slice(0, 8)}...
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={resetPaymentModals} className="flex-1" disabled={isProcessingPayment}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Change Number Modal */}
      {showNumberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {phoneNumber ? 'Change Phone Number' : 'Add Phone Number'}
              </h3>
              <button
                onClick={() => setShowNumberModal(false)}
                className="rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-white/10"
              >
                <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <Label>Phone Number</Label>
                <Input
                  type="tel"
                  placeholder="e.g. 256712345678"
                  value={phoneNumber}
                  onChange={(e) => {
                    setPhoneNumber(e.target.value.replace(/[^\d+]/g, ''));
                    setIdentityName('');
                  }}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Use your active number. Format: countrycode + number (e.g., 2567xxxxxxx)</p>
                {identityName && (
                  <p className="mt-2 text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                    <CheckCircle className="h-4 w-4" />
                    Account holder: {identityName}
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowNumberModal(false)} className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    if (phoneNumber && phoneNumber.replace(/\D/g, '').length >= 9) {
                      const isValid = await validatePhoneNumber(phoneNumber);
                      if (isValid) {
                        setShowNumberModal(false);
                      }
                    }
                  }}
                  disabled={!phoneNumber || phoneNumber.replace(/\D/g, '').length < 9 || isValidatingNumber}
                  className="flex-1"
                >
                  {isValidatingNumber ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Validating...
                    </>
                  ) : (
                    'Verify & Save'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Subscribptions;
