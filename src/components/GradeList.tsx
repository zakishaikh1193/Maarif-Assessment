import React, { useState, useEffect } from 'react';
import { Grade } from '../types';
import { gradesAPI } from '../services/api';
import GradeForm from './GradeForm';

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
      await fetchGrades();
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to delete grade';
      alert(errorMessage);
    } finally {
      setDeletingGrade(null);
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
        <h3 className="text-lg font-semibold text-gray-900">Grades</h3>
        <button
          onClick={handleAddGrade}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Add Grade</span>
        </button>
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
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {grades.map((grade) => (
              <li key={grade.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {grade.display_name}
                          </p>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getGradeTypeColor(grade.grade_level)}`}>
                            {getGradeType(grade.grade_level)}
                          </span>
                          {!grade.is_active && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Inactive
                            </span>
                          )}
                        </div>
                                                 <p className="text-sm text-gray-500 truncate">
                           {grade.grade_level ? `Level ${grade.grade_level} • ` : ''}{grade.name}
                         </p>
                        {grade.description && (
                          <p className="text-sm text-gray-400 truncate">
                            {grade.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {onGradeSelected && (
                      <button
                        onClick={() => onGradeSelected(grade)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Select
                      </button>
                    )}
                    <button
                      onClick={() => handleEditGrade(grade)}
                      className="text-gray-400 hover:text-gray-600"
                      title="Edit grade"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteGrade(grade.id)}
                      disabled={deletingGrade === grade.id}
                      className="text-gray-400 hover:text-red-600 disabled:opacity-50"
                      title="Delete grade"
                    >
                      {deletingGrade === grade.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
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
