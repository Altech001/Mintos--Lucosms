/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { AlertCircle, CheckCircle, Code, Copy, Key, Send, Zap, FileText, Info, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import Button from "../../components/ui/button/Button";

type DocSection = 'overview' | 'start' | 'auth' | 'endpoint' | 'examples' | 'status' | 'best';

export default function ApiDoc() {
    const [activeSection, setActiveSection] = useState<DocSection>('overview');
    const [copySuccess, setCopySuccess] = useState<string | null>(null);
    const [activeCodeTab, setActiveCodeTab] = useState<'curl' | 'javascript' | 'python' | 'php'>('curl');

    const apiEndpoint = 'https://lucomintos.onrender.com/api/v1/sms/send-api';

    const handleCopy = async (text: string, id: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopySuccess(id);
            setTimeout(() => setCopySuccess(null), 2000);
        } catch (err) {
            alert('Failed to copy');
        }
    };

    const codeExamples = {
        curl: `curl -X 'POST' \\
  '${apiEndpoint}' \\
  -H 'accept: application/json' \\
  -H 'x-api-key: YOUR_API_KEY' \\
  -H 'Content-Type: application/json' \\
  -d '{
  "to": ["+256708215305"],
  "message": "Hello from SMS API",
  "from": "YourBrand",
  "enqueue": true
}'`,
        javascript: `const sendSMS = async () => {
  const response = await fetch('${apiEndpoint}', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'x-api-key': 'YOUR_API_KEY',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      to: ['+256708215305'],
      message: 'Hello from SMS API',
      from: 'YourBrand',
      enqueue: true
    })
  });
  
  const data = await response.json();
  console.log(data);
};

sendSMS();`,
        python: `import requests
import json

url = '${apiEndpoint}'
headers = {
    'accept': 'application/json',
    'x-api-key': 'YOUR_API_KEY',
    'Content-Type': 'application/json'
}
payload = {
    'to': ['+256708215305'],
    'message': 'Hello from SMS API',
    'from': 'YourBrand',
    'enqueue': True
}

response = requests.post(url, headers=headers, data=json.dumps(payload))
print(response.json())`,
        php: `<?php
$url = '${apiEndpoint}';
$data = [
    'to' => ['+256708215305'],
    'message' => 'Hello from SMS API',
    'from' => 'YourBrand',
    'enqueue' => true
];

$options = [
    'http' => [
        'header' => "Content-Type: application/json\\r\\n" .
                    "accept: application/json\\r\\n" .
                    "x-api-key: YOUR_API_KEY\\r\\n",
        'method' => 'POST',
        'content' => json_encode($data)
    ]
];

$context = stream_context_create($options);
$result = file_get_contents($url, false, $context);
echo $result;
?>`
    };

    const responseExample = `{
  "batch_id": null,
  "summary": "Sent to 1/1 Total Cost: UGX 25.0000",
  "total_sent": 1,
  "total_cost_ugx": "35",
  "recipients": [
    {
      "number": "+256708215305",
      "status": "Success",
      "statusCode": 100,
      "cost": "UGX 25.0000",
      "messageId": "ATXid_ebd8a7cb308e0e4210e393502d188966"
    }
  ]
}`;

    const sidebarItems: { id: DocSection; label: string; icon: any }[] = [
        { id: 'overview', label: 'OVERVIEW', icon: FileText },
        { id: 'start', label: 'QUICK START', icon: Zap },
        { id: 'auth', label: 'AUTHENTICATION', icon: Key },
        { id: 'endpoint', label: 'API ENDPOINT', icon: Send },
        { id: 'examples', label: 'CODE EXAMPLES', icon: Code },
        { id: 'status', label: 'STATUS CODES', icon: AlertCircle },
        { id: 'best', label: 'BEST PRACTICES', icon: CheckCircle },
    ];

    return (
        <div className="bg-gray-50/50 dark:bg-transparent min-h-screen">
            <PageMeta
                title="API Documentation"
                description="Learn how to integrate SMS API into your application"
            />
            <PageBreadcrumb pageTitle="API Documentation" />

            <div className="flex flex-col lg:flex-row gap-6 mt-6">
                {/* Sidebar */}
                <div className="w-full lg:w-64 flex-shrink-0">
                    <div className="bg-white dark:bg-white/3 shadow border-gray-200 dark:border-gray-800 rounded-none overflow-hidden">
                        <nav className="flex flex-col">
                            {sidebarItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = activeSection === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => setActiveSection(item.id)}
                                        className={`flex items-center gap-3 px-6 py-4 text-xs font-bold tracking-wider text-left transition-all border-l-4 ${isActive
                                            ? 'bg-brand-50/50 dark:bg-brand-500/10 text-brand-600 border-brand-500'
                                            : 'text-gray-500 dark:text-gray-400 border-transparent hover:bg-gray-50 dark:hover:bg-white/5'
                                            }`}
                                    >
                                        <Icon className={`w-4 h-4 ${isActive ? 'text-brand-500' : 'text-gray-400'}`} />
                                        {item.label}
                                    </button>
                                );
                            })}
                        </nav>

                        {/* Decorative background element seen in image */}
                        <div className="p-10 opacity-5 hidden lg:flex justify-center">
                            <UserIcon className="w-24 h-24 text-gray-400" />
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1">
                    <div className="bg-white dark:bg-white/3 border border-gray-200 dark:border-gray-800 rounded-none shadow-sm min-h-[600px]">
                        {/* Content Header */}
                        <div className="px-8 py-6 border-b border-gray-200 dark:border-gray-800">
                            <h2 className="text-sm font-bold tracking-widest text-gray-900 dark:text-white uppercase">
                                {sidebarItems.find(i => i.id === activeSection)?.label}
                            </h2>
                        </div>

                        {/* Content Body */}
                        <div className="p-8">
                            {activeSection === 'overview' && (
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Introduction</h3>
                                        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                                            Welcome to the Luco SMS API documentation. Our API allows you to send SMS messages programmatically to recipients in Uganda and across the globe.
                                            Designed for developers, our RESTful API is simple to integrate into any application.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                                        <div className="p-6 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-gray-800 rounded-none">
                                            <div className="w-10 h-10 bg-brand-100 dark:bg-brand-900/30 rounded-full flex items-center justify-center mb-4">
                                                <Zap className="w-5 h-5 text-brand-600" />
                                            </div>
                                            <h4 className="font-bold text-gray-900 dark:text-white mb-2">High Performance</h4>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Low latency delivery with real-time status tracking for every message.</p>
                                        </div>
                                        <div className="p-6 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-gray-800 rounded-none">
                                            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                                                <CheckCircle className="w-5 h-5 text-green-600" />
                                            </div>
                                            <h4 className="font-bold text-gray-900 dark:text-white mb-2">Secure & Reliable</h4>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Authenticated requests with API keys and detailed error reporting.</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeSection === 'start' && (
                                <div className="space-y-8 text-gray-600 dark:text-gray-400">
                                    <div className="border border-brand-100 bg-brand-50/30 dark:border-brand-900/30 dark:bg-brand-900/10 p-6 rounded-none">
                                        <div className="flex items-start gap-4">
                                            <Zap className="w-6 h-6 text-brand-600 mt-1" />
                                            <div>
                                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Get up and running in minutes</h3>
                                                <p className="text-sm leading-relaxed">Follow these simple steps to start sending messages today.</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        {[
                                            { title: 'Get API Key', text: 'Navigate to the Developers page and create a new API key.', link: '/developers' },
                                            { title: 'Set Headers', text: 'Include x-api-key in your request headers for all API calls.' },
                                            { title: 'Send Request', text: 'Make a POST request to our send-sms endpoint with your payload.' }
                                        ].map((step, idx) => (
                                            <div key={idx} className="flex gap-4">
                                                <div className="flex-shrink-0 w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-400">
                                                    {idx + 1}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-gray-900 dark:text-white">{step.title}</h4>
                                                    <p className="text-sm mt-1">
                                                        {step.text} {step.link && <a href={step.link} className="text-brand-600 underline ml-1">Go to developers</a>}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activeSection === 'auth' && (
                                <div className="space-y-6">
                                    <p className="text-gray-600 dark:text-gray-400">
                                        The Luco SMS API uses API keys to authenticate requests. You can view and manage your API keys in the dashboard.
                                    </p>

                                    <div className="bg-gray-900 p-6 rounded-none border border-gray-800 overflow-hidden shadow-inner font-mono text-sm">
                                        <div className="flex justify-between items-center mb-4 text-gray-500 text-[10px] font-bold tracking-widest">
                                            <span>REQUEST HEADERS</span>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleCopy('x-api-key: YOUR_API_KEY', 'header-copy')}
                                                className="text-[9px] h-6 px-2 border-gray-700 text-gray-400 hover:text-white bg-transparent"
                                                startIcon={copySuccess === 'header-copy' ? <CheckCircle className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                                            >
                                                {copySuccess === 'header-copy' ? 'COPIED' : 'COPY'}
                                            </Button>
                                        </div>
                                        <code className="text-brand-400">x-api-key: <span className="text-white">YOUR_API_KEY</span></code>
                                    </div>

                                    <div className="mt-8 flex items-start gap-4 p-4 border-l-4 border-blue-500 bg-blue-50/50 dark:bg-blue-900/10 dark:border-blue-700">
                                        <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <h4 className="text-sm font-bold text-blue-900 dark:text-blue-200">Security Requirement</h4>
                                            <p className="text-xs text-blue-800 dark:text-blue-300 mt-1">
                                                Never share your API keys in client-side code, public repositories, or unsecured environments. Always use environment variables to manage keys.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeSection === 'endpoint' && (
                                <div className="space-y-8">
                                    {/* Endpoint info */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between group p-3 bg-gray-900 border border-gray-800">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <span className="bg-green-600 text-white text-[10px] font-black px-2 py-0.5 tracking-tighter rounded-sm flex-shrink-0">POST</span>
                                                <code className="text-xs font-mono font-bold text-white truncate">{apiEndpoint}</code>
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleCopy(apiEndpoint, 'endpoint-copy')}
                                                className="text-[10px] h-7 px-3 border-gray-700 text-gray-400 hover:text-white bg-transparent flex-shrink-0"
                                                startIcon={copySuccess === 'endpoint-copy' ? <CheckCircle className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                                            >
                                                {copySuccess === 'endpoint-copy' ? 'COPIED' : 'COPY'}
                                            </Button>
                                        </div>
                                        <p className="text-gray-600 dark:text-gray-400 text-sm">Sends messages to one or more phone numbers simultaneously.</p>
                                    </div>

                                    {/* Parameters table */}
                                    <div className="overflow-hidden border border-gray-200 dark:border-gray-800 rounded-none shadow-xs">
                                        <div className="bg-gray-50 dark:bg-white/5 px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                                            <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 tracking-wider">REQUEST PARAMETERS</h4>
                                        </div>
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="border-b border-gray-200 dark:border-gray-800 text-[10px] font-black uppercase text-gray-400">
                                                    <th className="px-6 py-3">NAME</th>
                                                    <th className="px-6 py-3">TYPE</th>
                                                    <th className="px-6 py-3">REQUIRED</th>
                                                    <th className="px-6 py-3">DESCRIPTION</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs">
                                                {[
                                                    { name: 'to', type: 'array', req: 'YES', desc: 'Array of numbers in international format (e.g. +256...)' },
                                                    { name: 'message', type: 'string', req: 'YES', desc: 'The content of your text message' },
                                                    { name: 'from', type: 'string', req: 'YES', desc: 'Your approved Sender ID' },
                                                    { name: 'enqueue', type: 'boolean', req: 'NO', desc: 'Defaults to true. Set false for synchronous delivery' },
                                                ].map((param) => (
                                                    <tr key={param.name}>
                                                        <td className="px-6 py-4 font-mono font-bold text-brand-600">{param.name}</td>
                                                        <td className="px-6 py-4 text-gray-500">{param.type}</td>
                                                        <td className="px-6 py-4">
                                                            <span className={`px-1.5 py-0.5 text-[9px] font-black rounded-sm ${param.req === 'YES' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-gray-50 text-gray-400 border border-gray-100'}`}>
                                                                {param.req}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{param.desc}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {activeSection === 'examples' && (
                                <div className="space-y-6">
                                    <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-none gap-1">
                                        {(['curl', 'javascript', 'python', 'php'] as const).map((lang) => (
                                            <button
                                                key={lang}
                                                onClick={() => setActiveCodeTab(lang)}
                                                className={`flex-1 py-2 text-[10px] font-bold rounded-none transition-all uppercase tracking-widest ${activeCodeTab === lang
                                                    ? 'bg-white dark:bg-gray-800 text-brand-600 shadow-sm'
                                                    : 'text-gray-500 hover:text-gray-700'
                                                    }`}
                                            >
                                                {lang}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="relative group">
                                        <div className="absolute right-4 top-4 z-10 transition-opacity">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleCopy(codeExamples[activeCodeTab], 'example-copy')}
                                                className="bg-gray-900/80 border-gray-700 text-white hover:bg-black backdrop-blur-sm text-[10px] h-8"
                                                startIcon={copySuccess === 'example-copy' ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                            >
                                                {copySuccess === 'example-copy' ? 'COPIED' : 'COPY'}
                                            </Button>
                                        </div>
                                        <div className="bg-gray-900 p-8 rounded-none border border-gray-800 overflow-x-auto min-h-[300px] shadow-2xl">
                                            <pre className="text-xs font-mono leading-relaxed">
                                                <code className="text-blue-400">{codeExamples[activeCodeTab]}</code>
                                            </pre>
                                        </div>
                                    </div>

                                    <div className="mt-8 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Success Response Example</h4>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleCopy(responseExample, 'response-copy')}
                                                className="border-gray-200 dark:border-gray-800 text-[10px] h-7"
                                                startIcon={copySuccess === 'response-copy' ? <CheckCircle className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                                            >
                                                {copySuccess === 'response-copy' ? 'COPIED' : 'COPY'}
                                            </Button>
                                        </div>
                                        <div className="bg-gray-900 p-8 rounded-none border border-gray-800 overflow-x-auto shadow-sm">
                                            <pre className="text-xs font-mono leading-relaxed">
                                                <code className="text-green-400">{responseExample}</code>
                                            </pre>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeSection === 'status' && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {[
                                            { code: '200', title: 'Success', desc: 'Request was successful and message is queued.', color: 'emerald' },
                                            { code: '401', title: 'Unauthorized', desc: 'Invalid API key or insufficient permissions.', color: 'red' },
                                            { code: '400', title: 'Bad Request', desc: 'Missing required parameters or malformed JSON.', color: 'orange' },
                                            { code: '429', title: 'Rate Limited', desc: 'Too many requests. Implement a retry strategy.', color: 'blue' },
                                        ].map((status) => (
                                            <div key={status.code} className={`p-4 border-l-4 border-${status.color}-500 bg-${status.color}-50/30 dark:bg-white/5 dark:border-${status.color}-600 rounded-none`}>
                                                <div className="flex items-center gap-3 mb-1">
                                                    <span className={`text-sm font-black text-${status.color}-700`}>{status.code}</span>
                                                    <span className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">{status.title}</span>
                                                </div>
                                                <p className="text-[11px] text-gray-600 dark:text-gray-400">{status.desc}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activeSection === 'best' && (
                                <div className="space-y-4">
                                    {[
                                        { title: 'Global Format', desc: 'Use international phone number format (+256...) to ensure delivery across different networks.' },
                                        { title: 'Batching', desc: 'Sending to multiple recipients in a single call is more efficient than separate requests.' },
                                        { title: 'Segment Tracking', desc: 'Be aware that messages over 160 characters will be segmented and billed accordingly.' },
                                        { title: 'Error Handling', desc: 'Always implement try-catch blocks and log API responses for troubleshooting.' }
                                    ].map((tip, i) => (
                                        <div key={i} className="group flex items-center justify-between p-6 border border-gray-100 dark:border-gray-800 rounded-none hover:bg-gray-50 dark:hover:bg-white/5 transition-all">
                                            <div className="flex items-start gap-4">
                                                <div className="mt-1">
                                                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-gray-900 dark:text-white">{tip.title}</h4>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{tip.desc}</p>
                                                </div>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-brand-500 group-hover:translate-x-1 transition-all" />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Simple decorative icon component
function UserIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
    );
}