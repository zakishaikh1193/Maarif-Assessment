import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, Clock } from 'lucide-react';
import { ssoAPI } from '../services/api';
import maarifLogo from '../images/Marrif_V 1.1.png';

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
    <div className="min-h-screen flex bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-100 relative">
      {/* Logo in top left corner */}
      <div className="absolute top-6 left-6 lg:top-8 lg:left-8 z-10">
        <img 
          src={maarifLogo} 
          alt="Maarif Logo" 
          className="h-14 w-auto object-contain"
        />
      </div>
      
      <div className="w-full flex">
        {/* Left Panel - Login Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-12">
          <div className="w-full max-w-md">

            {/* Title Section */}
            <div className="mb-10">
              <h1 className="text-5xl font-bold text-gray-900 mb-3">Welcome Back</h1>
              <p className="text-gray-600 text-base">Sign in to your assessment platform</p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                <div className="flex items-center space-x-3">
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                  <div>
                    <h3 className="text-sm font-medium text-red-800">Login Failed</h3>
                    <p className="text-red-700 text-sm mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-base font-medium text-gray-700 mb-3">
                  Username
                </label>
                <input
                  type="text"
                  required
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-5 py-4 text-base bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400 focus:ring-opacity-20 transition-all placeholder:text-gray-400"
                  placeholder="Enter your username"
                />
              </div>

              <div>
                <label className="block text-base font-medium text-gray-700 mb-3">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-5 py-4 text-base bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400 focus:ring-opacity-20 transition-all placeholder:text-gray-400 pr-14"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 px-5 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-6 w-6" /> : <Eye className="h-6 w-6" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-900 py-4 px-6 rounded-xl font-semibold text-base focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-900 border-t-transparent"></div>
                  </div>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Panel - Background with Glassmorphism UI Elements */}
        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
          {/* Background Image - Assessment/Education themed */}
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: `url('https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&q=80')`,
              filter: 'blur(4px) brightness(0.7)'
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-purple-900/20" />

          {/* Glassmorphism UI Elements */}
          <div className="relative w-full h-full p-8">
            {/* Assessment Cards */}
            <div className="absolute top-20 left-8 space-y-2">
              <div className="bg-yellow-400/90 backdrop-blur-sm rounded-2xl p-4 shadow-lg">
                <h3 className="font-semibold text-gray-900 text-sm mb-1">Math Assessment Review</h3>
                <p className="text-gray-700 text-xs">09:30am - 10:00am</p>
              </div>
              <div className="bg-gray-900/40 backdrop-blur-md rounded-2xl p-4 shadow-lg border border-white/10">
                <p className="text-white text-xs">09:30am - 10:00am</p>
              </div>
            </div>

            {/* Profile Avatars */}
            <div className="absolute top-1/3 right-12 flex -space-x-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 border-2 border-white/50 backdrop-blur-sm shadow-lg"
                />
              ))}
            </div>

            {/* Calendar View */}
            <div className="absolute bottom-32 left-8 right-8 bg-white/20 backdrop-blur-md rounded-2xl p-4 border border-white/30 shadow-lg">
              <div className="flex justify-between items-center mb-3">
                <span className="text-white text-xs font-medium">Sun Mon Tue Wed Thu Fri Sat</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/80 text-xs">22</span>
                <span className="text-white/80 text-xs">23</span>
                <span className="text-white/80 text-xs">24</span>
                <span className="text-white/80 text-xs">25</span>
                <span className="text-white/80 text-xs">26</span>
                <span className="text-white/60 text-xs line-through">27</span>
                <span className="text-white/60 text-xs line-through">28</span>
              </div>
            </div>

            {/* Assessment Session Card */}
            <div className="absolute bottom-8 left-8 bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow-lg max-w-xs">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900 text-sm">Science Assessment</h3>
                <Clock className="w-4 h-4 text-gray-600" />
              </div>
              <p className="text-gray-600 text-xs mb-3">12:00pm - 01:00pm</p>
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 border-2 border-white shadow-sm"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;