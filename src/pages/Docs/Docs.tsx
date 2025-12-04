/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { AlertCircle, CheckCircle, Code, Copy, Key, Send, Zap } from 'lucide-react';
import { useState } from 'react';
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import Button from "../../components/ui/button/Button";

export default function ApiDoc() {
    const [copySuccess, setCopySuccess] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'curl' | 'javascript' | 'python' | 'php'>('curl');

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

    return (
        <div>
            <PageMeta
                title="API Documentation"
                description="Learn how to integrate SMS API into your application"
            />
            <PageBreadcrumb pageTitle="API Documentation" />

            <div className="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/3 xl:px-10 xl:py-12">

                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        SMS API Documentation
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Send SMS messages programmatically using our REST API
                    </p>
                </div>

                {/* Quick Start */}
                <div className="mb-8 rounded-xl border border-blue-200 bg-blue-50 dark:border-blue-900/30 dark:bg-blue-900/10 p-6">
                    <div className="flex items-start gap-3">
                        <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                        <div>
                            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
                                Quick Start
                            </h3>
                            <ol className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                                <li>1. Generate an API key from the <a href="/developers" className="underline font-medium">Developer page</a></li>
                                <li>2. Add the API key to your request headers as <code className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 font-mono text-xs">x-api-key</code></li>
                                <li>3. Send a POST request to the endpoint with your message details</li>
                            </ol>
                        </div>
                    </div>
                </div>

                {/* Endpoint */}
                <div className="mb-8">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Send className="w-5 h-5" />
                        Send SMS Endpoint
                    </h2>

                    <div className="rounded-lg border border-gray-200 dark:border-white/10 overflow-hidden">
                        <div className="bg-gray-50 dark:bg-white/5 px-4 py-3 border-b border-gray-200 dark:border-white/10">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="px-2.5 py-1 rounded-md bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-semibold">
                                        POST
                                    </span>
                                    <code className="text-sm font-mono text-gray-700 dark:text-gray-300">
                                        /api/v1/sms/send-api
                                    </code>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-white dark:bg-gray-900/50">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Base URL</span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleCopy(apiEndpoint, 'endpoint')}
                                    startIcon={copySuccess === 'endpoint' ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                                >
                                    {copySuccess === 'endpoint' ? 'Copied!' : 'Copy'}
                                </Button>
                            </div>
                            <code className="block text-sm font-mono text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded border border-gray-200 dark:border-gray-700">
                                {apiEndpoint}
                            </code>
                        </div>
                    </div>
                </div>

                {/* Authentication */}
                <div className="mb-8">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Key className="w-5 h-5" />
                        Authentication
                    </h2>

                    <div className="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/50 p-6">
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                            All API requests require authentication using an API key. Include your API key in the request header:
                        </p>

                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                            <code className="text-sm font-mono text-gray-800 dark:text-gray-200">
                                x-api-key: YOUR_API_KEY
                            </code>
                        </div>

                        <div className="mt-4 flex items-start gap-2 text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-lg p-3">
                            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <span>Keep your API keys secure and never share them publicly or commit them to version control.</span>
                        </div>
                    </div>
                </div>

                {/* Request Parameters */}
                <div className="mb-8">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                        Request Parameters
                    </h2>

                    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-white/10">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-white/5">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">Parameter</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">Type</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">Required</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">Description</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-white/10 bg-white dark:bg-gray-900/50">
                                <tr>
                                    <td className="px-4 py-3">
                                        <code className="text-sm font-mono text-blue-600 dark:text-blue-400">to</code>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">array</td>
                                    <td className="px-4 py-3">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300">
                                            Required
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                        Array of phone numbers in international format (e.g., +256708215305)
                                    </td>
                                </tr>
                                <tr>
                                    <td className="px-4 py-3">
                                        <code className="text-sm font-mono text-blue-600 dark:text-blue-400">message</code>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">string</td>
                                    <td className="px-4 py-3">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300">
                                            Required
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                        The SMS message content to send
                                    </td>
                                </tr>
                                <tr>
                                    <td className="px-4 py-3">
                                        <code className="text-sm font-mono text-blue-600 dark:text-blue-400">from</code>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">string</td>
                                    <td className="px-4 py-3">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300">
                                            Required
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                        Sender ID (your brand name or identifier)
                                    </td>
                                </tr>
                                <tr>
                                    <td className="px-4 py-3">
                                        <code className="text-sm font-mono text-blue-600 dark:text-blue-400">enqueue</code>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">boolean</td>
                                    <td className="px-4 py-3">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                                            Optional
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                        Queue the message for delivery (default: true)
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Code Examples */}
                <div className="mb-8">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Code className="w-5 h-5" />
                        Code Examples
                    </h2>

                    {/* Language Tabs */}
                    <div className="flex gap-2 mb-4 border-b border-gray-200 dark:border-white/10">
                        {(['curl', 'javascript', 'python', 'php'] as const).map((lang) => (
                            <button
                                key={lang}
                                onClick={() => setActiveTab(lang)}
                                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${activeTab === lang
                                    ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                                    }`}
                            >
                                {lang === 'curl' ? 'cURL' : lang.charAt(0).toUpperCase() + lang.slice(1)}
                            </button>
                        ))}
                    </div>

                    <div className="rounded-lg border border-gray-200 dark:border-white/10 overflow-hidden">
                        <div className="bg-gray-50 dark:bg-white/5 px-4 py-3 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {activeTab === 'curl' ? 'cURL' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCopy(codeExamples[activeTab], 'code')}
                                startIcon={copySuccess === 'code' ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                            >
                                {copySuccess === 'code' ? 'Copied!' : 'Copy'}
                            </Button>
                        </div>
                        <div className="bg-gray-900 p-4 overflow-x-auto">
                            <pre className="text-sm text-gray-100 font-mono">
                                <code>{codeExamples[activeTab]}</code>
                            </pre>
                        </div>
                    </div>
                </div>

                {/* Response */}
                <div className="mb-8">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                        Response Format
                    </h2>

                    <div className="rounded-lg border border-gray-200 dark:border-white/10 overflow-hidden">
                        <div className="bg-gray-50 dark:bg-white/5 px-4 py-3 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="px-2.5 py-1 rounded-md bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-semibold">
                                    200 OK
                                </span>
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Success Response</span>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCopy(responseExample, 'response')}
                                startIcon={copySuccess === 'response' ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                            >
                                {copySuccess === 'response' ? 'Copied!' : 'Copy'}
                            </Button>
                        </div>
                        <div className="bg-gray-900 p-4 overflow-x-auto">
                            <pre className="text-sm text-gray-100 font-mono">
                                <code>{responseExample}</code>
                            </pre>
                        </div>
                    </div>

                    {/* Response Fields */}
                    <div className="mt-4 rounded-lg border border-gray-200 dark:border-white/10 overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-white/5">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">Field</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">Type</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">Description</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-white/10 bg-white dark:bg-gray-900/50">
                                <tr>
                                    <td className="px-4 py-3">
                                        <code className="text-sm font-mono text-blue-600 dark:text-blue-400">batch_id</code>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">string | null</td>
                                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">Batch identifier for grouped messages</td>
                                </tr>
                                <tr>
                                    <td className="px-4 py-3">
                                        <code className="text-sm font-mono text-blue-600 dark:text-blue-400">summary</code>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">string</td>
                                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">Human-readable summary of the operation</td>
                                </tr>
                                <tr>
                                    <td className="px-4 py-3">
                                        <code className="text-sm font-mono text-blue-600 dark:text-blue-400">total_sent</code>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">number</td>
                                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">Number of messages successfully sent</td>
                                </tr>
                                <tr>
                                    <td className="px-4 py-3">
                                        <code className="text-sm font-mono text-blue-600 dark:text-blue-400">total_cost_ugx</code>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">string</td>
                                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">Total cost in Ugandan Shillings</td>
                                </tr>
                                <tr>
                                    <td className="px-4 py-3">
                                        <code className="text-sm font-mono text-blue-600 dark:text-blue-400">recipients</code>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">array</td>
                                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">Detailed status for each recipient</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Status Codes */}
                <div className="mb-8">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                        Status Codes
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="rounded-lg border border-green-200 dark:border-green-900/30 bg-green-50 dark:bg-green-900/10 p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="px-2.5 py-1 rounded-md bg-green-600 text-white text-xs font-semibold">200</span>
                                <span className="font-medium text-green-900 dark:text-green-100">Success</span>
                            </div>
                            <p className="text-sm text-green-800 dark:text-green-200">Request processed successfully</p>
                        </div>

                        <div className="rounded-lg border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10 p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="px-2.5 py-1 rounded-md bg-red-600 text-white text-xs font-semibold">401</span>
                                <span className="font-medium text-red-900 dark:text-red-100">Unauthorized</span>
                            </div>
                            <p className="text-sm text-red-800 dark:text-red-200">Invalid or missing API key</p>
                        </div>

                        <div className="rounded-lg border border-amber-200 dark:border-amber-900/30 bg-amber-50 dark:bg-amber-900/10 p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="px-2.5 py-1 rounded-md bg-amber-600 text-white text-xs font-semibold">400</span>
                                <span className="font-medium text-amber-900 dark:text-amber-100">Bad Request</span>
                            </div>
                            <p className="text-sm text-amber-800 dark:text-amber-200">Invalid request parameters</p>
                        </div>

                        <div className="rounded-lg border border-purple-200 dark:border-purple-900/30 bg-purple-50 dark:bg-purple-900/10 p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="px-2.5 py-1 rounded-md bg-purple-600 text-white text-xs font-semibold">429</span>
                                <span className="font-medium text-purple-900 dark:text-purple-100">Rate Limited</span>
                            </div>
                            <p className="text-sm text-purple-800 dark:text-purple-200">Too many requests, please slow down</p>
                        </div>
                    </div>
                </div>

                {/* Best Practices */}
                <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                        Best Practices
                    </h2>

                    <div className="space-y-4">
                        <div className="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/50 p-5">
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                                Phone Number Format
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Always use international format with country code (e.g., +256708215305). Omit spaces and special characters.
                            </p>
                        </div>

                        <div className="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/50 p-5">
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                                Error Handling
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Always check the <code className="px-1 py-0.5 rounded bg-gray-100 dark:bg-white/10 font-mono text-xs">status</code> and <code className="px-1 py-0.5 rounded bg-gray-100 dark:bg-white/10 font-mono text-xs">statusCode</code> fields in the recipients array to verify delivery status.
                            </p>
                        </div>

                        <div className="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/50 p-5">
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                                Rate Limiting
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Implement exponential backoff when receiving 429 status codes. Consider batching messages to stay within rate limits.
                            </p>
                        </div>

                        <div className="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/50 p-5">
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                                Message Content
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Keep messages concise and avoid special characters that may not render properly. Each SMS segment is typically 160 characters.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}