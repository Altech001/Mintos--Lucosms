'use client';

import {
  AlertCircle,
  CheckCircle,
  CreditCard,
  Gift,
  Mail,
  QrCode,
  Smartphone,
  X,
  Loader2,
  Phone,
  Shield
} from 'lucide-react';
import { useState, useEffect } from 'react';
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import Input from "../../components/form/input/InputField";
import Button from "../../components/ui/button/Button";
import Alert from "../../components/ui/alert/Alert";
import Label from "../../components/form/Label";
import { useAuth } from '../../context/AuthContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AddFundsRequest } from "../../lib/api";

// ──────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────
interface SenderId {
  id: string;
  name: string;
  priceUgx: number;               // price per SMS in UGX
  isActive: boolean;
}

interface Integration {
  id: string;
  name: 'WhatsApp' | 'Email Service' | 'Payment Service';
  icon: React.ReactNode;
  description: string;
  enabled: boolean;
}

// ──────────────────────────────────────────────────────────────────────
// Dummy Data
// ──────────────────────────────────────────────────────────────────────
const senderIds: SenderId[] = [
  { id: '1', name: 'ATUpdates', priceUgx: 32, isActive: true },
  { id: '2', name: 'UG-SMS',   priceUgx: 35, isActive: false },
  { id: '3', name: 'ATTech', priceUgx: 30, isActive: false },
  { id: '4', name: 'FinTechAT', priceUgx: 29, isActive: false },
  { id: '5', name: 'LUCO-SMS', priceUgx: 45, isActive: true },
];

const initialIntegrations: Integration[] = [
  {
    id: '1',
    name: 'WhatsApp',
    icon: <Smartphone className="w-6 h-6 text-green-600" />,
    description: 'Send messages via WhatsApp Business.',
    enabled: true,
  },
  {
    id: '2',
    name: 'Email Service',
    icon: <Mail className="w-6 h-6 text-blue-600" />,
    description: 'Connect your email provider for transactional emails.',
    enabled: false,
  },
  {
    id: '3',
    name: 'Payment Service',
    icon: <CreditCard className="w-6 h-6 text-purple-600" />,
    description: 'Accept payments directly from SMS links.',
    enabled: false,
  },
];

// ──────────────────────────────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { apiClient } = useAuth();
  const queryClient = useQueryClient();
  
  const [senders, setSenders] = useState<SenderId[]>(senderIds);
  const [integrations, setIntegrations] = useState<Integration[]>(initialIntegrations);

  // Modals
  const [priceModal, setPriceModal] = useState<SenderId | null>(null);
  const [connectModal, setConnectModal] = useState<Integration | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [showAddNumber, setShowAddNumber] = useState(false);
  
  // Payment states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [showNumberModal, setShowNumberModal] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [identityName, setIdentityName] = useState('');
  const [isValidatingNumber, setIsValidatingNumber] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [transactionUuid, setTransactionUuid] = useState('');
  const [selectedSenderForPayment, setSelectedSenderForPayment] = useState<SenderId | null>(null);
  const [alert, setAlert] = useState<{ variant: 'success' | 'error' | 'warning' | 'info'; title: string; message: string } | null>(null);

  // Add funds mutation
  const addFundsMutation = useMutation({
    mutationFn: async (payload: AddFundsRequest) =>
      apiClient.api.userData.userDataAddFundsToWallet({ addFundsRequest: payload }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['wallet'] });
      await queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });

  // ──────────────────────────────────────────────────────────────────────
  // Handlers
  // ──────────────────────────────────────────────────────────────────────
  const selectSender = (sender: SenderId) => {
    if (sender.isActive) return;
    setSelectedSenderForPayment(sender);
    setShowPaymentModal(true);
  };

  const confirmSenderChange = () => {
    if (!selectedSenderForPayment) return;
    setSenders(prev =>
      prev.map(s => ({
        ...s,
        isActive: s.id === selectedSenderForPayment.id,
      }))
    );
    setPriceModal(selectedSenderForPayment);
    setShowPaymentModal(false);
    setShowOTPModal(false);
    setSelectedSenderForPayment(null);
  };

  const toggleIntegration = (id: string) => {
    setIntegrations(prev =>
      prev.map(i => (i.id === id ? { ...i, enabled: !i.enabled } : i))
    );
  };

  const openConnectModal = (integration: Integration) => {
    setConnectModal(integration);
  };

  const closeModals = () => {
    setPriceModal(null);
    setConnectModal(null);
  };

  const handleDeleteAccount = () => {
    if (deleteInput !== 'DELETE') return;
    setAlert({ 
      variant: 'success', 
      title: 'Account Deleted', 
      message: 'Your account has been successfully deleted.' 
    });
  };

  const maskNumber = (num: string) => {
    const digits = num.replace(/\D/g, '');
    if (digits.length <= 4) return digits;
    return `${digits.slice(0, 3)}***${digits.slice(-3)}`;
  };

  // Validate phone number
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

  // Calculate payment amount (difference in price)
  const calculatePaymentAmount = () => {
    if (!selectedSenderForPayment) return 0;
    const currentSender = senders.find(s => s.isActive);
    if (!currentSender) return selectedSenderForPayment.priceUgx;
    
    // Calculate based on price difference for 100 SMS as a base
    const priceDiff = Math.abs(selectedSenderForPayment.priceUgx - currentSender.priceUgx);
    return priceDiff * 100; // Base calculation on 100 SMS
  };

  // Initialize payment
  const handleInitiatePayment = async () => {
    const amount = calculatePaymentAmount();
    if (!amount || amount <= 0) {
      // If no payment needed, just change sender
      confirmSenderChange();
      return;
    }
    
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
        description: `Sender ID Change - ${selectedSenderForPayment?.name} (${selectedSenderForPayment?.priceUgx} UGX/SMS)`,
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
        
        pollPaymentStatus(uuid, amountInt, reference);
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
  const pollPaymentStatus = async (uuid: string, amount: number, reference: string) => {
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
            // Payment successful - add funds to wallet and change sender
            await addFundsMutation.mutateAsync({
              amount,
              paymentMethod: data.data.collection.provider || 'Mobile Money',
              referenceNumber: reference,
            });
            
            confirmSenderChange();
            
            setAlert({ 
              variant: 'success', 
              title: 'Payment Successful!', 
              message: `UGx ${amount.toFixed(2)} paid. Sender ID changed to ${selectedSenderForPayment?.name}.` 
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
                message: 'Payment is taking longer than expected. Please check your transaction history.' 
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
              message: 'Could not verify payment status. Please check your transaction history.' 
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
            message: 'Could not verify payment status. Please check your transaction history.' 
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
    setSelectedSenderForPayment(null);
  };

  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => setAlert(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  // ──────────────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────────────
  return (
    <div>
      <PageMeta title="Settings" description="Manage Sender IDs, Integrations & Account" />
      <PageBreadcrumb pageTitle="Settings" />

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

      <div className="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/3 xl:px-10 xl:py-12">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-8">
          Account & Services
        </h2>

        {/* ────────────────────── Sender IDs ────────────────────── */}
        <section className="mb-12">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Sender IDs
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Choose the Sender ID that will appear on your SMS. Price per SMS in <strong>UGX</strong>.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {senders.map(sender => (
              <div
                key={sender.id}
                onClick={() => selectSender(sender)}
                className={`relative cursor-pointer rounded-xl border p-5 transition-all
                  ${sender.isActive
                    ? 'border-brand-600 bg-brand-50 dark:bg-brand-900/20 shadow-sm'
                    : 'border-gray-200 bg-white dark:border-white/10 dark:bg-white/3 hover:shadow-md'
                  }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    {sender.name}
                  </h4>
                  {sender.isActive && (
                    <CheckCircle className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                  )}
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {sender.priceUgx} UGX
                  <span className="text-sm font-normal text-gray-500 dark:text-gray-400"> / SMS</span>
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ────────────────────── Integrations ────────────────────── */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Integrations
            </h3>
            <Button variant="outline" size="md" startIcon={<Gift className="w-4 h-4" />} onClick={() => setShowAddNumber(true)}>
              Promo Code
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {integrations.map(int => (
              <div
                key={int.id}
                className="relative bg-white dark:bg-white/3 rounded-xl border border-gray-200 dark:border-white/10 p-6 hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 bg-gray-100 dark:bg-white/10 rounded-lg flex items-center justify-center mb-4">
                  {int.icon}
                </div>

                <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                  {int.name}
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 line-clamp-2">
                  {int.description}
                </p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Toggle */}
                    <button
                      onClick={() => toggleIntegration(int.id)}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        int.enabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform ${
                          int.enabled ? 'translate-x-6' : ''
                        }`}
                      />
                    </button>

                    {/* Details / Connect */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openConnectModal(int)}
                      className="text-xs px-3 py-1"
                    >
                      {int.enabled ? 'Details' : 'Connect'}
                    </Button>
                  </div>

                  <span className="text-xs text-gray-500 dark:text-gray-400">● ● ●</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ────────────────────── Add Number Modal ────────────────────── */}
              {showAddNumber && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full p-6 space-y-4">
                    <div>
                                            
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
                        Promo Code / Voucher Code
                      </label>
                      <Input
                        type="text"
                        placeholder="eg. PROMO2024"
                        className="w-full"
                      />
                    </div>
                    <div className="flex justify-end gap-3">
                      <Button
                        onClick={() => {
                          setShowAddNumber(false);
                          
                        }}
                        variant="outline"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => {
                          setShowAddNumber(false);
                          
                        }}
                        variant="primary"
                      >                        
                        Done 
                      </Button>
                      
                    </div>
                  </div>
                </div>
              )}

        {/* ────────────────────── Delete Account ────────────────────── */}
        <section className="rounded-2xl border border-red-200 bg-red-50 p-6 dark:border-red-900/50 dark:bg-red-900/10">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-4">
            <AlertCircle className="w-5 h-5" />
            <h3 className="text-lg font-medium">Delete Account</h3>
          </div>
          <p className="text-sm text-red-700 dark:text-red-300 mb-4">
            This action is permanent. All data will be erased.
          </p>
          <Button
            variant="outline"
            size="md"
            onClick={() => setShowDeleteConfirm(true)}
            className="text-red-600 border-red-300 hover:bg-red-100 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
          >
            Delete My Account
          </Button>
        </section>
      </div>

      {/* ────────────────────── Price Increase Modal ────────────────────── */}
      {priceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Price Update
              </h3>
              <Button variant="primary" size="sm" onClick={closeModals}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-4">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                From <strong>32 UGX</strong> to <strong>{priceModal.priceUgx} UGX</strong> per SMS
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                Effective immediately
              </p>
            </div>

            <Button variant="primary" size="md" onClick={closeModals} className="w-full">
              Got it
            </Button>
          </div>
        </div>
      )}

      {/* ────────────────────── Integration Connect Modal ────────────────────── */}
      {connectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Connect {connectModal.name}
              </h3>
              <Button variant="outline" size="sm" onClick={closeModals} className='rounded-full'>
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* WhatsApp QR Code */}
            {connectModal.name === 'WhatsApp' && (
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-48 h-48 bg-gray-100 dark:bg-white/10 rounded-xl mb-4">
                  <QrCode className="w-32 h-32 text-gray-600 dark:text-gray-400" />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                  Scan this QR code with your WhatsApp app to connect.
                </p>
                <Button variant="primary" size="md" className="w-full">
                  Connected
                </Button>
              </div>
            )}

            {/* Email / Payment – simple connect */}
            {(connectModal.name === 'Email Service' || connectModal.name === 'Payment Service') && (
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
                  Click below to authorize {connectModal.name}.
                </p>
                <Button variant="primary" size="md" className="w-full">
                  Connect {connectModal.name}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ────────────────────── Payment Confirmation Modal ────────────────────── */}
      {showPaymentModal && selectedSenderForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900">
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Change Sender ID
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Review the changes and payment details
              </p>
            </div>

            <div className="space-y-4">
              {/* Sender Change Summary */}
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Current Sender</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {senders.find(s => s.isActive)?.name || 'None'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">New Sender</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {selectedSenderForPayment.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">New Rate</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {selectedSenderForPayment.priceUgx} UGX/SMS
                  </span>
                </div>
                <div className="pt-3 border-t border-gray-200 dark:border-gray-700 flex justify-between">
                  <span className="text-base font-semibold text-gray-900 dark:text-white">Payment Amount</span>
                  <span className="text-xl font-bold text-primary">
                    {calculatePaymentAmount().toLocaleString()} UGX
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  One-time setup fee based on 100 SMS
                </p>
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
                  onClick={resetPaymentModals}
                  className="flex-1"
                >
                  Cancel
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
                    'Pay & Change'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────── OTP Modal ────────────────────── */}
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

      {/* ────────────────────── Add/Change Number Modal ────────────────────── */}
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
                <X className="h-5 w-5 text-gray-500" />
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

      {/* ────────────────────── Delete Account Confirm ────────────────────── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Confirm Account Deletion
              </h3>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteInput('');
                }}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Type <strong>DELETE</strong> to confirm.
            </p>
            <Input
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              placeholder="DELETE"
              className="mb-4"
            />
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                size="md"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteInput('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleDeleteAccount}
                disabled={deleteInput !== 'DELETE'}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Delete Account
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}