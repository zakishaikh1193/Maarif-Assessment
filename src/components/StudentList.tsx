import React, { useState, useEffect, useMemo } from 'react';
import { studentsAPI, schoolsAPI, gradesAPI } from '../services/api';
import StudentForm from './StudentForm';
import { Search, Building, GraduationCap, X, Upload, ChevronLeft, ChevronRight, Edit, Trash2 } from 'lucide-react';

interface StudentListProps {
  onStudentSelected?: (student: any) => void;
  refreshTrigger?: number;
  onImportCSV?: () => void;
}

const StudentList: React.FC<StudentListProps> = ({ onStudentSelected, refreshTrigger, onImportCSV }) => {
  const [students, setStudents] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]); // Store all students when filters are active
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
  const [selectedStudents, setSelectedStudents] = useState<Set<number>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);

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

  const fetchAllStudents = async () => {
    try {
      setLoading(true);
      // Fetch all students with a large limit
      const response = await studentsAPI.getAll(1, 10000);
      const allStudentsData = response.students || [];
      setAllStudents(allStudentsData);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch all students');
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

  // Check if filters are active
  const hasActiveFilters = searchTerm || selectedSchoolId || selectedGradeId;

  useEffect(() => {
    if (hasActiveFilters) {
      // When filters are active, fetch all students for client-side filtering
      fetchAllStudents();
    } else {
      // When no filters, use server-side pagination
      fetchStudents(currentPage);
    }
    fetchSchoolsAndGrades();
  }, [refreshTrigger, currentPage, hasActiveFilters]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedStudents(new Set()); // Clear selection when filters change
    setIsSelectionMode(false); // Exit selection mode when filters change
  }, [searchTerm, selectedSchoolId, selectedGradeId]);

  // Filter students based on search term, school, and grade
  const filteredStudents = useMemo(() => {
    // Use allStudents when filters are active, otherwise use students (current page)
    const studentsToFilter = hasActiveFilters ? allStudents : students;
    
    return studentsToFilter.filter((student) => {
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
  }, [students, allStudents, searchTerm, selectedSchoolId, selectedGradeId, hasActiveFilters]);

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
      
      // Remove from selection if it was selected
      setSelectedStudents(prev => {
        const newSet = new Set(prev);
        newSet.delete(studentId);
        return newSet;
      });
      
      // If current page becomes empty after deletion, go to previous page
      if (filteredStudents.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      } else {
        if (hasActiveFilters) {
          await fetchAllStudents();
        } else {
          await fetchStudents(currentPage);
        }
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
    if (hasActiveFilters) {
      fetchAllStudents();
    } else {
      fetchStudents(currentPage);
    }
  };

  const handlePageChange = (newPage: number) => {
    const maxPages = hasActiveFilters ? filteredTotalPages : totalPages;
    if (newPage >= 1 && newPage <= maxPages) {
      setCurrentPage(newPage);
      setSelectedStudents(new Set()); // Clear selection when page changes
      setIsSelectionMode(false); // Exit selection mode when page changes
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSelectStudent = (studentId: number) => {
    setSelectedStudents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(studentId)) {
        newSet.delete(studentId);
      } else {
        newSet.add(studentId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedStudents.size === paginatedStudents.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(paginatedStudents.map(s => s.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedStudents.size === 0) return;

    const count = selectedStudents.size;
    const confirmMessage = `Are you sure you want to delete ${count} student${count > 1 ? 's' : ''}? This action cannot be undone.`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setBulkDeleting(true);
      const studentIds = Array.from(selectedStudents);
      const deletePromises = studentIds.map(id => studentsAPI.delete(id));
      
      // Delete all selected students
      const results = await Promise.allSettled(deletePromises);
      
      // Check for failures
      const failures = results.filter(result => result.status === 'rejected');
      if (failures.length > 0) {
        const errorMessages = failures.map((failure: any) => 
          failure.reason?.response?.data?.error || 'Unknown error'
        ).join(', ');
        alert(`Failed to delete ${failures.length} student(s): ${errorMessages}`);
      } else {
        // Success - clear selection, exit selection mode, and refresh
        setSelectedStudents(new Set());
        setIsSelectionMode(false);
        // If current page becomes empty after deletion, go to previous page
        const remainingCount = filteredStudents.length - count;
        if (remainingCount === 0 && currentPage > 1) {
          setCurrentPage(currentPage - 1);
        } else {
          await fetchStudents(currentPage);
        }
      }
    } catch (err: any) {
      alert('An error occurred during bulk deletion. Please try again.');
      console.error('Bulk delete error:', err);
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleToggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    if (isSelectionMode) {
      // Clear selection when exiting selection mode
      setSelectedStudents(new Set());
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
          <h2 className="text-2xl font-bold text-gray-900">Students</h2>
          <p className="text-sm text-gray-600 mt-1">Manage all students in the system</p>
        </div>
        <div className="flex items-center gap-3">
          {!isSelectionMode ? (
            <>
              <button
                onClick={handleToggleSelectionMode}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center space-x-2 shadow-md transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete Student</span>
              </button>
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
            </>
          ) : (
            <>
              {selectedStudents.size > 0 && (
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
                      <span>Delete Selected ({selectedStudents.size})</span>
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
          {isSelectionMode && selectedStudents.size > 0 && (
            <div className="px-6 py-3 border-b border-gray-200 bg-blue-50">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-blue-900">
                  {selectedStudents.size} student{selectedStudents.size > 1 ? 's' : ''} selected
                </p>
                <button
                  onClick={() => setSelectedStudents(new Set())}
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
                        checked={selectedStudents.size === paginatedStudents.length && paginatedStudents.length > 0}
                        onChange={handleSelectAll}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">#</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Full Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Username</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">School</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Grade</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedStudents.map((student, index) => {
                  const isSelected = selectedStudents.has(student.id);
                  const rowNumber = (currentPage - 1) * studentsPerPage + index + 1;
                  const isEven = index % 2 === 0;
                  return (
                    <tr
                      key={student.id}
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
                            onChange={() => handleSelectStudent(student.id)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {rowNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-semibold text-blue-600">
                              {student.first_name?.[0]?.toUpperCase() || ''}{student.last_name?.[0]?.toUpperCase() || ''}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-gray-900">
                                {student.first_name} {student.last_name}
                              </p>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                Student
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        @{student.username}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {student.school_name || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {student.grade_name || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleEditStudent(student)}
                            className="text-gray-400 hover:text-blue-600 transition-colors"
                            title="Edit student"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteStudent(student.id)}
                            disabled={deletingStudent === student.id}
                            className="text-gray-400 hover:text-red-600 disabled:opacity-50 transition-colors"
                            title="Delete student"
                          >
                            {deletingStudent === student.id ? (
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
