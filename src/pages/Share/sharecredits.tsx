import React, { useState } from "react";
import { Send, User, CreditCard, Info, CheckCircle, AlertCircle, Wallet } from "lucide-react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import Input from "../../components/form/input/InputField";
import Label from "../../components/form/Label";
import Button from "../../components/ui/button/Button";
import Alert from "../../components/ui/alert/Alert";
import { useAuth } from "../../context/AuthContext";
import TextArea from "../../components/form/input/TextArea";
import { apiClient } from "../../lib/api/client";
import { useDebounce } from "react-haiku";

const ShareCredits: React.FC = () => {
    const { user } = useAuth();
    const [accountNumber, setAccountNumber] = useState("");
    const [amount, setAmount] = useState("");
    const [note, setNote] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

    const [recipient, setRecipient] = useState<{ email: string; fullName: string } | null>(null);
    const [isVerifying, setIsVerifying] = useState(false);
    const [verifyError, setVerifyError] = useState<string | null>(null);

    // Debounce account number to verify recipient
    const debouncedAccountNumber = useDebounce(accountNumber, 500);

    React.useEffect(() => {
        const verifyRecipient = async () => {
            if (!debouncedAccountNumber || debouncedAccountNumber.length < 3) {
                setRecipient(null);
                setVerifyError(null);
                return;
            }

            setIsVerifying(true);
            setVerifyError(null);
            try {
                const response = await apiClient.api.userData.userDataVerifyRecipient({
                    identifier: debouncedAccountNumber
                });
                setRecipient({
                    email: response.email,
                    fullName: response.full_name
                });
            } catch (error: any) {
                console.error("Verification failed:", error);
                setRecipient(null);
                setVerifyError("Recipient not found or invalid.");
            } finally {
                setIsVerifying(false);
            }
        };

        verifyRecipient();
    }, [debouncedAccountNumber]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!recipient) {
            setStatus({
                type: "error",
                message: "Please provide a valid recipient."
            });
            return;
        }

        setIsSubmitting(true);
        setStatus(null);

        try {
            await apiClient.api.userData.userDataShareCredits({
                recipientIdentifier: recipient.email,
                amount: parseFloat(amount),
                description: note
            });

            setStatus({
                type: "success",
                message: `Successfully shared ${amount} credits with ${recipient.fullName} (${recipient.email}).`,
            });
            setAccountNumber("");
            setAmount("");
            setNote("");
            setRecipient(null);
        } catch (error: any) {
            console.error("Transfer failed:", error);
            setStatus({
                type: "error",
                message: error.message || "Failed to complete the transfer. Please try again.",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <PageMeta
                title="Share Credits | LUCO MINTOS"
                description="Share your credits with other users in the LUCO MINTOS network quickly and securely."
            />
            <PageBreadcrumb pageTitle="Share Credits" />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Left Column: Transfer Form */}
                <div className="lg:col-span-2 space-y-6">
                    <ComponentCard
                        title="Transfer Credits"
                        desc="Enter the recipient's account details and the amount you wish to transfer."
                    >
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {status && (
                                <Alert
                                    variant={status.type}
                                    title={status.type === "success" ? "Transfer Complete" : "Transfer Failed"}
                                    message={status.message}
                                />
                            )}

                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="accountNumber">Recipient Email Address</Label>
                                    <div className="relative">
                                        <Input
                                            id="accountNumber"
                                            type="text"
                                            placeholder="e.g. hello@mintosms.com"
                                            value={accountNumber}
                                            onChange={(e) => setAccountNumber(e.target.value)}
                                            required
                                            className="pl-10"
                                        />
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                                    </div>
                                    <p className="mt-1.5 text-xs text-gray-500">
                                        Enter the unique account ID or registered email of the recipient.
                                    </p>

                                    {isVerifying && (
                                        <p className="mt-2 text-xs text-blue-500 animate-pulse flex items-center gap-1">
                                            <div className="size-2 bg-blue-500 rounded-full animate-ping" />
                                            Verifying recipient...
                                        </p>
                                    )}

                                    {verifyError && !isVerifying && (
                                        <p className="mt-2 text-xs text-red-500 flex items-center gap-1">
                                            <AlertCircle className="size-3" />
                                            {verifyError}
                                        </p>
                                    )}

                                    {recipient && !isVerifying && (
                                        <div className="mt-3 p-3 bg-green-50 dark:bg-green-500/10 border border-green-100 dark:border-green-500/20 rounded-lg flex items-center gap-3">
                                            <div className="size-8 rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center text-green-600 dark:text-green-400 font-bold text-sm">
                                                {recipient.fullName.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
                                                    {recipient.fullName}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    {recipient.email}
                                                </p>
                                            </div>
                                            <CheckCircle className="ml-auto size-4 text-green-500" />
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="amount">Amount to Share</Label>
                                    <div className="relative">
                                        <Input
                                            id="amount"
                                            type="number"
                                            placeholder="0.00"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            required
                                            min="1"
                                            className="pl-10"
                                        />
                                        <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                                    </div>
                                </div>

                                <div>
                                    <Label htmlFor="note">Optional Note</Label>
                                    <TextArea
                                        placeholder="Add a message for the recipient..."
                                        value={note}
                                        onChange={(val) => setNote(val)}
                                        rows={3}
                                    />
                                </div>
                            </div>

                            <div className="pt-2">
                                <Button
                                    type="submit"
                                    className="w-full sm:w-auto"
                                    isLoading={isSubmitting}
                                    disabled={!recipient || isVerifying}
                                    startIcon={!isSubmitting && <Send className="size-4" />}
                                >
                                    Confirm Transfer
                                </Button>
                            </div>
                        </form>
                    </ComponentCard>
                </div>

                {/* Right Column: Information & Summary */}
                <div className="space-y-6">
                    {/* Balance Card */}
                    <div className="relative overflow-hidden bg-brand-500 p-6 text-white">
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-sm font-medium text-brand-100">Available Balance</span>
                                <Wallet className="size-5 text-brand-200" />
                            </div>
                            <h3 className="text-3xl font-bold mb-1">
                                {user?.wallet || "0.00"}
                                <span className="text-lg font-medium ml-1">Credits</span>
                            </h3>
                            <p className="text-xs text-brand-100 opacity-80">
                                Current balance in your main wallet
                            </p>
                        </div>
                        {/* Decorative circles */}
                        <div className="absolute -right-6 -top-6 size-24 rounded-full bg-white/10 blur-2xl" />
                        <div className="absolute -bottom-8 -left-8 size-32 rounded-full bg-brand-600/50 blur-2xl" />
                    </div>

                    {/* Quick Tips Card */}
                    <ComponentCard title="Security Tips">
                        <ul className="space-y-4">
                            <li className="flex gap-3">
                                <div className="flex-shrink-0 size-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-500">
                                    <Info className="size-4" />
                                </div>
                                <div>
                                    <h5 className="text-sm font-semibold text-gray-800 dark:text-white/90">Verify Account</h5>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                        Double check the recipient's account number before confirming. Transfers are irreversible.
                                    </p>
                                </div>
                            </li>
                            <li className="flex gap-3">
                                <div className="flex-shrink-0 size-8 rounded-lg bg-green-50 dark:bg-green-500/10 flex items-center justify-center text-green-500">
                                    <CheckCircle className="size-4" />
                                </div>
                                <div>
                                    <h5 className="text-sm font-semibold text-gray-800 dark:text-white/90">Instant Delivery</h5>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                        Credits are transferred instantly to the recipient's wallet once confirmed.
                                    </p>
                                </div>
                            </li>
                            <li className="flex gap-3">
                                <div className="flex-shrink-0 size-8 rounded-lg bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-500">
                                    <AlertCircle className="size-4" />
                                </div>
                                <div>
                                    <h5 className="text-sm font-semibold text-gray-800 dark:text-white/90">Transaction History</h5>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                        You can track all your credit shares in the billing/transactions history section.
                                    </p>
                                </div>
                            </li>
                        </ul>
                    </ComponentCard>
                </div>
            </div>
        </>
    );
};

export default ShareCredits;
