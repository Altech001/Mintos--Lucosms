'use client';

import { ArrowRight, BadgeCheck, CheckCircle, Clock, CreditCard, DollarSign, History, Loader2, Shield, TrendingUp, XCircle, Phone } from 'lucide-react';
import { useEffect, useState } from 'react';
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import Input from "../../components/form/input/InputField";
import Label from "../../components/form/Label";
import Alert from "../../components/ui/alert/Alert";
import Button from "../../components/ui/button/Button";
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from "@/lib/api/client";
import type { AddFundsRequest, WalletResponse } from "@/lib/api";
import { TransactionPublic } from "@/lib/api/models";
import { useAuth } from '../../context/AuthContext';

type Tab = 'topup' | 'history';


export default function AutoTopUp() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('topup');
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [showNumberModal, setShowNumberModal] = useState(false);
  const [alert, setAlert] = useState<{ variant: 'success' | 'error' | 'warning' | 'info'; title: string; message: string } | null>(null);

  const [topUpAmount, setTopUpAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [identityName, setIdentityName] = useState('');
  const [isValidatingNumber, setIsValidatingNumber] = useState(false);
  const [transactionUuid, setTransactionUuid] = useState('');
  const [paymentReference, setPaymentReference] = useState('');

  const queryClient = useQueryClient();

  // Initialize phone number from user profile
  useEffect(() => {
    if (user?.phone) {
      setPhoneNumber(user.phone);
    }
  }, [user]);

  // Wallet balance query
  const walletQuery = useQuery<WalletResponse>({
    queryKey: ['wallet'],
    queryFn: () => apiClient.api.userData.userDataGetWalletBalance(),
    staleTime: 60_000,
  });
  const balance = Number.parseFloat(walletQuery.data?.walletBalance ?? '0');

  // Add funds mutation (called after OTP verification success)
  const addFundsMutation = useMutation({
    mutationFn: async (payload: AddFundsRequest) =>
      apiClient.api.userData.userDataAddFundsToWallet({ addFundsRequest: payload }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['wallet'] });
    },
  });

  // Fetch real transactions from API
  const fetchTransactions = async (): Promise<TransactionPublic[]> => {
    const response = await apiClient.api.transactions.transactionsListMyTransactions({ skip: 0, limit: 10 });
    return response.data;
  };

  const { data: transactions = [], isLoading: isTxLoading } = useQuery({
    queryKey: ['transactions', user?.id],
    queryFn: fetchTransactions,
    staleTime: 60_000,
  });

  // Validate phone number and get identity name
  const validatePhoneNumber = async (msisdn: string): Promise<boolean> => {
    setIsValidatingNumber(true);
    try {
      // Format phone number to include + prefix if not present
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
  const handleInitiateTopUp = async () => {
    const amount = parseFloat(topUpAmount);
    if (!amount || amount <= 0) return;

    // Require phone number before proceeding
    if (!phoneNumber) {
      setAlert({ variant: 'warning', title: 'Add Phone Number', message: 'Please add your phone number to receive the payment prompt.' });
      setShowNumberModal(true);
      return;
    }

    setIsProcessing(true);

    try {
      // Generate a unique reference using UUID format
      const reference = crypto.randomUUID();
      setPaymentReference(reference);

      // Format phone number (remove + and country code for the API)
      let formattedPhone = phoneNumber.replace(/\D/g, '');
      if (formattedPhone.startsWith('256')) {
        formattedPhone = '0' + formattedPhone.substring(3);
      }

      // Ensure amount is an integer
      const amountInt = Math.round(amount);
      const serviceFee = Math.round(amountInt * 0.05);
      const totalCharge = amountInt + serviceFee;

      const payload = {
        amount: totalCharge,
        callback_url: 'https://mintospay.vercel.app/v1/pay/webhook/callback',
        country: 'UG',
        description: 'Payment for services',
        phone_number: formattedPhone,
        reference: reference,
      };

      console.log('Payment payload:', payload);

      const response = await fetch('https://mintospay.vercel.app/v1/pay/initialize', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      console.log('Payment response:', data);

      if (response.status === 201 && data.status === 'success') {
        const uuid = data.data.transaction.uuid;
        setTransactionUuid(uuid);

        setShowTopUpModal(false);
        setShowOTPModal(true);

        setAlert({
          variant: 'info',
          title: 'Payment Initiated',
          message: `Check your phone (${maskNumber(phoneNumber)}) to approve the payment.`
        });

        // Start polling for payment status
        pollPaymentStatus(uuid, amountInt);
      } else {
        // Handle validation errors (422) or other errors
        let errorMessage = 'Could not initiate payment. Please try again.';

        if (response.status === 422 && data.detail) {
          // Extract validation error details
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

        console.error('Payment initialization failed:', data);

        setAlert({
          variant: 'error',
          title: 'Payment Failed',
          message: errorMessage
        });
        setIsProcessing(false);
      }
    } catch {
      setAlert({
        variant: 'error',
        title: 'Payment Error',
        message: 'Failed to initiate payment. Please check your connection and try again.'
      });
      setIsProcessing(false);
    }
  };

  // Poll payment status using transaction UUID
  const pollPaymentStatus = async (uuid: string, amount: number) => {
    const maxAttempts = 30; // Poll for up to 5 minutes (30 * 10 seconds)
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
            // Payment successful - add funds to wallet
            await addFundsMutation.mutateAsync({
              amount,
              paymentMethod: data.data.collection.provider || 'Mobile Money',
              referenceNumber: paymentReference,
            });

            await queryClient.invalidateQueries({ queryKey: ['transactions'] });
            await queryClient.invalidateQueries({ queryKey: ['wallet'] });

            setAlert({
              variant: 'success',
              title: 'Top-Up Successful!',
              message: `UGx ${amount.toFixed(2)} added to your balance.`
            });

            setIsProcessing(false);
            setShowOTPModal(false);

            setTopUpAmount('');
            setTransactionUuid('');
            return;
          } else if (txStatus === 'failed' || txStatus === 'cancelled') {
            setAlert({
              variant: 'error',
              title: 'Payment Failed',
              message: 'Payment was declined or cancelled. Please try again.'
            });

            setIsProcessing(false);
            setShowOTPModal(false);
            setTopUpAmount('');
            setTransactionUuid('');
            return;
          } else if (txStatus === 'processing' || txStatus === 'pending') {
            // Continue polling
            attempts++;
            if (attempts < maxAttempts) {
              setTimeout(checkStatus, 10000); // Check every 10 seconds
            } else {
              setAlert({
                variant: 'warning',
                title: 'Payment Pending',
                message: 'Payment is taking longer than expected. Please check your transaction history.'
              });
              setIsProcessing(false);
              setShowOTPModal(false);
            }
          }
        } else {
          // Error fetching status, retry
          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(checkStatus, 10000);
          } else {
            setAlert({
              variant: 'error',
              title: 'Verification Error',
              message: 'Could not verify payment status. Please check your transaction history.'
            });
            setIsProcessing(false);
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
          setIsProcessing(false);
          setShowOTPModal(false);
        }
      }
    };

    // Start polling after 5 seconds (give time for payment to be initiated)
    setTimeout(checkStatus, 5000);
  };

  const resetModals = () => {
    setShowTopUpModal(false);
    setShowOTPModal(false);
    setShowNumberModal(false);
    setTopUpAmount('');
    setIsProcessing(false);
    setTransactionUuid('');
  };

  const maskNumber = (num: string) => {
    const digits = num.replace(/\D/g, '');
    if (digits.length <= 4) return digits;
    return `${digits.slice(0, 3)}***${digits.slice(-3)}`;
  };

  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => setAlert(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  return (
    <>
      <PageMeta
        title="Auto TopUp"
        description="Add Credits and View Your TopUp with Courtesy of Mintos SMS"
      />
      <PageBreadcrumb pageTitle="Auto TopUp" />

      {/* Alert Feedback */}
      {alert && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-999999 animate-slide-down ">
          <Alert
            variant={alert.variant}
            title={alert.title}
            message={alert.message}
            showLink={false}
          />
        </div>
      )}

      <div className="space-y-6">

        {/* Balance Hero Card */}
        <div className="relative overflow-hidden rounded-none bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700 p-6 text-white shadow">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-sm font-medium opacity-90">Available Balance</p>
              <p className="mt-2 text-3xl font-bold tracking-tight">
                UGx {balance.toFixed(2)}
              </p>

              <div className="mt-3 flex items-center gap-2 text-xs opacity-90">
                <Phone className="h-3.5 w-3.5" />
                {phoneNumber ? (
                  <span>
                    {identityName ? `${identityName} - ` : ''}{maskNumber(phoneNumber)}
                  </span>
                ) : (
                  <span>No phone number added</span>
                )}
              </div>
            </div>
            <div>

            </div>
            <div className="flex items-center gap-3">
              <Button variant="danger" onClick={() => setShowNumberModal(true)} className="bg-white/15 text-white border-white/30 hover:bg-white/25">
                {phoneNumber ? 'Change Number' : 'Add Number'}
              </Button>
              <div className="rounded-full p-4">
                <BadgeCheck className="h-10 w-10" />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {(['topup', 'history'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-6 py-3 text-sm font-medium transition-all ${activeTab === tab
                ? 'border-b-2 border-brand-600 text-brand-600 dark:text-brand-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
            >
              {tab === 'topup' ? (
                <span className="flex items-center justify-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Top Up
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <History className="h-4 w-4" />
                  History
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'topup' ? (
          <div className="bg-white p-6  dark:bg-white/[0.03]">
            <h3 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90">
              Quick Top-Up
            </h3>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[500, 1000, 2000, 5000].map((amt) => (
                <button
                  key={amt}
                  onClick={() => {
                    setTopUpAmount(amt.toString());
                    setShowTopUpModal(true);
                  }}
                  className="rounded-xl border border-gray-200 bg-gradient-to-t from-gray-50 to-white p-4 text-center font-semibold text-gray-700 transition-all hover:scale-105 hover:border-brand-300 hover:shadow-md dark:border-gray-700 dark:from-white/5 dark:to-white/10 dark:text-gray-200"
                >
                  UGx {amt}
                </button>
              ))}
            </div>

            <div className="m-6 flex justify-center">
              <Button
                onClick={() => setShowTopUpModal(true)}
                // size="lg"
                className="flex items-center gap-3"
              >
                <CreditCard className="h-5 w-5" />
                Custom Amount
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {isTxLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
              </div>
            ) : transactions.length === 0 ? (
              <div className="rounded border border-dashed border-gray-300 bg-gray-50 p-12 text-center dark:border-gray-700 dark:bg-white/5">
                <Clock className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-3 text-gray-500 dark:text-gray-400">No transaction history yet.</p>
              </div>
            ) : (
              transactions.map((tx, i) => (
                <div
                  key={tx.id}
                  className={`flex items-center justify-between rounded  p-4 transition-all ${tx.status === 'completed'
                    ? 'border-green-900 bg-green-900/10 dark:border-green-900/30 dark:bg-green-900/10'
                    : tx.status === 'pending'
                      ? 'border-yellow-200 bg-yellow-50/50 dark:border-yellow-900/30 dark:bg-yellow-900/10'
                      : 'border-red-200 bg-red-50/50 dark:border-red-900/30 dark:bg-red-900/10'
                    } animate-slide-up`}
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div className="flex items-center gap-3">
                    <div className={`rounded-full p-2 ${tx.status === 'completed' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' :
                      tx.status === 'pending' ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400' :
                        'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                      {tx.status === 'completed' ? <CheckCircle className="h-5 w-5" /> :
                        tx.status === 'pending' ? <Clock className="h-5 w-5" /> :
                          <XCircle className="h-5 w-5" />}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {tx.transactionType === 'credit' ? '+' : '-'}{tx.currency} {tx.amount.toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {tx.paymentMethod} • {new Date(tx.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-500 mt-0.5">
                        {tx.description}
                      </p>
                    </div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${tx.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                    tx.status === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                      'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                    }`}>
                    {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Top-Up Modal */}
      {showTopUpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-none bg-white p-6 shadow-2xl dark:bg-gray-900">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Enter Amount
              </h3>
              <button
                onClick={resetModals}
                className="rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-white/10"
              >
                <XCircle className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <Label>Top-Up Amount</Label>
                <div className="relative mt-2">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={topUpAmount}
                    onChange={(e) => setTopUpAmount(e.target.value)}
                    className="pl-10"
                    min="1"
                  // step="0.01"
                  />
                </div>
                {topUpAmount && !isNaN(parseFloat(topUpAmount)) && (
                  <div className="mt-3 space-y-2 rounded-lg bg-gray-50 p-3 text-sm dark:bg-white/5">
                    <div className="flex justify-between text-gray-600 dark:text-gray-400">
                      <span>Amount:</span>
                      <span>UGx {Math.round(parseFloat(topUpAmount)).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-gray-600 dark:text-gray-400">
                      <span>Service Fee (5%):</span>
                      <span>UGx {Math.round(Math.round(parseFloat(topUpAmount)) * 0.05).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-t border-gray-200 pt-2 font-semibold text-gray-900 dark:border-gray-700 dark:text-white">
                      <span>Total to Pay:</span>
                      <span>UGx {(Math.round(parseFloat(topUpAmount)) + Math.round(Math.round(parseFloat(topUpAmount)) * 0.05)).toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={resetModals} className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={handleInitiateTopUp}
                  disabled={!topUpAmount || parseFloat(topUpAmount) <= 0 || isProcessing}
                  className="flex-1"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending OTP...
                    </>
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
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
          <div className="w-full max-w-md rounded-none bg-white p-6 shadow-2xl dark:bg-gray-900">
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
              <div className="p-4 text-center">
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
                <Button variant="outline" onClick={resetModals} className="flex-1" disabled={isProcessing}>
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
          <div className="w-full max-w-md rounded-none bg-white p-6 shadow-2xl dark:bg-gray-900">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {phoneNumber ? 'Change Phone Number' : 'Add Phone Number'}
              </h3>
              <button
                onClick={() => setShowNumberModal(false)}
                className="rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-white/10"
              >
                <XCircle className="h-5 w-5 text-gray-500" />
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
                    setIdentityName(''); // Clear identity name when number changes
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
    </>
  );
}