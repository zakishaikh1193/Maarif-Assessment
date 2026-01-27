import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard,
  FileText,
  BarChart3,
  Menu,
  X
} from 'lucide-react';

interface StudentSidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const StudentSidebar: React.FC<StudentSidebarProps> = ({
  sidebarOpen,
  setSidebarOpen
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white border-r border-gray-200 fixed left-0 top-16 h-[calc(100vh-4rem)] transition-all duration-300 z-40 shadow-sm`}>
      <div className="p-4">
        {/* Sidebar Toggle Button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="w-full flex items-center justify-center p-2 mb-4 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        {/* Navigation Items */}
        <nav className="space-y-2">
          <button
            onClick={() => navigate('/dashboard')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors group ${
              location.pathname === '/dashboard'
                ? 'bg-yellow-50 text-yellow-700'
                : 'text-gray-700 hover:bg-yellow-50 hover:text-yellow-700'
            }`}
          >
            <LayoutDashboard className="h-5 w-5 flex-shrink-0" />
            {sidebarOpen && <span className="font-medium">Dashboard</span>}
          </button>
          
          <button
            onClick={() => navigate('/assessments')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors group ${
              location.pathname === '/assessments'
                ? 'bg-yellow-50 text-yellow-700'
                : 'text-gray-700 hover:bg-yellow-50 hover:text-yellow-700'
            }`}
          >
            <FileText className="h-5 w-5 flex-shrink-0" />
            {sidebarOpen && <span className="font-medium">Assessments</span>}
          </button>
          
          <button
            onClick={() => navigate('/results')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors group ${
              location.pathname === '/results'
                ? 'bg-yellow-50 text-yellow-700'
                : 'text-gray-700 hover:bg-yellow-50 hover:text-yellow-700'
            }`}
          >
            <BarChart3 className="h-5 w-5 flex-shrink-0" />
            {sidebarOpen && <span className="font-medium">Results</span>}
          </button>
        </nav>
      </div>
    </aside>
  );
};

export default StudentSidebar;
