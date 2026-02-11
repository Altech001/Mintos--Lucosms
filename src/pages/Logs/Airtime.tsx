import { useState } from 'react';
import {
    Phone,
    History,
    CheckCircle2,
    TrendingUp,
    Smartphone,
    Zap,
    Plus,
    RefreshCw,
    Clock,
    ArrowUpRight,
    Search
} from 'lucide-react';
import Button from '../../components/ui/button/Button';
import Input from '../../components/form/input/InputField';

// Demo Transaction Data
const DEMO_TRANSACTIONS = [
    { id: 'TXN001', phone: '256 701 123456', amount: 5000, profit: 100, date: '10 FEBRUARY 2026', status: 'COMPLETED' },
    { id: 'TXN002', phone: '256 772 987654', amount: 10000, profit: 200, date: '09 FEBRUARY 2026', status: 'COMPLETED' },
    { id: 'TXN003', phone: '256 750 456789', amount: 2000, profit: 40, date: '08 FEBRUARY 2026', status: 'COMPLETED' },
    { id: 'TXN004', phone: '256 788 111222', amount: 50000, profit: 1000, date: '07 FEBRUARY 2026', status: 'COMPLETED' },
];

const AIRTIME_RANGES = [500, 1000, 2000, 5000, 10000, 20000, 50000, 100000];

const Airtime = () => {
    const [activeTab, setActiveTab] = useState<'recharge' | 'history'>('recharge');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [selectedRange, setSelectedRange] = useState<number | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [lastTransaction, setLastTransaction] = useState<{ phoneNumber: string, amount: number, profit: number } | null>(null);

    // Calculate profit (2%)
    const calculateProfit = (amount: number) => amount * 0.02;

    const handleRecharge = () => {
        if (!phoneNumber || !selectedRange) return;
        setIsProcessing(true);
        // Simulate API call
        setTimeout(() => {
            setIsProcessing(false);
            setLastTransaction({
                phoneNumber,
                amount: selectedRange,
                profit: calculateProfit(selectedRange)
            });
            setActiveTab('history');
            // Reset form but keep lastTransaction for success state in history
            setPhoneNumber('');
            setSelectedRange(null);
        }, 1500);
    };

    const SidebarItem = ({ id, label, icon: Icon }: { id: string, label: string, icon: any }) => (
        <button
            onClick={() => {
                setActiveTab(id as any);
                if (id === 'recharge') setLastTransaction(null);
            }}
            className={`w-full flex items-center gap-3 px-6 py-4 transition-all duration-200 border-l-2 ${activeTab === id
                ? 'bg-brand-50/50 border-brand-500 text-brand-600'
                : 'border-transparent text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
        >
            <Icon className={`w-4 h-4 ${activeTab === id ? 'text-brand-500' : 'text-gray-400'}`} />
            <span className={`text-[11px] font-bold uppercase tracking-wide ${activeTab === id ? 'text-brand-600' : 'text-gray-600 dark:text-gray-400'}`}>
                {label}
            </span>
        </button>
    );

    return (
        <div className="max-w-[1600px] mx-auto p-4 sm:p-8">
            {/* Page Header */}
            <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Airtime Services</h1>
                    <p className="text-sm text-gray-400 dark:text-gray-400 mt-1 text-[10px] font-bold uppercase">Services / Utility / Airtime Recharge</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                        <p className="text-[9px] font-bold text-gray-400 uppercase">Current Balance</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">UGX 1,240,500</p>
                    </div>
                    <div className="w-px h-8 bg-gray-100 dark:bg-gray-800 mx-2 hidden sm:block"></div>
                    <Button
                        variant="outline"
                        size="sm"
                        startIcon={<RefreshCw className="w-3.5 h-3.5" />}
                        className="text-[10px] font-bold uppercase"
                    >
                        Sync Data
                    </Button>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8 items-start">
                {/* Navigation Sidebar */}
                <div className="w-full lg:w-64 flex-shrink-0 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 py-4">
                    <SidebarItem id="recharge" label="New Recharge" icon={Plus} />
                    <SidebarItem id="history" label="Transaction Wizard" icon={History} />

                    <div className="mt-8 px-6">
                        <div className="h-px bg-gray-100 dark:bg-gray-800 mb-6"></div>
                        <div className="bg-brand-50/30 dark:bg-brand-500/5 p-4 rounded border border-brand-100 dark:border-brand-900/20">
                            <p className="text-[9px] font-bold text-brand-600 uppercase mb-1">Total Profit</p>
                            <p className="text-lg font-bold text-brand-700 dark:text-brand-400">UGX 45,800</p>
                            <div className="flex items-center gap-1 mt-2 text-[9px] font-bold text-success-600">
                                <TrendingUp className="w-3 h-3" />
                                +12% THIS MONTH
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 w-full">
                    {activeTab === 'recharge' ? (
                        <div className="space-y-8 animate-in fade-in duration-500">
                            {/* Main Recharge Form */}
                            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-8">
                                <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase mb-8 pb-4 border-b border-gray-50 dark:border-gray-800">Configure Transaction</h2>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                    <div className="space-y-8">
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Subscriber Number</label>
                                            <div className="relative">
                                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                <Input
                                                    placeholder="e.g. 256 701 000000"
                                                    className="pl-10 font-mono"
                                                    value={phoneNumber}
                                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                                />
                                            </div>
                                            <p className="mt-2 text-[9px] text-gray-400 font-bold uppercase">Supported: MTN, Airtel, Lyca</p>
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-4">Select Recharge Value (UGX)</label>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                {AIRTIME_RANGES.map((amount) => (
                                                    <button
                                                        key={amount}
                                                        onClick={() => setSelectedRange(amount)}
                                                        className={`py-3 text-xs font-bold transition-all border ${selectedRange === amount
                                                            ? 'border-brand-500 bg-brand-50/50 text-brand-600 dark:bg-brand-500/10'
                                                            : 'border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50'
                                                            }`}
                                                    >
                                                        {amount.toLocaleString()}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-gray-25 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 p-8">
                                        <h3 className="text-[10px] font-bold text-gray-400 uppercase mb-6 tracking-wider">Transaction Summary</h3>

                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] font-bold text-gray-500 uppercase">Principal Amount</span>
                                                <span className="text-xs font-bold text-gray-900 dark:text-white">UGX {selectedRange?.toLocaleString() || '0'}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-brand-600">
                                                <span className="text-[10px] font-bold uppercase">Expected Profit (2%)</span>
                                                <span className="text-xs font-bold">+ UGX {calculateProfit(selectedRange || 0).toLocaleString()}</span>
                                            </div>
                                            <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                                                <span className="text-[10px] font-bold text-gray-900 dark:text-white uppercase">Net Cost</span>
                                                <span className="text-lg font-bold text-gray-900 dark:text-white">UGX {selectedRange?.toLocaleString() || '0'}</span>
                                            </div>
                                        </div>

                                        <Button
                                            onClick={handleRecharge}
                                            className="w-full mt-8 py-4 text-[10px] font-bold uppercase tracking-widest"
                                            disabled={!phoneNumber || !selectedRange || isProcessing}
                                            isLoading={isProcessing}
                                        >
                                            Authorize Recharge
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* Security & Info */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {[
                                    { label: 'Security', value: 'Double Encryption', icon: Zap },
                                    { label: 'Latency', value: 'Instant Delivery', icon: Clock },
                                    { label: 'Revenue', value: '2% Guaranteed', icon: TrendingUp },
                                ].map((item, i) => (
                                    <div key={i} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-4 flex items-center gap-4">
                                        <div className="w-10 h-10 bg-gray-50 dark:bg-gray-800 flex items-center justify-center border border-gray-100 dark:border-gray-700">
                                            <item.icon className="w-4 h-4 text-gray-400" />
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-bold text-gray-400 uppercase">{item.label}</p>
                                            <p className="text-xs font-bold text-gray-900 dark:text-white uppercase">{item.value}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        /* Transaction Wizard View */
                        <div className="space-y-8 animate-in fade-in duration-500">
                            {lastTransaction && (
                                <div className="bg-success-50 dark:bg-success-500/5 border border-success-100 dark:border-success-900/20 p-8 flex items-center justify-between">
                                    <div className="flex items-center gap-6">
                                        <div className="w-12 h-12 bg-success-500 text-white flex items-center justify-center">
                                            <CheckCircle2 className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-xs font-bold text-success-900 dark:text-success-400 uppercase mb-1">Transaction Successful</h3>
                                            <p className="text-[11px] text-success-700 dark:text-success-500/80 font-bold uppercase">UGX {lastTransaction.amount.toLocaleString()} Processed for {lastTransaction.phoneNumber}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[9px] font-bold text-success-600 uppercase">Profit Earned</p>
                                        <p className="text-lg font-bold text-success-700 dark:text-success-400">UGX {lastTransaction.profit.toLocaleString()}</p>
                                    </div>
                                </div>
                            )}

                            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                                <div className="p-8 pb-4 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between">
                                    <h2 className="text-xs font-bold text-gray-900 dark:text-white uppercase">Service History Logs</h2>
                                    <div className="flex items-center gap-4">
                                        <Search className="w-4 h-4 text-gray-300" />
                                        <div className="w-px h-4 bg-gray-100 dark:bg-gray-800"></div>
                                        <span className="text-[10px] font-bold text-gray-400 uppercase">All Networks</span>
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="bg-gray-25 dark:bg-gray-800/50 border-b border-gray-50 dark:border-gray-800">
                                                <th className="px-8 py-4 text-left text-[10px] font-bold text-gray-400 uppercase">Ref ID</th>
                                                <th className="px-8 py-4 text-left text-[10px] font-bold text-gray-400 uppercase">Identity</th>
                                                <th className="px-8 py-4 text-left text-[10px] font-bold text-gray-400 uppercase">Value</th>
                                                <th className="px-8 py-4 text-left text-[10px] font-bold text-gray-400 uppercase">Net Profit</th>
                                                <th className="px-8 py-4 text-left text-[10px] font-bold text-gray-400 uppercase">Timestamp</th>
                                                <th className="px-8 py-4 text-right text-[10px] font-bold text-gray-400 uppercase">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                            {DEMO_TRANSACTIONS.map((txn) => (
                                                <tr key={txn.id} className="hover:bg-gray-25 dark:hover:bg-gray-800/40 transition-colors group">
                                                    <td className="px-8 py-6">
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase font-mono">{txn.id}</span>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 bg-gray-50 dark:bg-gray-800 flex items-center justify-center border border-gray-100 dark:border-gray-700">
                                                                <Smartphone className="w-3.5 h-3.5 text-gray-400" />
                                                            </div>
                                                            <span className="text-xs font-bold text-gray-900 dark:text-white uppercase">{txn.phone}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6 font-mono text-xs font-bold text-gray-900 dark:text-white">
                                                        UGX {txn.amount.toLocaleString()}
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <span className="text-[10px] font-bold text-brand-600 uppercase">+ UGX {txn.profit.toLocaleString()}</span>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase">{txn.date}</span>
                                                    </td>
                                                    <td className="px-8 py-6 text-right">
                                                        <span className="px-2 py-0.5 bg-success-50 text-success-700 dark:bg-success-500/10 text-[9px] font-bold uppercase">
                                                            {txn.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="p-8 border-t border-gray-50 dark:border-gray-800 text-center">
                                    <button className="text-[10px] font-bold text-brand-600 hover:text-brand-700 uppercase tracking-widest flex items-center gap-2 mx-auto">
                                        View Detailed Audit Trail
                                        <ArrowUpRight className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Airtime;
