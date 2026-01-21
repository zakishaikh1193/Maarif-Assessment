import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BarChart3, ArrowRight, Eye, EyeOff, AlertCircle, BookOpen, Target, Zap } from 'lucide-react';
import { ssoAPI } from '../services/api';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Handle SSO token from URL
  useEffect(() => {
    const ssoToken = searchParams.get('sso_token');

    if (ssoToken) {
      handleSSOLogin(ssoToken);
    }
  }, [searchParams]);

  useEffect(() => {
    if (user) {
      const redirectPath = user.role === 'admin' ? '/admin' : '/dashboard';
      navigate(redirectPath, { replace: true });
    }
  }, [user, navigate]);

  const handleSSOLogin = async (token: string) => {
    setLoading(true);
    setError('');

    try {
      const response = await ssoAPI.validateToken(token);
      const { token: mapToken, user: userData } = response;

      // Store token and user
      localStorage.setItem('token', mapToken);
      localStorage.setItem('user', JSON.stringify(userData));

      // Redirect to appropriate dashboard
      const redirectPath = userData.role === 'admin' ? '/admin' : '/dashboard';
      window.location.href = redirectPath;
    } catch (error: any) {
      console.error('SSO login error:', error);
      setError(error.response?.data?.error || 'SSO authentication failed. Please try logging in manually.');
      setLoading(false);
      // Remove SSO params from URL
      navigate('/login', { replace: true });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Simulate network delay for UX
      await new Promise(resolve => setTimeout(resolve, 500));
      await login(username, password);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Invalid username or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-amber-50">
      <div className="w-full max-w-6xl mx-auto flex  bg-amber-50 rounded-2xl shadow-2xl overflow-hidden border border-purple-300">
        
        {/* Left Panel - Content with Hot Pink Background */}
        <div className="hidden lg:flex lg:w-1/2 bg-yellow-200 relative overflow-hidden">
          {/* Content */}
          <div className="flex items-center justify-center w-full">
            <div className="text-center text-gray-800 p-16">
              <div className="mb-12">
                <div className="flex items-center justify-center space-x-3 mb-8">
                  <div className="w-16 h-16 bg-gray-500 bg-opacity-25 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                    <BarChart3 className="h-8 w-8 text-gray-800" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold">Maarif Assessment Portal</h1>
                    <p className=" text-gray-600 text-opacity-90 text-sm">Adaptive Learning Platform</p>
                  </div>
                </div>
                
                <h2 className="text-5xl font-bold mb-6 leading-tight">
                  Unlock Student Potential
                </h2>
                <p className="text-gray-600 text-opacity-90 text-xl leading-relaxed mb-10 max-w-md mx-auto">
                  Advanced adaptive assessments that grow with your students, providing insights that drive meaningful educational outcomes.
                </p>
              </div>

              <div className="space-y-6 max-w-sm mx-auto">
                <div className="flex items-center space-x-4 bg-white bg-opacity-20 p-4 rounded-xl backdrop-blur-sm border border-pink-200">
                  <div className="w-12 h-12 bg-yellow-400 rounded-xl flex items-center justify-center">
                    <Target className="h-6 w-6 text-gray-600" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-bold text-gray-600">Precision Testing</h3>
                    <p className="text-gray-600 text-opacity-80 text-sm">Questions adapt to performance</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4 bg-white bg-opacity-20 p-4 rounded-xl backdrop-blur-sm  border border-pink-200">
                  <div className="w-12 h-12 bg-yellow-400 rounded-xl flex items-center justify-center">
                    <BookOpen className="h-6 w-6 text-gray-600" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-bold text-gray-600">Deep Analytics</h3>
                    <p className="text-gray-600 text-opacity-80 text-sm">Comprehensive learning insights</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4 bg-white bg-opacity-20 p-4 rounded-xl backdrop-blur-sm  border border-pink-200">
                  <div className="w-12 h-12 bg-yellow-400 rounded-xl flex items-center justify-center">
                    <Zap className="h-6 w-6 text-gray-600" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-bold text-gray-600">Real-time Results</h3>
                    <p className="text-gray-600 text-opacity-80 text-sm">Instant feedback & tracking</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Login Form */}
        <div className="w-full lg:w-1/2 bg-amber-50 p-8 lg:p-16 flex items-center justify-center">
          <div className="w-full max-w-md">
            <div className="text-center mb-10">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Welcome Back</h1>
              <p className="text-gray-600">Sign in to your assessment platform</p>
            </div>

            {/* Demo Credentials */}
            <div className="mb-8 p-5 bg-white rounded-xl border border-amber-200 shadow-sm">
              <div className="flex items-center space-x-2 mb-3">
                <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
                <h3 className="font-semibold text-gray-800 text-sm">Demo Access</h3>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Admin:</span>
                  <code className="bg-amber-100 px-2 py-1 rounded text-gray-800 border border-amber-200">admin / admin123</code>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Student:</span>
                  <code className="bg-amber-100 px-2 py-1 rounded text-gray-800 border border-amber-200">student1 / student123</code>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-pink-50 border border-pink-200 rounded-xl">
                <div className="flex items-center space-x-3">
                  <AlertCircle className="h-5 w-5 text-pink-500 flex-shrink-0" />
                  <div>
                    <h3 className="text-sm font-medium text-pink-800">Login Failed</h3>
                    <p className="text-pink-700 text-sm mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  required
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-amber-200 rounded-xl focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500 focus:ring-opacity-20 transition-colors"
                  placeholder="Enter username"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-amber-200 rounded-xl focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500 focus:ring-opacity-20 transition-colors pr-12"
                    placeholder="Enter password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 px-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              
              <div className="flex items-center">
                <input 
                  id="remember-me" 
                  name="remember-me" 
                  type="checkbox" 
                  className="h-4 w-4 text-teal-500 focus:ring-teal-500 border-amber-300 rounded" 
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                  Remember me
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-yellow-300 to-yellow-500 text-gray-800 py-3 px-6 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-pink-500">
              <p className="text-xs text-gray-500 text-center">
                Secure educational assessment platform
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;