import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AssessmentConfiguration, Grade, Subject } from '../types';
import { assessmentConfigAPI, gradesAPI, subjectsAPI, assignmentsAPI } from '../services/api';
import { Edit, Trash2, Plus, Filter, Clock, Hash, AlertTriangle, Zap, List, Eye } from 'lucide-react';
import AssessmentConfigForm from './AssessmentConfigForm';
import AssignmentViewModal from './AssignmentViewModal';
import AssessmentQuestionsModal from './AssessmentQuestionsModal';

interface Assignment {
  id: number;
  name: string;
  description?: string;
  subjectId: number;
  gradeId: number;
  timeLimitMinutes: number;
  totalQuestions: number;
  isActive: boolean;
  isPublished: boolean;
  questionSequence?: string;
  optionSequence?: string;
  difficultyLevel?: number;
  createdAt: string;
  updatedAt?: string;
  subjectName?: string;
  gradeName?: string;
  createdByName?: string;
  mode?: 'Standard' | 'Adaptive';
}

const AssessmentConfigList: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'assignments' | 'configurations'>('assignments');
  const [configurations, setConfigurations] = useState<AssessmentConfiguration[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingConfig, setEditingConfig] = useState<AssessmentConfiguration | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [filteredConfigs, setFilteredConfigs] = useState<AssessmentConfiguration[]>([]);
  const [filteredAssignments, setFilteredAssignments] = useState<Assignment[]>([]);
  const [viewingAssignmentId, setViewingAssignmentId] = useState<number | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingQuestionsAssignmentId, setViewingQuestionsAssignmentId] = useState<number | null>(null);
  const [showQuestionsModal, setShowQuestionsModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // Filter configurations based on selected grade and subject
    let filtered = configurations;
    
    if (selectedGrade !== null) {
      filtered = filtered.filter(config => config.gradeId === selectedGrade);
    }
    
    if (selectedSubject !== null) {
      filtered = filtered.filter(config => config.subjectId === selectedSubject);
    }
    
    setFilteredConfigs(filtered);
  }, [selectedGrade, selectedSubject, configurations]);

  useEffect(() => {
    // Filter assignments based on selected grade and subject
    let filtered = assignments;
    
    if (selectedGrade !== null) {
      filtered = filtered.filter(assignment => assignment.gradeId === selectedGrade);
    }
    
    if (selectedSubject !== null) {
      filtered = filtered.filter(assignment => assignment.subjectId === selectedSubject);
    }
    
    setFilteredAssignments(filtered);
  }, [selectedGrade, selectedSubject, assignments]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [configsData, assignmentsData, gradesData, subjectsData] = await Promise.all([
        assessmentConfigAPI.getAll(),
        assignmentsAPI.getAll().catch(() => []), // Handle if assignments table doesn't exist yet
        gradesAPI.getActive(),
        subjectsAPI.getAll()
      ]);
      
      setConfigurations(configsData);
      setAssignments(assignmentsData || []);
      setGrades(gradesData);
      setSubjects(subjectsData);
      setError(null);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load assessment data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    // Navigate to new assessment creation page
    navigate('/admin/assessments/new');
  };

  const handleEdit = (config: AssessmentConfiguration) => {
    setEditingConfig(config);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this configuration?')) {
      return;
    }

    try {
      await assessmentConfigAPI.delete(id);
      setConfigurations(configs => configs.filter(config => config.id !== id));
    } catch (err) {
      console.error('Error deleting configuration:', err);
      alert('Failed to delete configuration');
    }
  };

  const handleDeleteAssignment = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this assignment?')) {
      return;
    }

    try {
      await assignmentsAPI.delete(id);
      setAssignments(assigns => assigns.filter(assignment => assignment.id !== id));
    } catch (err) {
      console.error('Error deleting assignment:', err);
      alert('Failed to delete assignment');
    }
  };

  const getAssignmentMode = (assignment: Assignment): 'Standard' | 'Adaptive' => {
    // Use mode from backend if available, otherwise infer from questionSequence
    return assignment.mode || (assignment.questionSequence ? 'Standard' : 'Adaptive');
  };

  const handleFormSubmit = async (configData: any) => {
    try {
      if (editingConfig) {
        const updated = await assessmentConfigAPI.update(editingConfig.id, configData);
        setConfigurations(configs => 
          configs.map(config => config.id === editingConfig.id ? updated : config)
        );
      } else {
        const newConfig = await assessmentConfigAPI.create(configData);
        setConfigurations(configs => [...configs, newConfig]);
      }
      setShowForm(false);
      setEditingConfig(null);
    } catch (err) {
      console.error('Error saving configuration:', err);
      alert('Failed to save configuration');
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingConfig(null);
  };

  const getGradeName = (gradeId: number) => {
    const grade = grades.find(g => g.id === gradeId);
    return grade?.display_name || 'Unknown Grade';
  };

  const getSubjectName = (subjectId: number) => {
    const subject = subjects.find(s => s.id === subjectId);
    return subject?.name || 'Unknown Subject';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="text-red-600">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Assessments</h2>
          <p className="text-gray-600 mt-1">
            Manage assignments and assessment configurations
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>New Assessment</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex items-center space-x-4">
          <Filter className="h-5 w-5 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filter by:</span>
          
          <select
            value={selectedGrade || ''}
            onChange={(e) => setSelectedGrade(e.target.value ? Number(e.target.value) : null)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Grades</option>
            {grades.map((grade) => (
              <option key={grade.id} value={grade.id}>
                {grade.display_name}
              </option>
            ))}
          </select>

          <select
            value={selectedSubject || ''}
            onChange={(e) => setSelectedSubject(e.target.value ? Number(e.target.value) : null)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Subjects</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Assignments List */}
      {activeTab === 'assignments' && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subject
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Grade
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time Limit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Questions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAssignments.map((assignment) => {
                  const mode = getAssignmentMode(assignment);
                  return (
                    <tr key={assignment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <button
                            onClick={() => {
                              setViewingQuestionsAssignmentId(assignment.id);
                              setShowQuestionsModal(true);
                            }}
                            className="text-sm font-medium text-gray-900 hover:text-blue-600 hover:underline transition-colors text-left cursor-pointer"
                            title="Click to view questions"
                          >
                            {assignment.name}
                          </button>
                          {assignment.description && (
                            <div className="text-xs text-gray-500 mt-1 truncate max-w-xs">
                              {assignment.description}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
                          mode === 'Standard'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {mode === 'Standard' ? (
                            <>
                              <List className="h-3 w-3 mr-1" />
                              Standard
                            </>
                          ) : (
                            <>
                              <Zap className="h-3 w-3 mr-1" />
                              Adaptive
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">
                          {assignment.subjectName || getSubjectName(assignment.subjectId)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">
                          {assignment.gradeName || getGradeName(assignment.gradeId)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-900">
                            {assignment.timeLimitMinutes} min
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <Hash className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-900">
                            {assignment.totalQuestions}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col space-y-1">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            assignment.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {assignment.isActive ? 'Active' : 'Inactive'}
                          </span>
                          {assignment.isPublished && (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                              Published
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setViewingAssignmentId(assignment.id);
                              setShowViewModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-900 transition-colors"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteAssignment(assignment.id)}
                            className="text-red-600 hover:text-red-900 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredAssignments.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-500">
                {assignments.length === 0 ? (
                  <div>
                    <p className="text-lg font-medium">No assignments found</p>
                    <p className="text-sm mt-1">Create your first assignment to get started.</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-lg font-medium">No assignments match your filters</p>
                    <p className="text-sm mt-1">Try adjusting your filter criteria.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Configurations List */}
      {activeTab === 'configurations' && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Grade
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Subject
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time Limit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Questions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredConfigs.map((config) => (
                <tr key={config.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900">
                      {config.gradeName || getGradeName(config.gradeId)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">
                      {config.subjectName || getSubjectName(config.subjectId)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-900">
                        {config.timeLimitMinutes} minutes
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <Hash className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-900">
                        {config.questionCount} questions
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      config.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {config.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEdit(config)}
                        className="text-blue-600 hover:text-blue-900 transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(config.id)}
                        className="text-red-600 hover:text-red-900 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredConfigs.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500">
              {configurations.length === 0 ? (
                <div>
                  <p className="text-lg font-medium">No configurations found</p>
                  <p className="text-sm mt-1">Create your first assessment configuration to get started.</p>
                </div>
              ) : (
                <div>
                  <p className="text-lg font-medium">No configurations match your filters</p>
                  <p className="text-sm mt-1">Try adjusting your filter criteria.</p>
                </div>
              )}
            </div>
          </div>
        )}
        </div>
      )}

      {/* Configuration Form Modal */}
      {showForm && (
        <AssessmentConfigForm
          config={editingConfig}
          grades={grades}
          subjects={subjects}
          onSubmit={handleFormSubmit}
          onClose={handleFormClose}
        />
      )}

      {/* Assignment View Modal */}
      {showViewModal && viewingAssignmentId && (
        <AssignmentViewModal
          isOpen={showViewModal}
          onClose={() => {
            setShowViewModal(false);
            setViewingAssignmentId(null);
          }}
          assignmentId={viewingAssignmentId}
          onViewQuestions={() => {
            setShowViewModal(false);
            setViewingQuestionsAssignmentId(viewingAssignmentId);
            setShowQuestionsModal(true);
          }}
        />
      )}

      {/* Assessment Questions Modal */}
      {showQuestionsModal && viewingQuestionsAssignmentId && (
        <AssessmentQuestionsModal
          isOpen={showQuestionsModal}
          onClose={() => {
            setShowQuestionsModal(false);
            setViewingQuestionsAssignmentId(null);
          }}
          assignmentId={viewingQuestionsAssignmentId}
        />
      )}
    </div>
  );
};

export default AssessmentConfigList;
