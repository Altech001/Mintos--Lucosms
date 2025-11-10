import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { ApiKeyPublic } from "../../lib/api/models";
import Button from "../../components/ui/button/Button";
import Modal from "../../components/ui/modal/Modal";
import Input from "../../components/form/input/InputField";
import Label from "../../components/form/Label";
import Skeleton from "../../components/ui/Skeleton";
import { Copy, Check } from "lucide-react";

export default function ApiKeysPage() {
  const { apiClient } = useAuth();
  const [apiKeys, setApiKeys] = useState<ApiKeyPublic[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<ApiKeyPublic & { plain_key?: string; key?: string; plainKey?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState<string | boolean>(false); // boolean for create, string for other actions by key ID
  const [copied, setCopied] = useState(false);
  const [isRegenerate, setIsRegenerate] = useState(false);

  const fetchApiKeys = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.api.apiKeys.apiKeysReadApiKeys({});
      setApiKeys(response.data);
    } catch (err) {
      const anError = err as Error;
      setError(anError.message || "Failed to fetch API keys.");
    }
    setIsLoading(false);
  }, [apiClient]);

  useEffect(() => {
    fetchApiKeys();
  }, [fetchApiKeys]);

  const handleCreateKey = async () => {
    if (!newKeyName) {
      setError("Key name cannot be empty.");
      return;
    }
    setError(null);
    setIsMutating(true);
    try {
      const response = await apiClient.api.apiKeys.apiKeysCreateApiKey({ apiKeyCreate: { name: newKeyName } });
      setNewlyCreatedKey(response);
      setIsRegenerate(false);
      setCreateModalOpen(false);
      setNewKeyName("");
      setCopied(false);
      fetchApiKeys();
    } catch (err) {
      const anError = err as Error;
      setError(anError.message || "Failed to create API key.");
    }
    setIsMutating(false);
  };

  const handleDeleteKey = async (keyId: string) => {
    if (window.confirm("Are you sure you want to delete this API key? This action cannot be undone.")) {
      setIsMutating(keyId);
      try {
        await apiClient.api.apiKeys.apiKeysDeleteApiKey({ apiKeyId: keyId });
        fetchApiKeys();
      } catch (err) {
        const anError = err as Error;
        setError(anError.message || "Failed to delete API key.");
      }
      setIsMutating(false);
    }
  };

  const handleRegenerateKey = async (keyId: string) => {
    if (window.confirm("Are you sure you want to regenerate this API key? The old key will be invalidated immediately.")) {
      setIsMutating(keyId);
      try {
        const response = await apiClient.api.apiKeys.apiKeysRegenerateApiKey({ apiKeyId: keyId });
        setNewlyCreatedKey(response);
        setIsRegenerate(true);
        setCopied(false);
        fetchApiKeys();
      } catch (err) {
        const anError = err as Error;
        setError(anError.message || "Failed to regenerate API key.");
      }
      setIsMutating(false);
    }
  };

  const handleCopyKey = () => {
    const keyToCopy = newlyCreatedKey?.plainKey || newlyCreatedKey?.plain_key || newlyCreatedKey?.key || '';
    navigator.clipboard.writeText(keyToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">API Keys</h1>
        <Button size="sm" onClick={() => setCreateModalOpen(true)}>Create API Key</Button>
      </div>

      {error && <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-200 dark:text-red-800">{error}</div>}

      <div className="overflow-x-auto bg-white rounded-lg shadow-md dark:bg-gray-800">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-300">Name</th>
              <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-300">Key Prefix</th>
              <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-300">Created At</th>
              <th className="px-6 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-300">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <tr key={index}>
                  <td className="px-6 py-4"><Skeleton className="w-24 h-5" /></td>
                  <td className="px-6 py-4"><Skeleton className="w-20 h-5" /></td>
                  <td className="px-6 py-4"><Skeleton className="w-20 h-5" /></td>
                  <td className="px-6 py-4"><Skeleton className="w-32 h-8" /></td>
                </tr>
              ))
            ) : (
              apiKeys.map((key) => (
              <tr key={key.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{key.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 font-mono">{key.prefix}...</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{new Date(key.createdAt).toLocaleDateString()}</td>
                <td className="px-6 py-4 text-sm font-medium text-right whitespace-nowrap">
                  <Button variant="outline" size="sm" className="mr-2" onClick={() => handleRegenerateKey(key.id)} isLoading={isMutating === key.id}>Regenerate</Button>
                  <Button variant="danger" size="sm" onClick={() => handleDeleteKey(key.id)} isLoading={isMutating === key.id}>Delete</Button>
                </td>
              </tr>
            )))
          }
          </tbody>
        </table>
      </div>

      {/* Create Key Modal */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setCreateModalOpen(false)} title="Create New API Key">
        <div className="space-y-4">
          <div>
            <Label>Key Name</Label>
            <Input type="text" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} placeholder="e.g., My Awesome App" />
          </div>
          <div className="flex justify-end gap-4">
            <Button onClick={() => setCreateModalOpen(false)} variant="outline">Cancel</Button>
            <Button onClick={handleCreateKey} isLoading={isMutating === true}>Create</Button>
          </div>
        </div>
      </Modal>

      {/* Show Newly Created/Regenerated Key Modal */}
      <Modal 
        isOpen={!!newlyCreatedKey} 
        onClose={() => { setNewlyCreatedKey(null); setCopied(false); }} 
        title={isRegenerate ? "API Key Regenerated Successfully" : "API Key Created Successfully"}
      >
        <div className="space-y-4">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">
              ⚠️ Important: Save this key now!
            </p>
            <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
              {isRegenerate 
                ? "Your API key has been regenerated. The old key is now invalid and will no longer work."
                : "This is the only time you'll be able to see the full API key. Make sure to copy it now."
              }
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-white/5 rounded-lg p-4 border border-gray-200 dark:border-white/10">
            <Label className="mb-2">Full API Key</Label>
            {(newlyCreatedKey?.plainKey || newlyCreatedKey?.plain_key || newlyCreatedKey?.key) ? (
              <div className="relative">
                <code className="block font-mono text-sm text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800 px-3 py-3 pr-12 rounded border border-gray-300 dark:border-gray-700 break-all">
                  {newlyCreatedKey?.plainKey || newlyCreatedKey?.plain_key || newlyCreatedKey?.key}
                </code>
                <button
                  onClick={handleCopyKey}
                  className="absolute top-2 right-2 p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                  title="Copy to clipboard"
                >
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            ) : (
              <p className="text-sm text-gray-600 dark:text-gray-300">
                The full key is only shown immediately after creation or regeneration.
              </p>
            )}
          </div>

          {copied && (
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <Check className="w-4 h-4" />
              <span>Copied to clipboard!</span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button onClick={handleCopyKey} variant="outline" disabled={!newlyCreatedKey?.plainKey && !newlyCreatedKey?.plain_key && !newlyCreatedKey?.key}>
              {copied ? "Copied!" : "Copy Key"}
            </Button>
            <Button onClick={() => { setNewlyCreatedKey(null); setCopied(false); }}>I've Saved My Key</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
