import React, { useState, useEffect } from 'react';
import { X, Building, GraduationCap, Users, Calendar, Clock } from 'lucide-react';
import { assignmentsAPI, schoolsAPI, gradesAPI, studentsAPI } from '../services/api';
import { School, Grade } from '../types';

interface ReassignAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignmentId: number;
  assignmentName: string;
  onReassignComplete: () => void;
}

interface Student {
  id: number;
  username: string;
  firstName: string | null;
  lastName: string | null;
  schoolId: number;
  gradeId: number;
  schoolName?: string;
  gradeName?: string;
}

const ReassignAssignmentModal: React.FC<ReassignAssignmentModalProps> = ({
  isOpen,
  onClose,
  assignmentId,
  assignmentName,
  onReassignComplete
}) => {
  const [schools, setSchools] = useState<School[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Selection states
  const [selectedSchools, setSelectedSchools] = useState<number[]>([]);
  const [selectedGrades, setSelectedGrades] = useState<number[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('00:00');
  const [endTime, setEndTime] = useState('23:59');

  // Filter students based on selected schools/grades
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  useEffect(() => {
    // Filter students based on selected schools and grades
    let filtered = students;

    if (selectedSchools.length > 0) {
      filtered = filtered.filter(s => selectedSchools.includes(s.schoolId));
    }

    if (selectedGrades.length > 0) {
      filtered = filtered.filter(s => selectedGrades.includes(s.gradeId));
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s => 
        s.username.toLowerCase().includes(query) ||
        (s.firstName && s.firstName.toLowerCase().includes(query)) ||
        (s.lastName && s.lastName.toLowerCase().includes(query)) ||
        (s.schoolName && s.schoolName.toLowerCase().includes(query))
      );
    }

    setFilteredStudents(filtered);
  }, [selectedSchools, selectedGrades, searchQuery, students]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [schoolsResponse, gradesData] = await Promise.all([
        schoolsAPI.getAll(1, 1000),
        gradesAPI.getActive()
      ]);

      const schoolsData = Array.isArray(schoolsResponse) 
        ? schoolsResponse 
        : (schoolsResponse.schools || []);
      
      setSchools(schoolsData);
      setGrades(gradesData);

      // Fetch all students using the API
      try {
        const studentsData = await studentsAPI.getAll(1, 10000);
        // Backend returns { students: [...], pagination: {...} }
        const studentsList = studentsData.students || [];
        
        // Backend already includes school_name and grade_name
        const enrichedStudents = studentsList.map((student: any) => ({
          id: student.id,
          username: student.username,
          firstName: student.first_name || student.firstName,
          lastName: student.last_name || student.lastName,
          schoolId: student.school_id || student.schoolId,
          gradeId: student.grade_id || student.gradeId,
          schoolName: student.school_name || schoolsData.find(s => s.id === (student.school_id || student.schoolId))?.name,
          gradeName: student.grade_name || gradesData.find(g => g.id === (student.grade_id || student.gradeId))?.display_name
        }));
        
        setStudents(enrichedStudents);
      } catch (err) {
        console.error('Error fetching students:', err);
        // Continue without students - user can still select by school/grade
        setStudents([]);
      }
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReassign = async () => {
    // Validate that at least one selection is made
    if (selectedSchools.length === 0 && selectedGrades.length === 0 && selectedStudents.length === 0) {
      setError('Please select at least one school, grade, or specific students');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const reassignData: any = {};

      if (selectedSchools.length > 0) {
        reassignData.selectedSchools = selectedSchools;
      }

      if (selectedGrades.length > 0) {
        reassignData.selectedGrades = selectedGrades;
      }

      if (selectedStudents.length > 0) {
        reassignData.selectedStudents = selectedStudents;
      }

      if (startDate) {
        reassignData.startDate = startDate;
      }

      if (endDate) {
        reassignData.endDate = endDate;
        reassignData.endTime = endTime;
      }

      if (startDate && startTime) {
        reassignData.startTime = startTime;
      }

      const result = await assignmentsAPI.reassign(assignmentId, reassignData);
      
      setSuccess(result.message || `Successfully reassigned to ${result.studentsAssigned || 0} student(s)`);
      
      setTimeout(() => {
        onReassignComplete();
        onClose();
        // Reset form
        setSelectedSchools([]);
        setSelectedGrades([]);
        setSelectedStudents([]);
        setStartDate('');
        setEndDate('');
        setStartTime('00:00');
        setEndTime('23:59');
        setError('');
        setSuccess('');
      }, 1500);
    } catch (err: any) {
      console.error('Error reassigning assignment:', err);
      setError(err.response?.data?.error || 'Failed to reassign assignment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Reassign Assignment</h2>
            <p className="text-sm text-gray-600 mt-1">{assignmentName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Error/Success Messages */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}
              {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                  {success}
                </div>
              )}

              {/* Schools Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Building className="h-4 w-4 inline mr-2" />
                  Select Schools (Optional)
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-48 overflow-y-auto border border-gray-200 rounded-md p-4">
                  {schools.map((school) => (
                    <label key={school.id} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedSchools.includes(school.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedSchools([...selectedSchools, school.id]);
                          } else {
                            setSelectedSchools(selectedSchools.filter(id => id !== school.id));
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{school.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Grades Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <GraduationCap className="h-4 w-4 inline mr-2" />
                  Select Grades (Optional)
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-48 overflow-y-auto border border-gray-200 rounded-md p-4">
                  {grades.map((grade) => (
                    <label key={grade.id} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedGrades.includes(grade.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedGrades([...selectedGrades, grade.id]);
                          } else {
                            setSelectedGrades(selectedGrades.filter(id => id !== grade.id));
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{grade.display_name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Specific Students Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Users className="h-4 w-4 inline mr-2" />
                  Or Select Specific Students (Optional)
                </label>
                <div className="border border-gray-200 rounded-md p-4">
                  {/* Search */}
                  <input
                    type="text"
                    placeholder="Search students by name or username..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />

                  {/* Student List */}
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {filteredStudents.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">
                        {searchQuery ? 'No students found matching your search' : 'No students available'}
                      </p>
                    ) : (
                      filteredStudents.map((student) => (
                        <label key={student.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedStudents.includes(student.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedStudents([...selectedStudents, student.id]);
                              } else {
                                setSelectedStudents(selectedStudents.filter(id => id !== student.id));
                              }
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">
                              {student.firstName && student.lastName
                                ? `${student.firstName} ${student.lastName}`
                                : student.username}
                            </div>
                            <div className="text-xs text-gray-500">
                              @{student.username} • {student.schoolName || 'N/A'} • {student.gradeName || 'N/A'}
                            </div>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                </div>
                {selectedStudents.length > 0 && (
                  <p className="text-sm text-gray-600 mt-2">
                    {selectedStudents.length} student(s) selected
                  </p>
                )}
              </div>

              {/* Date Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="h-4 w-4 inline mr-2" />
                    Start Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="h-4 w-4 inline mr-2" />
                    End Date / Due Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Time Selection */}
              {endDate && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Clock className="h-4 w-4 inline mr-2" />
                    End Time (Optional)
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Default: 23:59 (end of day)</p>
                </div>
              )}

              {/* Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> If you select schools/grades, all students matching those criteria will be assigned. 
                  If you select specific students, only those students will be assigned. 
                  Students who have already completed this assignment will not be reassigned.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleReassign}
            disabled={submitting || loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                <span>Reassigning...</span>
              </>
            ) : (
              <span>Reassign Assignment</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReassignAssignmentModal;

