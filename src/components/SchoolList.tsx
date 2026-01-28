import React, { useState, useEffect, useMemo } from 'react';
import { School } from '../types';
import { schoolsAPI } from '../services/api';
import SchoolForm from './SchoolForm';
import { Search, X, ChevronLeft, ChevronRight, Building, Edit, Trash2, Mail, Phone, MapPin } from 'lucide-react';

interface SchoolListProps {
  onSchoolSelected?: (school: School) => void;
}

const SchoolList: React.FC<SchoolListProps> = ({ onSchoolSelected }) => {
  const [schools, setSchools] = useState<School[]>([]);
  const [allSchools, setAllSchools] = useState<School[]>([]); // Store all schools when search is active
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showSchoolForm, setShowSchoolForm] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [deletingSchool, setDeletingSchool] = useState<number | null>(null);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalSchools, setTotalSchools] = useState(0);
  const schoolsPerPage = 10;

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');

  const fetchSchools = async (page: number = currentPage) => {
    try {
      setLoading(true);
      const response = await schoolsAPI.getAll(page, schoolsPerPage);
      const schoolsData = response.schools || [];
      setSchools(schoolsData);
      if (response.pagination) {
        setTotalPages(response.pagination.totalPages);
        setTotalSchools(response.pagination.totalSchools);
      }
      return schoolsData; // Return the data for use in .then()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch schools');
      return [];
    } finally {
      setLoading(false);
    }
  };

  const fetchAllSchools = async () => {
    try {
      setLoading(true);
      // Fetch all schools with a large limit
      const response = await schoolsAPI.getAll(1, 10000);
      const allSchoolsData = response.schools || [];
      setAllSchools(allSchoolsData);
      return allSchoolsData; // Return the data for use in .then()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch all schools');
      setAllSchools([]);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Check if search is active
  const hasActiveFilters = !!searchTerm;

  useEffect(() => {
    if (hasActiveFilters) {
      // When search is active, fetch all schools for client-side filtering
      fetchAllSchools();
    } else {
      // When no search, use server-side pagination
      fetchSchools(currentPage);
    }
  }, [currentPage, hasActiveFilters]);

  // Filter schools based on search term
  // Use allSchools when search is active, otherwise use schools (current page)
  const filteredSchools = useMemo(() => {
    if (!searchTerm) return schools;
    
    // Use allSchools when search is active, otherwise use schools (current page)
    const schoolsToFilter = hasActiveFilters ? allSchools : schools;
    const searchLower = searchTerm.toLowerCase();
    return schoolsToFilter.filter((school) => {
      return (
        (school.name && school.name.toLowerCase().includes(searchLower)) ||
        (school.address && school.address.toLowerCase().includes(searchLower)) ||
        (school.contact_email && school.contact_email.toLowerCase().includes(searchLower)) ||
        (school.contact_phone && school.contact_phone.toLowerCase().includes(searchLower)) ||
        (school.school_type && school.school_type.toLowerCase().includes(searchLower))
      );
    });
  }, [schools, allSchools, searchTerm, hasActiveFilters]);

  // Paginate filtered schools
  const paginatedSchools = useMemo(() => {
    if (searchTerm) {
      const startIndex = (currentPage - 1) * schoolsPerPage;
      const endIndex = startIndex + schoolsPerPage;
      return filteredSchools.slice(startIndex, endIndex);
    }
    return filteredSchools;
  }, [filteredSchools, currentPage, searchTerm]);

  // Calculate total pages for filtered results
  const filteredTotalPages = useMemo(() => {
    if (searchTerm) {
      return Math.ceil(filteredSchools.length / schoolsPerPage);
    }
    return totalPages;
  }, [filteredSchools.length, searchTerm, totalPages]);

  const clearFilters = () => {
    setSearchTerm('');
    setCurrentPage(1);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= (searchTerm ? filteredTotalPages : totalPages)) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

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
      
      // If we're viewing the deleted school, go back to list
      if (selectedSchool && selectedSchool.id === schoolId) {
        setSelectedSchool(null);
      }
      
      // If current page becomes empty after deletion, go to previous page
      if (paginatedSchools.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      } else {
        if (hasActiveFilters) {
          await fetchAllSchools();
        } else {
          await fetchSchools(currentPage);
        }
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to delete school';
      alert(errorMessage);
    } finally {
      setDeletingSchool(null);
    }
  };

  const handleSchoolCreated = () => {
    // Reset to first page and fetch
    setCurrentPage(1);
    if (hasActiveFilters) {
      fetchAllSchools();
    } else {
      fetchSchools(1);
    }
  };

  const handleSchoolUpdated = () => {
    if (hasActiveFilters) {
      fetchAllSchools();
    } else {
      fetchSchools(currentPage);
    }
    if (selectedSchool) {
      // Refresh selected school data
      const refreshFn = hasActiveFilters ? fetchAllSchools : () => fetchSchools(currentPage);
      refreshFn().then((data) => {
        const schoolsToSearch = hasActiveFilters ? (data || allSchools) : schools;
        const updatedSchool = schoolsToSearch.find(s => s.id === selectedSchool.id);
        if (updatedSchool) {
          setSelectedSchool(updatedSchool);
        }
      });
    }
  };

  const handleSchoolClick = (school: School) => {
    setSelectedSchool(school);
  };

  const handleBackToList = () => {
    setSelectedSchool(null);
  };

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedSchool) {
        setSelectedSchool(null);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [selectedSchool]);

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
          <h2 className="text-2xl font-bold text-gray-900">Schools</h2>
          <p className="text-sm text-gray-600 mt-1">Manage all schools in the system</p>
        </div>
        <button
          onClick={handleAddSchool}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2 shadow-md"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>+ Add School</span>
        </button>
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
              <span>Search Schools</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, address, email, or phone..."
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
        </div>

        {/* Results Count */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            {hasActiveFilters ? (
              <>
                Showing <span className="font-semibold text-gray-900">
                  {Math.min((currentPage - 1) * schoolsPerPage + 1, filteredSchools.length)} - {Math.min(currentPage * schoolsPerPage, filteredSchools.length)}
                </span> of{' '}
                <span className="font-semibold text-gray-900">{filteredSchools.length}</span> filtered schools
              </>
            ) : (
              <>
                Showing <span className="font-semibold text-gray-900">
                  {Math.min((currentPage - 1) * schoolsPerPage + 1, totalSchools)} - {Math.min(currentPage * schoolsPerPage, totalSchools)}
                </span> of{' '}
                <span className="font-semibold text-gray-900">{totalSchools}</span> schools
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

      {paginatedSchools.length === 0 && filteredSchools.length === 0 && schools.length > 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <Search className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No schools found</h3>
          <p className="text-sm text-gray-500 mb-4">
            {hasActiveFilters 
              ? 'Try adjusting your search to see more results.'
              : 'No schools match your search criteria.'}
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
      ) : schools.length === 0 ? (
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Schools</h3>
          </div>
          <ul className="divide-y divide-gray-200">
            {paginatedSchools.map((school) => (
              <li 
                key={school.id} 
                className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => handleSchoolClick(school)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <Building className="h-5 w-5 text-blue-600" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {school.name}
                        </p>
                        {school.address && (
                          <p className="text-sm text-gray-500 truncate mt-1">
                            {school.address}
                          </p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                          {school.contact_email && school.contact_phone ? (
                            <span>{school.contact_email} {school.contact_phone}</span>
                          ) : (
                            <>
                              {school.contact_email && <span>{school.contact_email}</span>}
                              {school.contact_phone && <span>{school.contact_phone}</span>}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
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
                      <Edit className="w-4 h-4" />
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
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          
          {/* Pagination Controls */}
          {(filteredTotalPages > 1 || totalPages > 1) && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="flex items-center text-sm text-gray-700">
                <span>
                  Page <span className="font-medium">{currentPage}</span> of{' '}
                  <span className="font-medium">{searchTerm ? filteredTotalPages : totalPages}</span>
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
                  {Array.from({ length: Math.min(5, searchTerm ? filteredTotalPages : totalPages) }, (_, i) => {
                    const maxPages = searchTerm ? filteredTotalPages : totalPages;
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
                  disabled={currentPage === (searchTerm ? filteredTotalPages : totalPages)}
                  className={`px-3 py-2 text-sm font-medium rounded-md ${
                    currentPage === (searchTerm ? filteredTotalPages : totalPages)
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

      {/* School Detail Modal Popup */}
      {selectedSchool && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={handleBackToList}>
          <div 
            className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Building className="h-6 w-6 text-blue-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">{selectedSchool.name}</h2>
              </div>
              <button
                onClick={handleBackToList}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <div className="space-y-4">
                {selectedSchool.address && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Address</p>
                      <p className="text-sm text-gray-600">{selectedSchool.address}</p>
                    </div>
                  </div>
                )}
                
                <div className="space-y-3">
                  {selectedSchool.contact_email && (
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-gray-400 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-1">Email</p>
                        <p className="text-sm text-gray-600">{selectedSchool.contact_email}</p>
                      </div>
                    </div>
                  )}
                  
                  {selectedSchool.contact_phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="h-5 w-5 text-gray-400 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-1">Phone</p>
                        <p className="text-sm text-gray-600">{selectedSchool.contact_phone}</p>
                      </div>
                    </div>
                  )}
                </div>

                {selectedSchool.school_type && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">School Type</p>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {selectedSchool.school_type}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3 rounded-b-xl">
              <button
                onClick={handleBackToList}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  handleEditSchool(selectedSchool);
                  setSelectedSchool(null);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2 transition-colors"
              >
                <Edit className="h-4 w-4" />
                <span>Edit School</span>
              </button>
              <button
                onClick={() => {
                  handleDeleteSchool(selectedSchool.id);
                  setSelectedSchool(null);
                }}
                disabled={deletingSchool === selectedSchool.id}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center space-x-2 transition-colors"
              >
                {deletingSchool === selectedSchool.id ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    <span>Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSchoolForm && (
        <SchoolForm
          school={editingSchool}
          onClose={() => {
            setShowSchoolForm(false);
            setEditingSchool(null);
          }}
          onSchoolCreated={handleSchoolCreated}
          onSchoolUpdated={handleSchoolUpdated}
        />
      )}
    </div>
  );
};

export default SchoolList;
