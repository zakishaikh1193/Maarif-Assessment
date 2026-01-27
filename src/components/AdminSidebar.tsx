import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  BarChart3,
  Settings,
  Building,
  Users,
  GraduationCap,
  BookOpen,
  Target,
  FileQuestion,
  Clock,
  FileText,
  TrendingUp,
  Brain,
  Key,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

const AdminSidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isReportsOpen, setIsReportsOpen] = useState(false);

  // Determine active tab based on current route
  const getActiveTab = () => {
    if (location.pathname === '/admin/assessments/new') return 'new-assessment';
    if (location.pathname === '/admin') {
      // Check if there's a state with activeTab
      return (location.state as any)?.activeTab || 'dashboard';
    }
    return 'dashboard';
  };

  const activeTab = getActiveTab();

  const handleTabClick = (tab: string) => {
    if (tab === 'new-assessment') {
      navigate('/admin/assessments/new');
    } else {
      navigate('/admin', { state: { activeTab: tab } });
    }
  };

  return (
    <aside className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-white border-r border-gray-200 shadow-sm overflow-y-auto z-40">
      <div className="px-4 py-4 pt-8">
        <nav className="space-y-1">
          {/* Dashboard Button */}
          <button
            onClick={() => handleTabClick('dashboard')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
              activeTab === 'dashboard'
                ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600 font-semibold'
                : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <BarChart3 className="h-5 w-5" />
            <span className="text-sm font-medium">DASHBOARD</span>
          </button>

          {/* Config Dropdown */}
          <div>
            <button
              onClick={() => setIsConfigOpen(!isConfigOpen)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all ${
                ['schools', 'students', 'grades', 'subjects', 'competencies'].includes(activeTab)
                  ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600 font-semibold'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Settings className="h-5 w-5" />
                <span className="text-sm font-medium">CONFIG</span>
              </div>
              {isConfigOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
            
            {/* Config Dropdown Items */}
            {isConfigOpen && (
              <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-200 pl-2">
                <button
                  onClick={() => handleTabClick('schools')}
                  className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg transition-all ${
                    activeTab === 'schools'
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Building className="h-4 w-4" />
                  <span className="text-sm font-medium">SCHOOLS</span>
                </button>

                <button
                  onClick={() => handleTabClick('students')}
                  className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg transition-all ${
                    activeTab === 'students'
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Users className="h-4 w-4" />
                  <span className="text-sm font-medium">STUDENTS</span>
                </button>

                <button
                  onClick={() => handleTabClick('grades')}
                  className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg transition-all ${
                    activeTab === 'grades'
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <GraduationCap className="h-4 w-4" />
                  <span className="text-sm font-medium">GRADES</span>
                </button>

                <button
                  onClick={() => handleTabClick('subjects')}
                  className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg transition-all ${
                    activeTab === 'subjects'
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <BookOpen className="h-4 w-4" />
                  <span className="text-sm font-medium">SUBJECTS</span>
                </button>

                <button
                  onClick={() => handleTabClick('competencies')}
                  className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg transition-all ${
                    activeTab === 'competencies'
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Target className="h-4 w-4" />
                  <span className="text-sm font-medium">COMPETENCIES</span>
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => handleTabClick('questions')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
              activeTab === 'questions'
                ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600 font-semibold'
                : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <FileQuestion className="h-5 w-5" />
            <span className="text-sm font-medium">QUESTIONS</span>
          </button>

          <button
            onClick={() => handleTabClick('configs')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
              activeTab === 'configs' || activeTab === 'new-assessment'
                ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600 font-semibold'
                : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <Clock className="h-5 w-5" />
            <span className="text-sm font-medium">ASSESSMENTS</span>
          </button>

          {/* Reports Dropdown */}
          <div>
            <button
              onClick={() => setIsReportsOpen(!isReportsOpen)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all ${
                ['reports', 'growth', 'performance', 'competency-analytics'].includes(activeTab)
                  ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600 font-semibold'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center space-x-3">
                <FileText className="h-5 w-5" />
                <span className="text-sm font-medium">REPORTS</span>
              </div>
              {isReportsOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
            
            {/* Reports Dropdown Items */}
            {isReportsOpen && (
              <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-200 pl-2">
                <button
                  onClick={() => handleTabClick('growth')}
                  className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg transition-all ${
                    activeTab === 'growth'
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-sm font-medium">GROWTH</span>
                </button>

                <button
                  onClick={() => handleTabClick('competency-analytics')}
                  className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg transition-all ${
                    activeTab === 'competency-analytics'
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Brain className="h-4 w-4" />
                  <span className="text-sm font-medium">COMPETENCIES</span>
                </button>
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 my-2"></div>

          <button
            onClick={() => handleTabClick('sso')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
              activeTab === 'sso'
                ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600 font-semibold'
                : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <Key className="h-5 w-5" />
            <span className="text-sm font-medium">SSO SETTINGS</span>
          </button>
        </nav>
      </div>
    </aside>
  );
};

export default AdminSidebar;
