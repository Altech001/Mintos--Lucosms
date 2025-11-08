import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import Button from '../../components/ui/button/Button';
import Input from '../../components/form/input/InputField';
import Label from '../../components/form/Label';
import { useAuth } from '../../context/AuthContext';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const { apiClient } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const resetToken = searchParams.get('token');
    if (resetToken) {
      setToken(resetToken);
    } else {
      setError('No reset token found. Please request a new password reset link.');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!token) {
      setError('Missing password reset token.');
      return;
    }
    setError(null);
    setMessage(null);

    try {
      await apiClient.api.login.loginResetPassword({ 
        newPassword: { token, newPassword: password } 
      });
      setMessage('Your password has been reset successfully! You can now log in.');
      setTimeout(() => navigate('/signin'), 3000);
    } catch (err: unknown) {
      const anError = err as Error;
      setError(anError.message || 'Failed to reset password. The link may have expired.');
    }
  };

  return (
    <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
      <div>
        <div className="mb-5 sm:mb-8">
          <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
            Reset Password
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Enter your new password below.
          </p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            <div>
              <Label>New Password</Label>
              <Input
                type="password"
                placeholder="Enter your new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <Label>Confirm New Password</Label>
              <Input
                type="password"
                placeholder="Confirm your new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <Button type="submit" className="w-full" size="sm" disabled={!token}>
                Reset Password
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
