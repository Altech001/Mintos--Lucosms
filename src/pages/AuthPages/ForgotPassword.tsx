import { useState } from "react";
import { Link } from "react-router-dom";
import Button from "../../components/ui/button/Button";
import Input from "../../components/form/input/InputField";
import Label from "../../components/form/Label";
import { useAuth } from "../../context/AuthContext";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { apiClient } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    try {
      await apiClient.api.login.loginRecoverPassword({ email });
      setMessage("If an account with that email exists, a password reset link has been sent.");
    } catch (err: unknown) {
      const anError = err as Error;
      setError(anError.message || "An unexpected error occurred.");
    }
  };

  return (
    <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
      <div>
        <div className="mb-5 sm:mb-8">
          <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
            Forgot Password
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Enter your email to receive a password reset link.
          </p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            <div>
              <Label>
                Email <span className="text-error-500">*</span>
              </Label>
              <Input
                type="email"
                placeholder="info@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Button type="submit" className="w-full" size="sm">
                Send Reset Link
              </Button>
            </div>
            {message && <p className="mt-2 text-sm text-center text-green-500">{message}</p>}
            {error && <p className="mt-2 text-sm text-center text-error-500">{error}</p>}
          </div>
        </form>
        <div className="mt-5 text-center">
          <Link
            to="/signin"
            className="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400"
          >
            Back to Log in
          </Link>
        </div>
      </div>
    </div>
  );
}
