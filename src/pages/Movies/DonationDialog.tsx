import React, { useState, useEffect, useRef, useCallback } from 'react';
import Modal from '@/components/ui/modal/Modal';
import Button from '@/components/ui/button/Button';
import Input from '@/components/form/input/InputField';
import {
    Heart,
    Phone,
    CreditCard,
    Loader2,
    CheckCircle2,
    XCircle,
    Clock,
    Send,
    ArrowRight,
    Smartphone,
    AlertCircle,
} from 'lucide-react';
import { moviesApi, TransactionStatusResponse } from '@/context/movies_api';

// ─── LocalStorage helpers ────────────────────────────────────────────────
const STORAGE_KEY = 'mintos_pending_donations';

interface PendingDonation {
    transaction_uuid: string;
    amount: number;
    phone_number: string;
    created_at: string;
    status: string;
}

function getPendingDonations(): PendingDonation[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function savePendingDonation(donation: PendingDonation) {
    const existing = getPendingDonations();
    const updated = [...existing.filter(d => d.transaction_uuid !== donation.transaction_uuid), donation];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

function removePendingDonation(uuid: string) {
    const existing = getPendingDonations();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing.filter(d => d.transaction_uuid !== uuid)));
}

function updatePendingDonationStatus(uuid: string, status: string) {
    const existing = getPendingDonations();
    const updated = existing.map(d => d.transaction_uuid === uuid ? { ...d, status } : d);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

// ─── Timeline Step ───────────────────────────────────────────────────────
type StepStatus = 'pending' | 'active' | 'completed' | 'failed';

interface TimelineStepProps {
    icon: React.ReactNode;
    title: string;
    subtitle: string;
    status: StepStatus;
    isLast?: boolean;
}

const TimelineStep: React.FC<TimelineStepProps> = ({ icon, title, subtitle, status, isLast }) => {
    const getNodeStyles = () => {
        switch (status) {
            case 'completed':
                return 'bg-green-500 border-green-500 text-white shadow-green-500/30 shadow-lg';
            case 'active':
                return 'bg-brand-500 border-brand-500 text-white shadow-brand-500/30 shadow-lg animate-pulse';
            case 'failed':
                return 'bg-red-500 border-red-500 text-white shadow-red-500/30 shadow-lg';
            default:
                return 'bg-gray-200 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-400';
        }
    };

    const getLineStyles = () => {
        if (status === 'completed') return 'bg-green-500';
        if (status === 'failed') return 'bg-red-500';
        return 'bg-gray-200 dark:bg-gray-800';
    };

    const getTextStyles = () => {
        if (status === 'active') return 'text-white';
        if (status === 'completed') return 'text-green-400';
        if (status === 'failed') return 'text-red-400';
        return 'text-gray-500';
    };

    return (
        <div className="flex items-start gap-4 relative">
            {/* Node */}
            <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-500 ${getNodeStyles()}`}>
                    {status === 'completed' ? <CheckCircle2 size={18} /> :
                        status === 'failed' ? <XCircle size={18} /> :
                            status === 'active' ? <Loader2 size={18} className="animate-spin" /> :
                                icon}
                </div>
                {/* Connector Line */}
                {!isLast && (
                    <div className={`w-0.5 h-12 transition-all duration-500 ${getLineStyles()}`} />
                )}
            </div>

            {/* Content */}
            <div className="flex flex-col gap-0.5 pt-2">
                <span className={`text-xs font-bold uppercase tracking-widest transition-colors ${getTextStyles()}`}>
                    {title}
                </span>
                <span className="text-[10px] text-gray-500 font-medium">
                    {subtitle}
                </span>
            </div>
        </div>
    );
};

// ─── Donation Flow Stages ────────────────────────────────────────────────
type DonationStage = 'form' | 'initiating' | 'processing' | 'completed' | 'failed' | 'background';

// ─── Predefined Amounts ──────────────────────────────────────────────────
const PRESET_AMOUNTS = [500, 1000, 2000, 5000, 10000];

// ─── Main Component ──────────────────────────────────────────────────────
interface DonationDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

const DonationDialog: React.FC<DonationDialogProps> = ({ isOpen, onClose }) => {
    const [stage, setStage] = useState<DonationStage>('form');
    const [amount, setAmount] = useState<number>(1000);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [transactionUuid, setTransactionUuid] = useState('');
    const [error, setError] = useState('');
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [statusMessage, setStatusMessage] = useState('');
    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const startTimeRef = useRef<number>(0);

    // Check for pending donations on mount
    useEffect(() => {
        if (isOpen) {
            const pending = getPendingDonations();
            const activePending = pending.find(d => d.status === 'processing' || d.status === 'background');
            if (activePending) {
                setTransactionUuid(activePending.transaction_uuid);
                setAmount(activePending.amount);
                setPhoneNumber(activePending.phone_number);
                setStage('processing');
                setStatusMessage('Resuming payment check from previous session...');
                startPolling(activePending.transaction_uuid);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (pollingRef.current) clearInterval(pollingRef.current);
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    const resetDialog = () => {
        setStage('form');
        setAmount(1000);
        setPhoneNumber('');
        setTransactionUuid('');
        setError('');
        setElapsedSeconds(0);
        setStatusMessage('');
        if (pollingRef.current) clearInterval(pollingRef.current);
        if (timerRef.current) clearInterval(timerRef.current);
    };

    const handleClose = () => {
        if (stage === 'processing') {
            // Move to background tracking
            if (transactionUuid) {
                savePendingDonation({
                    transaction_uuid: transactionUuid,
                    amount,
                    phone_number: phoneNumber,
                    created_at: new Date().toISOString(),
                    status: 'background',
                });
                updatePendingDonationStatus(transactionUuid, 'background');
            }
        }
        if (pollingRef.current) clearInterval(pollingRef.current);
        if (timerRef.current) clearInterval(timerRef.current);
        resetDialog();
        onClose();
    };

    const startElapsedTimer = () => {
        startTimeRef.current = Date.now();
        setElapsedSeconds(0);
        timerRef.current = setInterval(() => {
            setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }, 1000);
    };

    const startPolling = useCallback((uuid: string) => {
        if (pollingRef.current) clearInterval(pollingRef.current);

        let pollCount = 0;
        const MAX_POLLS = 12; // 12 x 5s = 60 seconds

        pollingRef.current = setInterval(async () => {
            pollCount++;

            try {
                const result: TransactionStatusResponse = await moviesApi.checkTransactionStatus(uuid);
                const status = result.status?.toLowerCase();

                if (status === 'success' || status === 'completed') {
                    setStage('completed');
                    setStatusMessage('Payment completed successfully! Thank you for your support. 🎉');
                    removePendingDonation(uuid);
                    if (pollingRef.current) clearInterval(pollingRef.current);
                    if (timerRef.current) clearInterval(timerRef.current);
                    return;
                }

                if (status === 'failed') {
                    setStage('failed');
                    setStatusMessage('Payment failed. Please try again or use a different number.');
                    removePendingDonation(uuid);
                    if (pollingRef.current) clearInterval(pollingRef.current);
                    if (timerRef.current) clearInterval(timerRef.current);
                    return;
                }

                // Still processing
                if (pollCount >= MAX_POLLS) {
                    // After 1 minute, move to background
                    setStage('background');
                    setStatusMessage('Payment is still processing. We\'ll keep checking in the background.');
                    savePendingDonation({
                        transaction_uuid: uuid,
                        amount,
                        phone_number: phoneNumber,
                        created_at: new Date().toISOString(),
                        status: 'background',
                    });
                    if (pollingRef.current) clearInterval(pollingRef.current);
                    if (timerRef.current) clearInterval(timerRef.current);

                    // Start a slower background poll
                    pollingRef.current = setInterval(async () => {
                        try {
                            const bgResult = await moviesApi.checkTransactionStatus(uuid);
                            const bgStatus = bgResult.status?.toLowerCase();
                            if (bgStatus === 'success' || bgStatus === 'completed') {
                                setStage('completed');
                                setStatusMessage('Payment completed successfully! Thank you! 🎉');
                                removePendingDonation(uuid);
                                if (pollingRef.current) clearInterval(pollingRef.current);
                            } else if (bgStatus === 'failed') {
                                setStage('failed');
                                setStatusMessage('Payment failed. Please try again.');
                                removePendingDonation(uuid);
                                if (pollingRef.current) clearInterval(pollingRef.current);
                            }
                        } catch {
                            // Silently continue
                        }
                    }, 15000); // check every 15 seconds in background
                }
            } catch {
                // Network error during polling — continue
            }
        }, 5000); // check every 5 seconds
    }, [amount, phoneNumber]);

    // Format any phone input to +256XXXXXXXXX
    const formatToUgandaPhone = (raw: string): string => {
        // Strip spaces, dashes, and parentheses
        let digits = raw.replace(/[\s\-()]/g, '');

        // Remove leading + if present
        if (digits.startsWith('+')) digits = digits.slice(1);

        // 0700000000 → 256700000000
        if (digits.startsWith('0') && digits.length === 10) {
            digits = '256' + digits.slice(1);
        }

        // 700000000 (9 digits, starts with 7) → 256700000000
        if (digits.length === 9 && digits.startsWith('7')) {
            digits = '256' + digits;
        }

        return '+' + digits;
    };

    const handleDonate = async () => {
        // Format the number
        const formattedPhone = formatToUgandaPhone(phoneNumber);

        // Validate: must be +256 followed by 9 digits = 13 chars total
        if (!phoneNumber || formattedPhone.length !== 13 || !formattedPhone.startsWith('+256')) {
            setError('Please enter a valid Ugandan phone number (e.g. 0700000000 or +256700000000)');
            return;
        }
        if (amount < 500) {
            setError('Minimum donation amount is 500 UGX');
            return;
        }

        setError('');
        setStage('initiating');
        setStatusMessage('Sending payment request to your phone...');
        startElapsedTimer();

        try {
            const donationName = `DONATION AMOUNT ${amount}UGX`;
            const result = await moviesApi.donate(donationName, amount, formattedPhone);

            if (result.status === 'success' && result.donation) {
                const uuid = result.donation.transaction_uuid;
                setTransactionUuid(uuid);
                setStage('processing');
                setStatusMessage('Payment prompt sent! Check your phone and enter your PIN.');

                // Save to localStorage for background tracking
                savePendingDonation({
                    transaction_uuid: uuid,
                    amount,
                    phone_number: formattedPhone,
                    created_at: result.donation.created_at,
                    status: 'processing',
                });

                // Start polling for status
                startPolling(uuid);
            } else {
                setStage('failed');
                setStatusMessage('Failed to initiate payment. Please try again.');
            }
        } catch (err: any) {
            setStage('failed');
            setStatusMessage(err?.message || 'An error occurred while initiating payment.');
        }
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const getTimelineSteps = (): { icon: React.ReactNode; title: string; subtitle: string; status: StepStatus }[] => {
        const steps: { icon: React.ReactNode; title: string; subtitle: string; status: StepStatus }[] = [];

        // Step 1: Payment Initiated
        steps.push({
            icon: <Send size={16} />,
            title: 'Payment Initiated',
            subtitle: stage === 'form' ? 'Waiting for you to submit...' :
                stage === 'initiating' ? 'Sending request to server...' :
                    'Request sent successfully',
            status: stage === 'form' ? 'pending' :
                stage === 'initiating' ? 'active' : 'completed',
        });

        // Step 2: Phone Prompt
        steps.push({
            icon: <Smartphone size={16} />,
            title: 'Phone Prompt',
            subtitle: stage === 'form' || stage === 'initiating' ? 'Waiting...' :
                stage === 'processing' ? 'Approve the payment on your phone' :
                    stage === 'background' ? 'Checking in background...' :
                        stage === 'completed' ? 'Payment approved' :
                            'Payment was not approved',
            status: stage === 'form' || stage === 'initiating' ? 'pending' :
                stage === 'processing' || stage === 'background' ? 'active' :
                    stage === 'completed' ? 'completed' : 'failed',
        });

        // Step 3: Payment Completed
        steps.push({
            icon: <CheckCircle2 size={16} />,
            title: stage === 'failed' ? 'Payment Failed' : 'Payment Complete',
            subtitle: stage === 'completed' ? 'Thank you for supporting Mintos! 🎉' :
                stage === 'failed' ? 'Something went wrong' :
                    'Waiting for confirmation...',
            status: stage === 'completed' ? 'completed' :
                stage === 'failed' ? 'failed' : 'pending',
        });

        return steps;
    };

    const isInProgress = stage === 'initiating' || stage === 'processing' || stage === 'background';

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="🤍 Donate & Support Mintos"
        >
            <div className="flex flex-col gap-6">
                {/* Stage: Form */}
                {stage === 'form' && (
                    <div className="flex flex-col gap-5 animate-in fade-in duration-300">
                        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                            Help us keep Mintos running. Every donation goes towards server costs and new content. Payments are processed via <strong className="text-brand-500">Mobile Money</strong>.
                        </p>

                        {/* Preset Amounts */}
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                                Select Amount (UGX)
                            </label>
                            <div className="grid grid-cols-5 gap-2">
                                {PRESET_AMOUNTS.map((preset) => (
                                    <button
                                        key={preset}
                                        onClick={() => setAmount(preset)}
                                        className={`py-2.5 text-xs font-bold tracking-wider transition-all border
                                            ${amount === preset
                                                ? 'bg-brand-500 text-white border-brand-500 shadow-lg shadow-brand-500/20'
                                                : 'bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-brand-500 hover:text-brand-500'
                                            }`}
                                    >
                                        {preset >= 1000 ? `${preset / 1000}K` : preset}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Custom Amount */}
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                                Or Enter Custom Amount
                            </label>
                            <div className="relative">
                                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                                <Input
                                    type="number"
                                    placeholder="Amount in UGX"
                                    value={amount || ''}
                                    onChange={(e) => setAmount(Number(e.target.value))}
                                    className="pl-10 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 rounded-none focus:ring-brand-500"
                                />
                            </div>
                        </div>

                        {/* Phone Number */}
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                                Mobile Money Number
                            </label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                                <Input
                                    type="tel"
                                    placeholder="+256 7XX XXX XXX"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    className="pl-10 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 rounded-none focus:ring-brand-500"
                                />
                            </div>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="flex items-center gap-2 text-xs text-red-500 font-medium bg-red-500/10 p-3 border border-red-500/20">
                                <AlertCircle size={14} />
                                {error}
                            </div>
                        )}

                        {/* Summary */}
                        {amount > 0 && phoneNumber && (
                            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800">
                                <div className="flex justify-between text-xs font-bold tracking-wider text-gray-500">
                                    <span>Amount</span>
                                    <span className="text-brand-500">{amount.toLocaleString()} UGX</span>
                                </div>
                                <div className="flex justify-between text-xs font-bold tracking-wider text-gray-500 mt-2">
                                    <span>Phone</span>
                                    <span className="text-brand-500">{phoneNumber}</span>
                                </div>
                            </div>
                        )}

                        {/* Submit */}
                        <Button
                            onClick={handleDonate}
                            className="w-full !py-4 !rounded-none bg-brand-500 hover:bg-brand-600 font-bold tracking-widest"
                            startIcon={<Heart size={16} />}
                        >
                            Donate {amount > 0 ? `${amount.toLocaleString()} UGX` : ''}
                        </Button>
                    </div>
                )}

                {/* Stages: In-progress / completed / failed / background */}
                {stage !== 'form' && (
                    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
                        {/* Amount Badge */}
                        <div className="flex items-center justify-center">
                            <div className={`flex items-center gap-3 px-6 py-3 border ${stage === 'completed' ? 'border-green-500/30 bg-green-500/10' :
                                stage === 'failed' ? 'border-red-500/30 bg-red-500/10' :
                                    'border-brand-500/30 bg-brand-500/10'
                                }`}>
                                <span className={`text-2xl font-black tracking-tight ${stage === 'completed' ? 'text-green-500' :
                                    stage === 'failed' ? 'text-red-500' :
                                        'text-brand-500'
                                    }`}>
                                    {amount.toLocaleString()} <span className="text-sm font-bold">UGX</span>
                                </span>
                            </div>
                        </div>

                        {/* Timeline */}
                        <div className="flex flex-col pl-2">
                            {getTimelineSteps().map((step, idx, arr) => (
                                <TimelineStep
                                    key={idx}
                                    icon={step.icon}
                                    title={step.title}
                                    subtitle={step.subtitle}
                                    status={step.status}
                                    isLast={idx === arr.length - 1}
                                />
                            ))}
                        </div>

                        {/* Status Message */}
                        <div className={`p-4 border text-sm font-medium ${stage === 'completed' ? 'border-green-500/20 bg-green-500/5 text-green-400' :
                            stage === 'failed' ? 'border-red-500/20 bg-red-500/5 text-red-400' :
                                stage === 'background' ? 'border-yellow-500/20 bg-yellow-500/5 text-yellow-400' :
                                    'border-brand-500/20 bg-brand-500/5 text-brand-400'
                            }`}>
                            {statusMessage}
                        </div>

                        {/* Timer (in-progress only) */}
                        {isInProgress && (
                            <div className="flex items-center justify-center gap-2 text-xs text-gray-500 font-medium">
                                <Clock size={12} />
                                <span>Elapsed: {formatTime(elapsedSeconds)}</span>
                                {stage === 'background' && (
                                    <span className="text-yellow-500 ml-2">• Background mode</span>
                                )}
                            </div>
                        )}

                        {/* Background notice */}
                        {stage === 'background' && (
                            <div className="flex items-start gap-3 p-4 bg-yellow-500/5 border border-yellow-500/20">
                                <AlertCircle size={16} className="text-yellow-500 shrink-0 mt-0.5" />
                                <div className="flex flex-col gap-1">
                                    <span className="text-xs font-bold text-yellow-500 uppercase tracking-wider">
                                        Processing in Background
                                    </span>
                                    <span className="text-[11px] text-gray-500">
                                        You can close this dialog. We'll keep checking the payment status and notify you when it's done.
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex flex-col gap-3">
                            {stage === 'completed' && (
                                <Button
                                    onClick={handleClose}
                                    className="w-full !py-4 !rounded-none bg-green-600 hover:bg-green-700 font-bold tracking-widest"
                                    startIcon={<CheckCircle2 size={16} />}
                                >
                                    Done — Thank You!
                                </Button>
                            )}

                            {stage === 'failed' && (
                                <div className="flex gap-3">
                                    <Button
                                        onClick={resetDialog}
                                        className="flex-1 !py-4 !rounded-none bg-brand-500 hover:bg-brand-600 font-bold tracking-widest"
                                        startIcon={<ArrowRight size={16} />}
                                    >
                                        Try Again
                                    </Button>
                                    <button
                                        onClick={handleClose}
                                        className="flex-1 py-3 text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-gray-300 border border-gray-700 hover:border-gray-600 transition-colors"
                                    >
                                        Close
                                    </button>
                                </div>
                            )}

                            {(stage === 'processing' || stage === 'background') && (
                                <button
                                    onClick={handleClose}
                                    className="w-full py-3 text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-gray-300 transition-colors"
                                >
                                    {stage === 'background' ? 'Close — Processing in Background' : 'Minimize — Continue in Background'}
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default DonationDialog;
