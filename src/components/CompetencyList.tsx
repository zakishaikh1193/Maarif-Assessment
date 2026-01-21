import React, { useState, useEffect } from 'react';
import { Competency, CompetencyStats } from '../types';
import { competenciesAPI } from '../services/api';
import { Plus, Edit, Trash2, Eye, Users, FileText, TrendingUp, TrendingDown, Minus } from 'lucide-react';

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

  useEffect(() => {
    loadCompetencies();
  }, [refreshTrigger]);

  const loadCompetencies = async () => {
    try {
      setLoading(true);
      const [competenciesData, statsData] = await Promise.all([
        competenciesAPI.getAll(),
        competenciesAPI.getStats()
      ]);
      setCompetencies(competenciesData);
      setStats(statsData);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to load competencies');
    } finally {
      setLoading(false);
    }
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

  const getCompetencyStats = (competencyId: number) => {
    return stats.find(stat => stat.id === competencyId);
  };

  const getPerformanceIcon = (averageScore: number) => {
    if (averageScore >= 70) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (averageScore >= 50) return <Minus className="h-4 w-4 text-yellow-600" />;
    return <TrendingDown className="h-4 w-4 text-red-600" />;
  };

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
          <p className="text-gray-600">Manage competency-based assessment criteria</p>
        </div>
        <button
          onClick={onAddCompetency}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Add Competency</span>
        </button>
      </div>

      {/* Competencies Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {competencies.map((competency) => {
          const competencyStats = getCompetencyStats(competency.id);
          
          return (
            <div key={competency.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                      {competency.code}
                    </span>
                    {!competency.is_active && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded">
                        Inactive
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">{competency.name}</h3>
                  {competency.description && (
                    <p className="text-sm text-gray-600 mt-1">{competency.description}</p>
                  )}
                </div>
                
                {/* Actions */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onEditCompetency(competency)}
                    className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                    title="Edit competency"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteCompetency(competency)}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    title="Delete competency"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Thresholds */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-sm font-medium text-green-800">Strong</div>
                  <div className="text-lg font-bold text-green-600">≥{competency.strong_threshold}</div>
                </div>
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <div className="text-sm font-medium text-yellow-800">Neutral</div>
                  <div className="text-lg font-bold text-yellow-600">≥{competency.neutral_threshold}</div>
                </div>
              </div>

              {/* Statistics */}
              {competencyStats && (
                <div className="border-t border-gray-200 pt-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Usage Statistics</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">
                        {competencyStats.questions_linked} questions
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">
                        {competencyStats.students_assessed} students
                      </span>
                    </div>
                    {competencyStats.average_score !== null && (
                      <div className="flex items-center space-x-2 col-span-2">
                        {getPerformanceIcon(competencyStats.average_score)}
                        <span className="text-gray-600">
                          Avg: {competencyStats.average_score}%
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Performance Distribution */}
                  {competencyStats.students_assessed > 0 && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                        <span>Performance Distribution</span>
                        <span>{competencyStats.students_assessed} total</span>
                      </div>
                      <div className="flex h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="bg-green-500 h-full"
                          style={{ width: `${(competencyStats.strong_count / competencyStats.students_assessed) * 100}%` }}
                          title={`Strong: ${competencyStats.strong_count}`}
                        ></div>
                        <div 
                          className="bg-yellow-500 h-full"
                          style={{ width: `${(competencyStats.neutral_count / competencyStats.students_assessed) * 100}%` }}
                          title={`Neutral: ${competencyStats.neutral_count}`}
                        ></div>
                        <div 
                          className="bg-red-500 h-full"
                          style={{ width: `${(competencyStats.growth_count / competencyStats.students_assessed) * 100}%` }}
                          title={`Growth: ${competencyStats.growth_count}`}
                        ></div>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Strong: {competencyStats.strong_count}</span>
                        <span>Neutral: {competencyStats.neutral_count}</span>
                        <span>Growth: {competencyStats.growth_count}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* No Statistics */}
              {!competencyStats && (
                <div className="border-t border-gray-200 pt-4">
                  <p className="text-sm text-gray-500 text-center">No usage data available</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {competencies.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">📊</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Competencies Found</h3>
          <p className="text-gray-600 mb-6">Create your first competency to start tracking student performance across different skills.</p>
          <button
            onClick={onAddCompetency}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 mx-auto"
          >
            <Plus className="h-4 w-4" />
            <span>Create First Competency</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default CompetencyList;
