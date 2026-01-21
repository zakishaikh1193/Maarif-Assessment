import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, User, BookOpen, BarChart3 } from 'lucide-react';

const Navigation: React.FC = () => {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <nav className="bg-white shadow-sm border-b-2 border-yellow-400">
      <div className="w-full px-6">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-yellow-400 to-pink-500 rounded-lg flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">Maarif Assessment Portal</h1>
            </div>
            <span className="text-sm text-gray-700 bg-gradient-to-r from-yellow-100 to-pink-100 px-3 py-1 rounded-full border border-yellow-200">
              {user.role === 'admin' ? 'Administrator' : 'Student'}
            </span>
          </div>

          <div className="flex items-center space-x-4">
            {/* School and Grade Info for Students */}
            {user.role === 'student' && user.school && user.grade && (
              <div className="hidden md:flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-2 px-3 py-1 bg-teal-50 rounded-lg border border-teal-200">
                  <svg className="h-4 w-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span className="text-teal-700 font-medium">{user.school.name}</span>
                </div>
                <div className="flex items-center space-x-2 px-3 py-1 bg-purple-50 rounded-lg border border-purple-200">
                  <svg className="h-4 w-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <span className="text-purple-700 font-medium">{user.grade.display_name}</span>
                </div>
              </div>
            )}
            
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