import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, User } from 'lucide-react';
import maarifLogo from '../images/Marrif_V 1.1.png';

const Navigation: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <nav className="bg-white shadow-sm border-b-2 border-yellow-400 fixed top-0 left-0 right-0 z-50">
      <div className="w-full px-6">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <div 
              onClick={() => {
                if (user?.role === 'admin') {
                  navigate('/admin', { state: { activeTab: 'dashboard' } });
                } else {
                  navigate('/dashboard');
                }
              }}
              className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity"
            >
              <img 
                src={maarifLogo} 
                alt="Maarif Logo" 
                className="h-10 w-auto object-contain"
              />
              <h1 className="text-xl font-bold text-gray-900">Maarif Assessment Portal</h1>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 px-3 py-1 bg-yellow-50 rounded-lg border border-yellow-200">
              <User className="h-4 w-4 text-yellow-600" />
              <span className="text-yellow-700 font-medium text-sm">
                {user.firstName && user.lastName 
                  ? `${user.firstName} ${user.lastName}` 
                  : user.username}
              </span>
            </div>
            <button
              onClick={logout}
              className="flex items-center space-x-2 px-4 py-2 text-gray-700 hover:text-pink-600 hover:bg-pink-50 rounded-lg transition-all duration-200 border border-gray-200 hover:border-pink-200"
            >
              <LogOut className="h-4 w-4" />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;