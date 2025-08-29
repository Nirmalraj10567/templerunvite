import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Header } from '../components/Header';

export function LoginPage() {
  const [step, setStep] = useState(1);
  const [mobileNumber, setMobileNumber] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login, isLoading, error: authError, user, token } = useAuth();

  useEffect(() => {
    if (authError) setError(authError);
  }, [authError]);

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (user && token) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, token, navigate]);

  // Prefill mobile number from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('mobileNumber');
    if (saved) setMobileNumber(saved);
  }, []);

  const handleMobileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (mobileNumber.length === 10) {
      localStorage.setItem('mobileNumber', mobileNumber);
      setStep(2);
    } else {
      setError('Please enter a valid 10-digit mobile number.');
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError('Username and password are required.');
      return;
    }

    try {
      const { success } = await login(mobileNumber, username, password);
      if (success) {
        navigate('/dashboard');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    }
  };

  const goBack = () => step === 2 && setStep(1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100">
      <Header />
      {/* Main Content */}
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md rounded-2xl shadow-2xl p-8 space-y-6">
          <div className="text-center mb-2">
            <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
              <span className="text-white text-2xl">🕉️</span>
            </div>
            <h1 className="text-2xl font-bold text-black">Welcome Back</h1>
            <p className="text-black">Sign in to your temple account</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {step === 1 && (
              <form onSubmit={handleMobileSubmit} className="space-y-4">
                <div>
                  <label htmlFor="mobileNumber" className="block text-sm font-medium text-black mb-2">
                    Mobile Number
                  </label>
                  <Input
                    id="mobileNumber"
                    type="tel"
                    placeholder="Enter your mobile number"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))}
                    className="w-full"
                    maxLength={10}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                >
                  Continue
                </Button>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-black mb-2">
                    Username
                  </label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-black mb-2">
                    Password
                  </label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Signing In...' : 'Sign In'}
                </Button>
                <button
                  type="button"
                  onClick={goBack}
                  className="w-full text-black py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Back to Mobile Number
                </button>
              </form>
            )}
          </div>

          <div className="mt-2 text-center">
            <p className="text-black text-sm">
              Don't have an account?{' '}
              <a href="/register" className="text-orange-600 hover:text-orange-700 font-medium">
                Register here
              </a>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
