import React, { useState, useEffect } from 'react';
import { School } from '../types';
import { schoolsAPI } from '../services/api';
import SchoolForm from './SchoolForm';

interface SchoolListProps {
  onSchoolSelected?: (school: School) => void;
}

const SchoolList: React.FC<SchoolListProps> = ({ onSchoolSelected }) => {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showSchoolForm, setShowSchoolForm] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [deletingSchool, setDeletingSchool] = useState<number | null>(null);

  const fetchSchools = async () => {
    try {
      setLoading(true);
      const data = await schoolsAPI.getAll();
      setSchools(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch schools');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchools();
  }, []);

  const handleAddSchool = () => {
    setEditingSchool(null);
    setShowSchoolForm(true);
  };

  const handleEditSchool = (school: School) => {
    setEditingSchool(school);
    setShowSchoolForm(true);
  };

  const handleDeleteSchool = async (schoolId: number) => {
    if (!window.confirm('Are you sure you want to delete this school? This action cannot be undone.')) {
      return;
    }

    try {
      setDeletingSchool(schoolId);
      await schoolsAPI.delete(schoolId);
      await fetchSchools();
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to delete school';
      alert(errorMessage);
    } finally {
      setDeletingSchool(null);
    }
  };

  const handleSchoolCreated = () => {
    fetchSchools();
  };

  const handleSchoolUpdated = () => {
    fetchSchools();
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
        <h3 className="text-lg font-semibold text-gray-900">Schools</h3>
        <button
          onClick={handleAddSchool}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Add School</span>
        </button>
      </div>

      {error && (
        <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
          {error}
        </div>
      )}

      {schools.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No schools</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new school.</p>
          <div className="mt-6">
            <button
              onClick={handleAddSchool}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add School
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {schools.map((school) => (
              <li key={school.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {school.name}
                        </p>
                        {school.address && (
                          <p className="text-sm text-gray-500 truncate">
                            {school.address}
                          </p>
                        )}
                        <div className="flex space-x-4 text-xs text-gray-400">
                          {school.contact_email && (
                            <span>{school.contact_email}</span>
                          )}
                          {school.contact_phone && (
                            <span>{school.contact_phone}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {onSchoolSelected && (
                      <button
                        onClick={() => onSchoolSelected(school)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Select
                      </button>
                    )}
                    <button
                      onClick={() => handleEditSchool(school)}
                      className="text-gray-400 hover:text-gray-600"
                      title="Edit school"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteSchool(school.id)}
                      disabled={deletingSchool === school.id}
                      className="text-gray-400 hover:text-red-600 disabled:opacity-50"
                      title="Delete school"
                    >
                      {deletingSchool === school.id ? (
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

      {showSchoolForm && (
        <SchoolForm
          school={editingSchool}
          onClose={() => setShowSchoolForm(false)}
          onSchoolCreated={handleSchoolCreated}
          onSchoolUpdated={handleSchoolUpdated}
        />
      )}
    </div>
  );
};

export default SchoolList;
