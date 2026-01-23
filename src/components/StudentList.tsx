import React, { useState, useEffect, useMemo } from 'react';
import { studentsAPI, schoolsAPI, gradesAPI } from '../services/api';
import StudentForm from './StudentForm';
import { Search, Building, GraduationCap, X, Upload } from 'lucide-react';

interface StudentListProps {
  onStudentSelected?: (student: any) => void;
  refreshTrigger?: number;
  onImportCSV?: () => void;
}

const StudentList: React.FC<StudentListProps> = ({ onStudentSelected, refreshTrigger, onImportCSV }) => {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showStudentForm, setShowStudentForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any | null>(null);
  const [deletingStudent, setDeletingStudent] = useState<number | null>(null);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSchoolId, setSelectedSchoolId] = useState<number | null>(null);
  const [selectedGradeId, setSelectedGradeId] = useState<number | null>(null);
  const [schools, setSchools] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const data = await studentsAPI.getAll();
      setStudents(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch students');
    } finally {
      setLoading(false);
    }
  };

  const fetchSchoolsAndGrades = async () => {
    try {
      const [schoolsData, gradesData] = await Promise.all([
        schoolsAPI.getAll(),
        gradesAPI.getActive()
      ]);
      setSchools(schoolsData);
      setGrades(gradesData);
    } catch (err: any) {
      console.error('Failed to fetch schools and grades:', err);
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchSchoolsAndGrades();
  }, [refreshTrigger]);

  // Filter students based on search term, school, and grade
  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      // Search filter (name or username)
      const matchesSearch = !searchTerm || 
        (student.first_name && student.first_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (student.last_name && student.last_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (student.username && student.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (`${student.first_name || ''} ${student.last_name || ''}`.toLowerCase().includes(searchTerm.toLowerCase()));

      // School filter
      const matchesSchool = !selectedSchoolId || student.school_id === selectedSchoolId;

      // Grade filter
      const matchesGrade = !selectedGradeId || student.grade_id === selectedGradeId;

      return matchesSearch && matchesSchool && matchesGrade;
    });
  }, [students, searchTerm, selectedSchoolId, selectedGradeId]);

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedSchoolId(null);
    setSelectedGradeId(null);
  };

  const hasActiveFilters = searchTerm || selectedSchoolId || selectedGradeId;

  const handleAddStudent = () => {
    setEditingStudent(null);
    setShowStudentForm(true);
  };

  const handleEditStudent = (student: any) => {
    setEditingStudent(student);
    setShowStudentForm(true);
  };

  const handleDeleteStudent = async (studentId: number) => {
    if (!window.confirm('Are you sure you want to delete this student? This action cannot be undone.')) {
      return;
    }

    try {
      setDeletingStudent(studentId);
      await studentsAPI.delete(studentId);
      await fetchStudents();
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to delete student';
      alert(errorMessage);
    } finally {
      setDeletingStudent(null);
    }
  };

  const handleStudentCreated = () => {
    fetchStudents();
  };

  const handleStudentUpdated = () => {
    fetchStudents();
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
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Student Management</h2>
          <p className="text-sm text-gray-600 mt-1">Manage all students in the system</p>
        </div>
        <div className="flex items-center gap-3">
          {onImportCSV && (
            <button
              onClick={onImportCSV}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2 shadow-md"
            >
              <Upload className="h-4 w-4" />
              <span>Import CSV</span>
            </button>
          )}
          <button
            onClick={handleAddStudent}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2 shadow-md"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>+ Add Student</span>
          </button>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <X className="h-4 w-4" />
              Clear Filters
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search Bar */}
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Search className="h-4 w-4 text-gray-500" />
              <span>Search by Name</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search students..."
                className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* School Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Building className="h-4 w-4 text-purple-600" />
              <span>Filter by School</span>
            </label>
            <select
              value={selectedSchoolId || ''}
              onChange={(e) => setSelectedSchoolId(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
            >
              <option value="">All Schools</option>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
          </div>

          {/* Grade Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-orange-600" />
              <span>Filter by Grade</span>
            </label>
            <select
              value={selectedGradeId || ''}
              onChange={(e) => setSelectedGradeId(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
            >
              <option value="">All Grades</option>
              {grades.map((grade) => (
                <option key={grade.id} value={grade.id}>
                  {grade.display_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Results Count */}
        {hasActiveFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Showing <span className="font-semibold text-gray-900">{filteredStudents.length}</span> of{' '}
              <span className="font-semibold text-gray-900">{students.length}</span> students
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
          {error}
        </div>
      )}

      {filteredStudents.length === 0 && students.length > 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <Search className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No students found</h3>
          <p className="text-sm text-gray-500 mb-4">
            {hasActiveFilters 
              ? 'Try adjusting your filters to see more results.'
              : 'No students match your search criteria.'}
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : students.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No students</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new student.</p>
          <div className="mt-6">
            <button
              onClick={handleAddStudent}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Student
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Students</h3>
          </div>
          <ul className="divide-y divide-gray-200">
            {filteredStudents.map((student) => (
              <li key={student.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                          <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                          </svg>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {student.first_name} {student.last_name}
                          </p>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Student
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 truncate">
                          @{student.username}
                        </p>
                        <div className="flex space-x-4 text-xs text-gray-400">
                          {student.school_name && (
                            <span>{student.school_name}</span>
                          )}
                          {student.grade_name && (
                            <span>• {student.grade_name}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {onStudentSelected && (
                      <button
                        onClick={() => onStudentSelected(student)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Select
                      </button>
                    )}
                    <button
                      onClick={() => handleEditStudent(student)}
                      className="text-gray-400 hover:text-gray-600"
                      title="Edit student"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteStudent(student.id)}
                      disabled={deletingStudent === student.id}
                      className="text-gray-400 hover:text-red-600 disabled:opacity-50"
                      title="Delete student"
                    >
                      {deletingStudent === student.id ? (
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

      {showStudentForm && (
        <StudentForm
          student={editingStudent}
          onClose={() => setShowStudentForm(false)}
          onStudentCreated={handleStudentCreated}
          onStudentUpdated={handleStudentUpdated}
        />
      )}
    </div>
  );
};

export default StudentList;
