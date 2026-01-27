import React, { useState, useEffect, useMemo } from 'react';
import { studentsAPI, schoolsAPI, gradesAPI } from '../services/api';
import StudentForm from './StudentForm';
import { Search, Building, GraduationCap, X, Upload, ChevronLeft, ChevronRight } from 'lucide-react';

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
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalStudents, setTotalStudents] = useState(0);
  const studentsPerPage = 10;
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSchoolId, setSelectedSchoolId] = useState<number | null>(null);
  const [selectedGradeId, setSelectedGradeId] = useState<number | null>(null);
  const [schools, setSchools] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);

  // Ensure schools is always an array
  const safeSchools = Array.isArray(schools) ? schools : [];

  const fetchStudents = async (page: number = currentPage) => {
    try {
      setLoading(true);
      const response = await studentsAPI.getAll(page, studentsPerPage);
      setStudents(response.students || []);
      if (response.pagination) {
        setTotalPages(response.pagination.totalPages);
        setTotalStudents(response.pagination.totalStudents);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch students');
    } finally {
      setLoading(false);
    }
  };

  const fetchSchoolsAndGrades = async () => {
    try {
      const [schoolsResponse, gradesData] = await Promise.all([
        schoolsAPI.getAll(1, 1000), // Get all schools for dropdown (large limit)
        gradesAPI.getActive()
      ]);
      // Handle paginated response structure
      const schoolsData = Array.isArray(schoolsResponse) ? schoolsResponse : (schoolsResponse.schools || []);
      setSchools(schoolsData);
      setGrades(gradesData);
    } catch (err: any) {
      console.error('Failed to fetch schools and grades:', err);
    }
  };

  useEffect(() => {
    fetchStudents(currentPage);
    fetchSchoolsAndGrades();
  }, [refreshTrigger, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedSchoolId, selectedGradeId]);

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

  // Check if filters are active
  const hasActiveFilters = searchTerm || selectedSchoolId || selectedGradeId;

  // Paginate filtered students
  const paginatedStudents = useMemo(() => {
    if (hasActiveFilters) {
      const startIndex = (currentPage - 1) * studentsPerPage;
      const endIndex = startIndex + studentsPerPage;
      return filteredStudents.slice(startIndex, endIndex);
    }
    return filteredStudents;
  }, [filteredStudents, currentPage, hasActiveFilters]);

  // Calculate total pages for filtered results
  const filteredTotalPages = useMemo(() => {
    if (hasActiveFilters) {
      return Math.ceil(filteredStudents.length / studentsPerPage);
    }
    return totalPages;
  }, [filteredStudents.length, hasActiveFilters, totalPages]);

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedSchoolId(null);
    setSelectedGradeId(null);
    setCurrentPage(1); // Reset to first page when clearing filters
  };

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
      // If current page becomes empty after deletion, go to previous page
      if (filteredStudents.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      } else {
        await fetchStudents(currentPage);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to delete student';
      alert(errorMessage);
    } finally {
      setDeletingStudent(null);
    }
  };

  const handleStudentCreated = () => {
    // Reset to first page and fetch
    setCurrentPage(1);
    fetchStudents(1);
  };

  const handleStudentUpdated = () => {
    fetchStudents(currentPage);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
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
              {safeSchools.map((school) => (
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
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            {hasActiveFilters ? (
              <>
                Showing <span className="font-semibold text-gray-900">
                  {Math.min((currentPage - 1) * studentsPerPage + 1, filteredStudents.length)} - {Math.min(currentPage * studentsPerPage, filteredStudents.length)}
                </span> of{' '}
                <span className="font-semibold text-gray-900">{filteredStudents.length}</span> filtered students
              </>
            ) : (
              <>
                Showing <span className="font-semibold text-gray-900">
                  {Math.min((currentPage - 1) * studentsPerPage + 1, totalStudents)} - {Math.min(currentPage * studentsPerPage, totalStudents)}
                </span> of{' '}
                <span className="font-semibold text-gray-900">{totalStudents}</span> students
              </>
            )}
          </p>
        </div>
      </div>

      {error && (
        <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
          {error}
        </div>
      )}

      {paginatedStudents.length === 0 && filteredStudents.length === 0 && students.length > 0 ? (
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
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    School Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student Grade
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mr-3">
                          <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                          </svg>
                        </div>
                        <div className="text-sm font-medium text-gray-900">
                          {student.first_name} {student.last_name}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {student.school_name || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {student.grade_name || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-3">
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
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(student.id)}
                          disabled={deletingStudent === student.id}
                          className="text-gray-400 hover:text-red-600 disabled:opacity-50"
                          title="Delete student"
                        >
                          {deletingStudent === student.id ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600"></div>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Controls */}
          {(filteredTotalPages > 1 || totalPages > 1) && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="flex items-center text-sm text-gray-700">
                <span>
                  Page <span className="font-medium">{currentPage}</span> of{' '}
                  <span className="font-medium">{hasActiveFilters ? filteredTotalPages : totalPages}</span>
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`px-3 py-2 text-sm font-medium rounded-md ${
                    currentPage === 1
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                  }`}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                
                {/* Page Numbers */}
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, hasActiveFilters ? filteredTotalPages : totalPages) }, (_, i) => {
                    const maxPages = hasActiveFilters ? filteredTotalPages : totalPages;
                    let pageNum: number;
                    if (maxPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= maxPages - 2) {
                      pageNum = maxPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`px-3 py-2 text-sm font-medium rounded-md ${
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === (hasActiveFilters ? filteredTotalPages : totalPages)}
                  className={`px-3 py-2 text-sm font-medium rounded-md ${
                    currentPage === (hasActiveFilters ? filteredTotalPages : totalPages)
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                  }`}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
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
