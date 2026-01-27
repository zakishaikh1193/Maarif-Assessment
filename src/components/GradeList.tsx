import React, { useState, useEffect } from 'react';
import { Grade } from '../types';
import { gradesAPI } from '../services/api';
import GradeForm from './GradeForm';
import { Edit, Trash2, X } from 'lucide-react';

interface GradeListProps {
  onGradeSelected?: (grade: Grade) => void;
}

const GradeList: React.FC<GradeListProps> = ({ onGradeSelected }) => {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showGradeForm, setShowGradeForm] = useState(false);
  const [editingGrade, setEditingGrade] = useState<Grade | null>(null);
  const [deletingGrade, setDeletingGrade] = useState<number | null>(null);
  const [selectedGrades, setSelectedGrades] = useState<Set<number>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const fetchGrades = async () => {
    try {
      setLoading(true);
      const data = await gradesAPI.getAll();
      setGrades(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch grades');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGrades();
  }, []);

  const handleAddGrade = () => {
    setEditingGrade(null);
    setShowGradeForm(true);
  };

  const handleEditGrade = (grade: Grade) => {
    setEditingGrade(grade);
    setShowGradeForm(true);
  };

  const handleDeleteGrade = async (gradeId: number) => {
    if (!window.confirm('Are you sure you want to delete this grade? This action cannot be undone.')) {
      return;
    }

    try {
      setDeletingGrade(gradeId);
      await gradesAPI.delete(gradeId);
      
      // Remove from selection if it was selected
      setSelectedGrades(prev => {
        const newSet = new Set(prev);
        newSet.delete(gradeId);
        return newSet;
      });
      
      await fetchGrades();
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to delete grade';
      alert(errorMessage);
    } finally {
      setDeletingGrade(null);
    }
  };

  const handleSelectGrade = (gradeId: number) => {
    setSelectedGrades(prev => {
      const newSet = new Set(prev);
      if (newSet.has(gradeId)) {
        newSet.delete(gradeId);
      } else {
        newSet.add(gradeId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedGrades.size === grades.length) {
      setSelectedGrades(new Set());
    } else {
      setSelectedGrades(new Set(grades.map(g => g.id)));
    }
  };

  const handleToggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    if (isSelectionMode) {
      // Clear selection when exiting selection mode
      setSelectedGrades(new Set());
    }
  };

  const handleBulkDelete = async () => {
    if (selectedGrades.size === 0) return;

    const count = selectedGrades.size;
    const confirmMessage = `Are you sure you want to delete ${count} grade${count > 1 ? 's' : ''}? This action cannot be undone.`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setBulkDeleting(true);
      const gradeIds = Array.from(selectedGrades);
      const deletePromises = gradeIds.map(id => gradesAPI.delete(id));
      
      // Delete all selected grades
      const results = await Promise.allSettled(deletePromises);
      
      // Check for failures
      const failures = results.filter(result => result.status === 'rejected');
      if (failures.length > 0) {
        const errorMessages = failures.map((failure: any) => 
          failure.reason?.response?.data?.error || 'Unknown error'
        ).join(', ');
        alert(`Failed to delete ${failures.length} grade(s): ${errorMessages}`);
      } else {
        // Success - clear selection, exit selection mode, and refresh
        setSelectedGrades(new Set());
        setIsSelectionMode(false);
        await fetchGrades();
      }
    } catch (err: any) {
      alert('An error occurred during bulk deletion. Please try again.');
      console.error('Bulk delete error:', err);
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleGradeCreated = () => {
    fetchGrades();
  };

  const handleGradeUpdated = () => {
    fetchGrades();
  };

  const getGradeType = (gradeLevel?: number | null) => {
    if (!gradeLevel) return 'Other';
    if (gradeLevel <= 5) return 'Elementary';
    if (gradeLevel <= 8) return 'Middle';
    return 'High';
  };

  const getGradeTypeColor = (gradeLevel?: number | null) => {
    if (!gradeLevel) return 'bg-gray-100 text-gray-800';
    if (gradeLevel <= 5) return 'bg-green-100 text-green-800';
    if (gradeLevel <= 8) return 'bg-yellow-100 text-yellow-800';
    return 'bg-blue-100 text-blue-800';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Grades</h2>
        <div className="flex items-center gap-3">
          {!isSelectionMode ? (
            <>
              <button
                onClick={handleToggleSelectionMode}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center space-x-2 shadow-md transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete Grade</span>
              </button>
              <button
                onClick={handleAddGrade}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2 shadow-md"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>+ Add Grade</span>
              </button>
            </>
          ) : (
            <>
              {selectedGrades.size > 0 && (
                <button
                  onClick={handleBulkDelete}
                  disabled={bulkDeleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 shadow-md transition-colors"
                >
                  {bulkDeleting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      <span>Delete Selected ({selectedGrades.size})</span>
                    </>
                  )}
                </button>
              )}
              <button
                onClick={handleToggleSelectionMode}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center space-x-2 shadow-md transition-colors"
              >
                <X className="h-4 w-4" />
                <span>Cancel</span>
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
          {error}
        </div>
      )}

      {grades.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No grades</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new grade.</p>
          <div className="mt-6">
            <button
              onClick={handleAddGrade}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Grade
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {isSelectionMode && selectedGrades.size > 0 && (
            <div className="px-6 py-3 border-b border-gray-200 bg-blue-50">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-blue-900">
                  {selectedGrades.size} grade{selectedGrades.size > 1 ? 's' : ''} selected
                </p>
                <button
                  onClick={() => setSelectedGrades(new Set())}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white border-b border-gray-200">
                <tr>
                  {isSelectionMode && (
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedGrades.size === grades.length && grades.length > 0}
                        onChange={handleSelectAll}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Grade</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Details</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {grades.map((grade, index) => {
                  const isSelected = selectedGrades.has(grade.id);
                  const isEven = index % 2 === 0;
                  return (
                    <tr
                      key={grade.id}
                      className={`transition-colors ${
                        isSelected 
                          ? 'bg-purple-50 border-l-4 border-purple-500' 
                          : isEven 
                            ? 'bg-white' 
                            : 'bg-gray-50'
                      } hover:bg-gray-100`}
                    >
                      {isSelectionMode && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectGrade(grade.id)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              {grade.display_name}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getGradeTypeColor(grade.grade_level)}`}>
                          {getGradeType(grade.grade_level)}
                        </span>
                        {!grade.is_active && (
                          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-500">
                          {grade.grade_level ? `Level ${grade.grade_level} • ` : ''}{grade.name}
                        </p>
                        {grade.description && (
                          <p className="text-sm text-gray-400">
                            {grade.description}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleEditGrade(grade)}
                            className="text-gray-400 hover:text-blue-600 transition-colors"
                            title="Edit grade"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteGrade(grade.id)}
                            disabled={deletingGrade === grade.id}
                            className="text-gray-400 hover:text-red-600 disabled:opacity-50 transition-colors"
                            title="Delete grade"
                          >
                            {deletingGrade === grade.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showGradeForm && (
        <GradeForm
          grade={editingGrade}
          onClose={() => setShowGradeForm(false)}
          onGradeCreated={handleGradeCreated}
          onGradeUpdated={handleGradeUpdated}
        />
      )}
    </div>
  );
};

export default GradeList;
