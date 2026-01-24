import React, { useState, useEffect } from 'react';
import { Competency, CompetencyStats, PaginationInfo } from '../types';
import { competenciesAPI } from '../services/api';
import { Plus, Edit, Trash2, Users, FileText, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronRight, Upload, ChevronLeft, Search, X } from 'lucide-react';
import CompetencyCSVImportModal from './CompetencyCSVImportModal';

interface CompetencyListProps {
  onEditCompetency: (competency: Competency) => void;
  onAddCompetency: () => void;
  refreshTrigger?: number;
}

const CompetencyList: React.FC<CompetencyListProps> = ({
  onEditCompetency,
  onAddCompetency,
  refreshTrigger
}) => {
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [stats, setStats] = useState<CompetencyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedCompetencies, setExpandedCompetencies] = useState<Set<number>>(new Set());
  const [showImportModal, setShowImportModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const itemsPerPage = 10;

  useEffect(() => {
    loadCompetencies();
  }, [refreshTrigger, currentPage, searchTerm]);

  const loadCompetencies = async () => {
    try {
      setLoading(true);
      const [competenciesResponse, statsData] = await Promise.all([
        competenciesAPI.getAll(currentPage, itemsPerPage, searchTerm),
        competenciesAPI.getStats()
      ]);
      setCompetencies(competenciesResponse.competencies);
      setPagination(competenciesResponse.pagination);
      setStats(statsData);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to load competencies');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top of table
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteCompetency = async (competency: Competency) => {
    if (!window.confirm(`Are you sure you want to delete "${competency.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await competenciesAPI.delete(competency.id);
      await loadCompetencies(); // Reload the list
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to delete competency';
      alert(errorMessage);
    }
  };

  // Build hierarchical tree structure
  const buildHierarchy = (competencies: Competency[]): Map<number, Competency & { children: Competency[] }> => {
    const competencyMap = new Map<number, Competency & { children: Competency[] }>();

    // Create map of all competencies
    competencies.forEach(comp => {
      competencyMap.set(comp.id, { ...comp, children: [] });
    });

    // Build tree structure
    competencies.forEach(comp => {
      const parentId = comp.parent_id || 0;
      if (parentId !== 0) {
        const parent = competencyMap.get(parentId);
        if (parent) {
          parent.children.push(competencyMap.get(comp.id)!);
        }
      }
    });

    return competencyMap;
  };

  // Get root competencies (parent_id is 0 or null)
  const getRootCompetencies = (competencyMap: Map<number, Competency & { children: Competency[] }>): (Competency & { children: Competency[] })[] => {
    return Array.from(competencyMap.values()).filter(comp => {
      const parentId = comp.parent_id || 0;
      return parentId === 0;
    });
  };

  // Toggle expand/collapse
  const toggleExpand = (competencyId: number) => {
    setExpandedCompetencies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(competencyId)) {
        newSet.delete(competencyId);
      } else {
        newSet.add(competencyId);
      }
      return newSet;
    });
  };

  const getCompetencyStats = (competencyId: number) => {
    return stats.find(stat => stat.id === competencyId);
  };

  const getPerformanceIcon = (averageScore: number | string | null | undefined) => {
    const score = typeof averageScore === 'number' ? averageScore : Number(averageScore);
    if (isNaN(score)) return null;
    if (score >= 70) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (score >= 50) return <Minus className="h-4 w-4 text-yellow-600" />;
    return <TrendingDown className="h-4 w-4 text-red-600" />;
  };

  // Render competency row with children recursively
  const renderCompetencyRow = (
    competency: Competency & { children: Competency[] },
    level: number = 0,
    competencyMap: Map<number, Competency & { children: Competency[] }>
  ) => {
    try {
      const competencyStats = getCompetencyStats(competency.id);
      const hasChildren = competency.children && competency.children.length > 0;
      const isExpanded = expandedCompetencies.has(competency.id);
      const indent = level * 24;

      return (
      <React.Fragment key={competency.id}>
        <tr className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
          {/* Expand/Collapse and Code */}
          <td className="px-4 py-3">
            <div className="flex items-center" style={{ paddingLeft: `${indent}px` }}>
              {hasChildren ? (
                <button
                  onClick={() => toggleExpand(competency.id)}
                  className="mr-2 p-1 hover:bg-gray-200 rounded transition-colors"
                  title={isExpanded ? 'Collapse' : 'Expand'}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-gray-600" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-600" />
                  )}
                </button>
              ) : (
                <span className="w-6"></span>
              )}
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                {competency.code}
              </span>
            </div>
          </td>

          {/* Name */}
          <td className="px-4 py-3">
            <div className="flex items-center space-x-2">
              <span className="font-medium text-gray-900">{competency.name}</span>
              {!competency.is_active && (
                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded">
                  Inactive
                </span>
              )}
            </div>
            {competency.description && (
              <p className="text-sm text-gray-500 mt-1">{competency.description}</p>
            )}
          </td>

          {/* Thresholds */}
          <td className="px-4 py-3">
            <div className="flex items-center space-x-4 text-sm">
              {competency.strong_threshold !== null && competency.strong_threshold !== undefined ? (
                <div className="flex items-center space-x-1">
                  <span className="text-green-600 font-medium">Strong: ≥{competency.strong_threshold}</span>
                </div>
              ) : (
                <span className="text-gray-400">-</span>
              )}
              {competency.neutral_threshold !== null && competency.neutral_threshold !== undefined ? (
                <div className="flex items-center space-x-1">
                  <span className="text-yellow-600 font-medium">Neutral: ≥{competency.neutral_threshold}</span>
                </div>
              ) : (
                <span className="text-gray-400">-</span>
              )}
            </div>
          </td>

          {/* Statistics */}
          <td className="px-4 py-3">
            {competencyStats ? (
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-1">
                  <FileText className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">{competencyStats.questions_linked}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Users className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">{competencyStats.students_assessed}</span>
                </div>
                {competencyStats.average_score !== null && competencyStats.average_score !== undefined && (
                  <div className="flex items-center space-x-1">
                    {getPerformanceIcon(competencyStats.average_score)}
                    <span className="text-gray-600 font-medium">
                      {typeof competencyStats.average_score === 'number' 
                        ? competencyStats.average_score.toFixed(1) 
                        : Number(competencyStats.average_score || 0).toFixed(1)}%
                    </span>
                  </div>
                )}
                {competencyStats.students_assessed > 0 && (
                  <div className="flex items-center space-x-2">
                    <div className="flex h-2 w-16 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="bg-green-500 h-full"
                        style={{ width: `${((Number(competencyStats.strong_count) || 0) / (Number(competencyStats.students_assessed) || 1)) * 100}%` }}
                        title={`Strong: ${competencyStats.strong_count}`}
                      ></div>
                      <div 
                        className="bg-yellow-500 h-full"
                        style={{ width: `${((Number(competencyStats.neutral_count) || 0) / (Number(competencyStats.students_assessed) || 1)) * 100}%` }}
                        title={`Neutral: ${competencyStats.neutral_count}`}
                      ></div>
                      <div 
                        className="bg-red-500 h-full"
                        style={{ width: `${((Number(competencyStats.growth_count) || 0) / (Number(competencyStats.students_assessed) || 1)) * 100}%` }}
                        title={`Growth: ${competencyStats.growth_count}`}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <span className="text-gray-400 text-sm">No data</span>
            )}
          </td>

          {/* Actions */}
          <td className="px-4 py-3">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onEditCompetency(competency)}
                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                title="Edit competency"
              >
                <Edit className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleDeleteCompetency(competency)}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                title="Delete competency"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </td>
        </tr>

        {/* Render children if expanded */}
        {hasChildren && isExpanded && competency.children.map(child => {
          const childWithChildren = competencyMap.get(child.id);
          if (childWithChildren) {
            return renderCompetencyRow(childWithChildren, level + 1, competencyMap);
          }
          return null;
        })}
      </React.Fragment>
      );
    } catch (error) {
      console.error('Error rendering competency row:', error, competency);
      return (
        <tr key={competency.id} className="border-b border-gray-200">
          <td colSpan={5} className="px-4 py-3 text-red-600">
            Error loading competency: {competency.name}
          </td>
        </tr>
      );
    }
  };

  const competencyMap = buildHierarchy(competencies);
  const rootCompetencies = getRootCompetencies(competencyMap);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Competencies</h2>
          <p className="text-gray-600">Manage competency-based assessment criteria with hierarchical structure</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
          >
            <Upload className="h-4 w-4" />
            <span>Import CSV</span>
          </button>
          <button
            onClick={onAddCompetency}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Competency</span>
          </button>
        </div>
      </div>

      {/* Import Modal */}
      <CompetencyCSVImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportComplete={() => {
          setShowImportModal(false);
          loadCompetencies();
        }}
      />

      {/* Search Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center space-x-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search competencies by code, name, or description..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {searchTerm && (
              <button
                onClick={() => handleSearch('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Competencies List View */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Code
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thresholds
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statistics
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rootCompetencies.length > 0 ? (
                rootCompetencies.map(competency => 
                  renderCompetencyRow(competency, 0, competencyMap)
                )
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <div className="text-gray-400 text-6xl mb-4">📊</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {searchTerm ? 'No Competencies Found' : 'No Competencies Found'}
                    </h3>
                    <p className="text-gray-600 mb-6">
                      {searchTerm 
                        ? `No competencies match "${searchTerm}". Try a different search term.`
                        : 'Create your first competency to start tracking student performance across different skills.'}
                    </p>
                    {!searchTerm && (
                      <button
                        onClick={onAddCompetency}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 mx-auto"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Create First Competency</span>
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm text-gray-700">
              <span>
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, pagination.total || 0)} of {pagination.total || 0} competencies
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={!pagination.hasPreviousPage}
                className={`px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium transition-colors ${
                  pagination.hasPreviousPage
                    ? 'bg-white text-gray-700 hover:bg-gray-50'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              
              <div className="flex items-center space-x-1">
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => {
                  // Show first page, last page, current page, and pages around current
                  if (
                    page === 1 ||
                    page === pagination.totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                          page === currentPage
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  } else if (
                    page === currentPage - 2 ||
                    page === currentPage + 2
                  ) {
                    return (
                      <span key={page} className="px-2 text-gray-400">
                        ...
                      </span>
                    );
                  }
                  return null;
                })}
              </div>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={!pagination.hasNextPage}
                className={`px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium transition-colors ${
                  pagination.hasNextPage
                    ? 'bg-white text-gray-700 hover:bg-gray-50'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompetencyList;
