import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { TrendingUp, TrendingDown, Target, Award, AlertTriangle, Building, GraduationCap, BookOpen, User, ChevronDown, ChevronUp, Filter, BarChart3, Table, Download } from 'lucide-react';
import { adminAPI, subjectsAPI, studentsAPI } from '../services/api';
import { School, Grade, Subject, GrowthOverTimeData } from '../types';
import GrowthOverTimeChart from './GrowthOverTimeChart';
import GrowthTabularView from './GrowthTabularView';
import { exportCompletePerformanceReportToPDF } from '../utils/performanceReportExport';
import MultiSelectDropdown from './MultiSelectDropdown';

interface SubjectPerformanceDashboardProps {
  schools: School[];
  grades: Grade[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const SubjectPerformanceDashboard: React.FC<SubjectPerformanceDashboardProps> = ({ 
  schools, 
  grades
}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [growthData, setGrowthData] = useState<GrowthOverTimeData | null>(null);
  const [growthLoading, setGrowthLoading] = useState(false);
  
  // Internal filter state - now using arrays for multi-select
  const [selectedSchools, setSelectedSchools] = useState<number[]>([]);
  const [selectedGrades, setSelectedGrades] = useState<number[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<number[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Array<{id: number, username: string, firstName?: string, lastName?: string}>>([]);
  const [showFilters, setShowFilters] = useState(true);
  const [growthViewMode, setGrowthViewMode] = useState<'graphical' | 'tabular'>('graphical');

  // Load subjects on mount
  useEffect(() => {
    loadSubjects();
  }, []);

  // Load growth data when subjects are loaded (even if no subject selected)
  useEffect(() => {
    if (subjects.length > 0) {
      loadGrowthData();
    }
  }, [subjects.length]);

  // Load filtered students when schools or grades change (no blocking)
  useEffect(() => {
    loadFilteredStudents();
  }, [selectedSchools, selectedGrades]);

  // Load performance data
  useEffect(() => {
    loadData();
  }, [selectedSchools, selectedGrades]);

  // Load growth data when filters change
  useEffect(() => {
    if (subjects.length > 0) {
      loadGrowthData();
    }
  }, [selectedSchools, selectedGrades, selectedStudents, selectedSubjects, subjects.length]);

  const loadSubjects = async () => {
    try {
      const subjectsData = await subjectsAPI.getAll();
      setSubjects(subjectsData);
    } catch (error) {
      console.error('Error loading subjects:', error);
    }
  };

  const loadFilteredStudents = async () => {
    try {
      const allStudents: Array<{id: number, username: string, firstName?: string, lastName?: string}> = [];
      
      // If both schools and grades are selected, load by school+grade
      if (selectedSchools.length > 0 && selectedGrades.length > 0) {
        for (const schoolId of selectedSchools) {
          for (const gradeId of selectedGrades) {
            try {
              const students = await studentsAPI.getBySchoolAndGrade(schoolId, gradeId);
              allStudents.push(...students);
            } catch (error) {
              console.error(`Error loading students for school ${schoolId}, grade ${gradeId}:`, error);
            }
          }
        }
      }
      // If only grades are selected (no schools), load students from all schools with those grades
      else if (selectedGrades.length > 0 && selectedSchools.length === 0) {
        // Use schools from props
        for (const school of schools) {
          for (const gradeId of selectedGrades) {
            try {
              const students = await studentsAPI.getBySchoolAndGrade(school.id, gradeId);
              allStudents.push(...students);
            } catch (error) {
              console.error(`Error loading students for school ${school.id}, grade ${gradeId}:`, error);
            }
          }
        }
      }
      // If only schools are selected (no grades), load all students from those schools
      else if (selectedSchools.length > 0 && selectedGrades.length === 0) {
        // Use grades from props
        for (const schoolId of selectedSchools) {
          for (const grade of grades) {
            try {
              const students = await studentsAPI.getBySchoolAndGrade(schoolId, grade.id);
              allStudents.push(...students);
            } catch (error) {
              console.error(`Error loading students for school ${schoolId}, grade ${grade.id}:`, error);
            }
          }
        }
      }
      // If neither schools nor grades are selected, don't load students (too many)
      // Users can still select students if they've been loaded before
      
      // Remove duplicates based on id
      const uniqueStudents = Array.from(
        new Map(allStudents.map(student => [student.id, student])).values()
      );
      setFilteredStudents(uniqueStudents);
    } catch (error) {
      console.error('Error loading filtered students:', error);
      // Don't clear students if there's an error - keep existing list
    }
  };

  const loadGrowthData = async () => {
    // Wait for subjects to load first
    if (subjects.length === 0) {
      return;
    }
    
    setGrowthLoading(true);
    try {
      // Support multiple selections - pass arrays
      const growth = await adminAPI.getGrowthData({
        schoolIds: selectedSchools.length > 0 ? selectedSchools : undefined,
        gradeIds: selectedGrades.length > 0 ? selectedGrades : undefined,
        studentIds: selectedStudents.length > 0 ? selectedStudents : undefined,
        subjectIds: selectedSubjects.length > 0 ? selectedSubjects : undefined
      });
      setGrowthData(growth);
    } catch (error) {
      console.error('Error loading growth data:', error);
      setGrowthData(null);
    } finally {
      setGrowthLoading(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const filters: any = {};
      if (selectedSchools.length > 0) {
        // For backward compatibility, use schoolId for single, schoolIds for multiple
        if (selectedSchools.length === 1) {
          filters.schoolId = selectedSchools[0];
        } else {
          filters.schoolIds = selectedSchools;
        }
      }
      if (selectedGrades.length > 0) {
        if (selectedGrades.length === 1) {
          filters.gradeId = selectedGrades[0];
        } else {
          filters.gradeIds = selectedGrades;
        }
      }
      // Note: Subject and Student filters are handled in the view logic, not in API call

      const response = await adminAPI.getSubjectPerformance(filters);
      console.log('Subject Performance Data:', response);
      
      // Ensure data structure is correct
      const formattedData = {
        subjectPerformance: response.subjectPerformance || [],
        growthRates: response.growthRates || [],
        yearTrends: response.yearTrends || []
      };
      
      setData(formattedData);
    } catch (error: any) {
      console.error('Error loading subject performance data:', error);
      // Set empty data structure on error so UI can show appropriate message
      setData({
        subjectPerformance: [],
        growthRates: [],
        yearTrends: []
      });
    } finally {
      setLoading(false);
    }
  };

     const getGrowthRate = (subject: any) => {
     const boyAvg = Number(subject.boy_avg) || 0;
     const eoyAvg = Number(subject.eoy_avg) || 0;
     if (!boyAvg || !eoyAvg) return null;
     return ((eoyAvg - boyAvg) / boyAvg * 100).toFixed(1);
   };

  const getGrowthIcon = (growthRate: number) => {
    if (growthRate > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (growthRate < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Target className="h-4 w-4 text-gray-600" />;
  };

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // Determine view level based on filters
  const getViewLevel = () => {
    if (selectedStudents.length > 0) return 'student';
    if (selectedSubjects.length > 0) return 'subject';
    if (selectedGrades.length > 0) return 'grade';
    if (selectedSchools.length > 0) return 'school';
    return 'all-schools';
  };

  const viewLevel = getViewLevel();

  // Determine what data to show based on filters
  const getFilteredData = () => {
    if (!data || !data.subjectPerformance) return [];

    let filtered = data.subjectPerformance;

    // Filter by subjects if selected
    if (selectedSubjects.length > 0) {
      filtered = filtered.filter((s: any) => selectedSubjects.includes(s.subject_id));
    }

    return filtered;
  };

  const filteredPerformanceData = getFilteredData();
  const hasData = filteredPerformanceData.length > 0;

  // Get title based on view level
  const getTitle = () => {
    switch (viewLevel) {
      case 'student':
        if (selectedStudents.length === 1) {
          const student = filteredStudents.find(s => s.id === selectedStudents[0]);
          return `${student?.firstName && student?.lastName 
            ? `${student.firstName} ${student.lastName}`
            : student?.username || 'Student'} - Individual Performance`;
        }
        return `${selectedStudents.length} Students Performance`;
      case 'subject':
        if (selectedSubjects.length === 1) {
          const subject = subjects.find(s => s.id === selectedSubjects[0]);
          return `${subject?.name || 'Subject'} Performance`;
        }
        return `${selectedSubjects.length} Subjects Performance`;
      case 'grade':
        if (selectedGrades.length === 1) {
          const grade = grades.find(g => g.id === selectedGrades[0]);
          return `${grade?.display_name || 'Grade'} Performance`;
        }
        return `${selectedGrades.length} Grades Performance`;
      case 'school':
        if (selectedSchools.length === 1) {
          const school = schools.find(s => s.id === selectedSchools[0]);
          return `${school?.name || 'School'} Performance`;
        }
        return `${selectedSchools.length} Schools Performance`;
      default:
        return 'All Schools Performance Overview';
    }
  };

  // Render based on view level
  const renderPerformanceView = () => {
    if (!data || !data.subjectPerformance) return null;

    const title = getTitle();
    const icon = viewLevel === 'student' ? User : 
                 viewLevel === 'subject' ? BookOpen :
                 viewLevel === 'grade' ? GraduationCap :
                 viewLevel === 'school' ? Building : Award;

    return (
      <>
        {/* Subject Performance Overview */}
        <div id="performance-overview-chart" className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            {React.createElement(icon, { className: "h-5 w-5 text-blue-600 mr-2" })}
            {title}
          </h3>
          {hasData ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filteredPerformanceData.map((subject: any) => ({
                  ...subject,
                  average_rit_score: Number(subject.average_rit_score) || 0
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="subject_name" />
                  <YAxis domain={[100, 350]} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="average_rit_score" fill="#3B82F6" name="Average Growth Metric Score" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600">No performance data available for the selected filters.</p>
            </div>
          )}
        </div>

        {/* Growth Rates - Filter by subject if selected */}
        {data.growthRates && data.growthRates.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <TrendingUp className="h-5 w-5 text-green-600 mr-2" />
              Growth Rates (BOY to EOY)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.growthRates
                .filter((subject: any) => selectedSubjects.length === 0 || selectedSubjects.includes(subject.subject_id))
                .map((subject: any) => {
                  const growthRate = getGrowthRate(subject);
                  return (
                    <div key={subject.subject_id} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{subject.subject_name}</h4>
                        {growthRate && getGrowthIcon(Number(growthRate))}
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">BOY:</span>
                          <span className="font-medium">{subject.boy_avg ? Number(subject.boy_avg).toFixed(1) : 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">EOY:</span>
                          <span className="font-medium">{subject.eoy_avg ? Number(subject.eoy_avg).toFixed(1) : 'N/A'}</span>
                        </div>
                        <div className="border-t pt-1 mt-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Growth:</span>
                            <span className={`font-medium ${Number(growthRate) > 0 ? 'text-green-600' : Number(growthRate) < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                              {growthRate ? `${growthRate}%` : 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Year-over-Year Trends - Filter by subject if selected */}
        {data.yearTrends && data.yearTrends.length > 0 && (
          <div id="year-trends-chart" className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Target className="h-5 w-5 text-purple-600 mr-2" />
              Year-over-Year Trends
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.yearTrends.map((trend: any) => ({
                  ...trend,
                  average_rit_score: Number(trend.average_rit_score) || 0
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis domain={[100, 350]} />
                  <Tooltip />
                  <Legend />
                  {filteredPerformanceData.map((subject: any, idx: number) => (
                    <Line
                      key={subject.subject_id}
                      type="monotone"
                      dataKey="average_rit_score"
                      data={data.yearTrends.filter((item: any) => item.subject_id === subject.subject_id).map((item: any) => ({
                        ...item,
                        average_rit_score: Number(item.average_rit_score) || 0
                      }))}
                      stroke={COLORS[idx % COLORS.length]}
                      name={subject.subject_name}
                      strokeWidth={2}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Performance Statistics */}
        {hasData && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredPerformanceData.map((subject: any) => (
              <div key={subject.subject_id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h4 className="font-medium text-gray-900 mb-3">{subject.subject_name}</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Average:</span>
                    <span className="font-medium">{subject.average_rit_score ? Number(subject.average_rit_score).toFixed(1) : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Students:</span>
                    <span className="font-medium">{subject.student_count || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Range:</span>
                    <span className="font-medium">{subject.min_score || 0} - {subject.max_score || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Std Dev:</span>
                    <span className="font-medium">{subject.standard_deviation ? Number(subject.standard_deviation).toFixed(1) : 'N/A'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </>
    );
  };

  return (
    <div className="space-y-6">
      {/* Collapsible Filter Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-gray-600" />
            <span className="font-medium text-gray-900">Filters</span>
            {(selectedSchools.length > 0 || selectedGrades.length > 0 || selectedSubjects.length > 0 || selectedStudents.length > 0) && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                Active
              </span>
            )}
          </div>
          {showFilters ? (
            <ChevronUp className="h-5 w-5 text-gray-600" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-600" />
          )}
        </button>
        
        {showFilters && (
          <div className="border-t border-gray-200 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* School Filter - Multi-select */}
              <MultiSelectDropdown
                label="School"
                icon={<Building className="h-4 w-4 text-purple-600" />}
                options={schools.map(s => ({ id: s.id, name: s.name }))}
                selectedIds={selectedSchools}
                onChange={(ids) => {
                  setSelectedSchools(ids);
                  if (ids.length === 0) {
                    setSelectedGrades([]);
                    setSelectedStudents([]);
                  }
                }}
                placeholder="All Schools"
                getLabel={(opt) => opt.name || ''}
              />

              {/* Grade Filter - Multi-select */}
              <MultiSelectDropdown
                label="Grade"
                icon={<GraduationCap className="h-4 w-4 text-orange-600" />}
                options={grades.map(g => ({ id: g.id, label: g.display_name, display_name: g.display_name }))}
                selectedIds={selectedGrades}
                onChange={(ids) => {
                  setSelectedGrades(ids);
                }}
                placeholder="All Grades"
                getLabel={(opt) => opt.display_name || opt.label || ''}
              />

              {/* Student Filter - Multi-select */}
              <MultiSelectDropdown
                label="Student"
                icon={<User className="h-4 w-4 text-emerald-600" />}
                options={filteredStudents.map(s => ({
                  id: s.id,
                  label: s.firstName && s.lastName 
                    ? `${s.firstName} ${s.lastName}`
                    : s.username
                }))}
                selectedIds={selectedStudents}
                onChange={setSelectedStudents}
                placeholder="All Students"
                getLabel={(opt) => opt.label || opt.username || ''}
              />

              {/* Subject Filter - Multi-select */}
              <MultiSelectDropdown
                label="Subject"
                icon={<BookOpen className="h-4 w-4 text-blue-600" />}
                options={subjects.map(s => ({ id: s.id, label: s.name, name: s.name }))}
                selectedIds={selectedSubjects}
                onChange={setSelectedSubjects}
                placeholder="All Subjects"
                getLabel={(opt) => opt.name || opt.label || ''}
              />
            </div>
            
            {/* Clear Filters Button */}
            {(selectedSchools.length > 0 || selectedGrades.length > 0 || selectedSubjects.length > 0 || selectedStudents.length > 0) && (
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => {
                    setSelectedSchools([]);
                    setSelectedGrades([]);
                    setSelectedSubjects([]);
                    setSelectedStudents([]);
                  }}
                  className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Clear All Filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Complete Report Download Button - Includes ALL sections */}
      {!loading && data && growthData && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-md border-2 border-blue-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-900 flex items-center space-x-2 mb-2">
                <Award className="h-6 w-6 text-blue-600" />
                <span>Complete Performance Report</span>
              </h3>
              <p className="text-gray-700 text-sm mb-1">
                Download comprehensive PDF report including:
              </p>
              <ul className="text-gray-600 text-sm list-disc list-inside space-y-1">
                <li>All Schools Performance Overview (Bar Chart)</li>
                <li>Performance Statistics (Average, Students, Range, Std Dev for each subject)</li>
                <li>Growth Rates (BOY to EOY)</li>
                <li>Year-over-Year Trends (Line Chart)</li>
                <li>Growth Over Time (with all filter levels)</li>
              </ul>
            </div>
            <button
              onClick={async () => {
                try {
                  await exportCompletePerformanceReportToPDF(
                    growthData,
                    {
                      subjectPerformance: data.subjectPerformance,
                      growthRates: data.growthRates,
                      yearTrends: data.yearTrends
                    },
                    {
                      schoolName: selectedSchools.length === 1 
                        ? schools.find(s => s.id === selectedSchools[0])?.name || null 
                        : selectedSchools.length > 1 
                        ? `${selectedSchools.length} Schools` 
                        : null,
                      gradeName: selectedGrades.length === 1 
                        ? grades.find(g => g.id === selectedGrades[0])?.display_name || null 
                        : selectedGrades.length > 1 
                        ? `${selectedGrades.length} Grades` 
                        : null,
                      studentName: selectedStudents.length === 1 
                        ? (() => {
                            const student = filteredStudents.find(s => s.id === selectedStudents[0]);
                            return student?.firstName && student?.lastName
                              ? `${student.firstName} ${student.lastName}`
                              : student?.username || null;
                          })()
                        : selectedStudents.length > 1 
                        ? `${selectedStudents.length} Students` 
                        : null,
                      subjectName: selectedSubjects.length === 1 
                        ? subjects.find(s => s.id === selectedSubjects[0])?.name || null 
                        : selectedSubjects.length > 1 
                        ? `${selectedSubjects.length} Subjects` 
                        : null
                    },
                    {
                      performanceOverview: 'performance-overview-chart',
                      growthOverTime: 'growth-chart-container',
                      yearTrends: 'year-trends-chart'
                    }
                  );
                } catch (error) {
                  console.error('Error exporting complete report:', error);
                  alert('Failed to export complete report. Please try again.');
                }
              }}
              className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg font-semibold ml-6"
            >
              <Download className="h-5 w-5" />
              <span>Download Complete Report (PDF)</span>
            </button>
          </div>
        </div>
      )}

      {/* Growth Over Time - Always visible with Graphical/Tabular toggle */}
      <div>
        {growthLoading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          </div>
        ) : growthData ? (
          <div>
            {/* View Mode Toggle */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  <span>Growth Over Time</span>
                </h3>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setGrowthViewMode('graphical')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
                      growthViewMode === 'graphical'
                        ? 'bg-blue-100 text-blue-800 border-2 border-blue-200'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 border-2 border-transparent'
                    }`}
                  >
                    <BarChart3 className="h-4 w-4" />
                    <span>Graphical</span>
                  </button>
                  <button
                    onClick={() => setGrowthViewMode('tabular')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
                      growthViewMode === 'tabular'
                        ? 'bg-blue-100 text-blue-800 border-2 border-blue-200'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 border-2 border-transparent'
                    }`}
                  >
                    <Table className="h-4 w-4" />
                    <span>Tabular</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Display based on selected mode */}
            {growthViewMode === 'graphical' ? (
              <GrowthOverTimeChart 
                data={growthData} 
                userRole="admin"
                filters={{
                  schoolName: selectedSchools.length === 1 
                    ? schools.find(s => s.id === selectedSchools[0])?.name || null 
                    : selectedSchools.length > 1 
                    ? `${selectedSchools.length} Schools` 
                    : null,
                  gradeName: selectedGrades.length === 1 
                    ? grades.find(g => g.id === selectedGrades[0])?.display_name || null 
                    : selectedGrades.length > 1 
                    ? `${selectedGrades.length} Grades` 
                    : null,
                  studentName: selectedStudents.length === 1 
                    ? (() => {
                        const student = filteredStudents.find(s => s.id === selectedStudents[0]);
                        return student?.firstName && student?.lastName
                          ? `${student.firstName} ${student.lastName}`
                          : student?.username || null;
                      })()
                    : selectedStudents.length > 1 
                    ? `${selectedStudents.length} Students` 
                    : null,
                  subjectName: selectedSubjects.length === 1 
                    ? subjects.find(s => s.id === selectedSubjects[0])?.name || null 
                    : selectedSubjects.length > 1 
                    ? `${selectedSubjects.length} Subjects` 
                    : null
                }}
                performanceData={data ? {
                  subjectPerformance: data.subjectPerformance,
                  growthRates: data.growthRates,
                  yearTrends: data.yearTrends
                } : undefined}
                schoolNamesMap={selectedSchools.reduce((acc, schoolId) => {
                  const school = schools.find(s => s.id === schoolId);
                  if (school) {
                    acc[schoolId] = school.name;
                  }
                  return acc;
                }, {} as { [key: number]: string })}
                studentNamesMap={selectedStudents.reduce((acc, studentId) => {
                  const student = filteredStudents.find(s => s.id === studentId);
                  if (student) {
                    acc[studentId] = student.firstName && student.lastName
                      ? `${student.firstName} ${student.lastName}`
                      : student.username || `Student ${studentId}`;
                  }
                  return acc;
                }, {} as { [key: number]: string })}
              />
            ) : (
              <GrowthTabularView 
                data={growthData} 
                userRole="admin"
                filters={{
                  schoolName: selectedSchools.length === 1 
                    ? schools.find(s => s.id === selectedSchools[0])?.name || null 
                    : selectedSchools.length > 1 
                    ? `${selectedSchools.length} Schools` 
                    : null,
                  gradeName: selectedGrades.length === 1 
                    ? grades.find(g => g.id === selectedGrades[0])?.display_name || null 
                    : selectedGrades.length > 1 
                    ? `${selectedGrades.length} Grades` 
                    : null,
                  studentName: selectedStudents.length === 1 
                    ? (() => {
                        const student = filteredStudents.find(s => s.id === selectedStudents[0]);
                        return student?.firstName && student?.lastName
                          ? `${student.firstName} ${student.lastName}`
                          : student?.username || null;
                      })()
                    : selectedStudents.length > 1 
                    ? `${selectedStudents.length} Students` 
                    : null,
                  subjectName: selectedSubjects.length === 1 
                    ? subjects.find(s => s.id === selectedSubjects[0])?.name || null 
                    : selectedSubjects.length > 1 
                    ? `${selectedSubjects.length} Subjects` 
                    : null
                }}
                performanceData={data ? {
                  subjectPerformance: data.subjectPerformance,
                  growthRates: data.growthRates,
                  yearTrends: data.yearTrends
                } : undefined}
              />
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="text-center py-8">
              <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Loading growth data...</p>
            </div>
          </div>
        )}
      </div>

      {!loading && data && renderPerformanceView()}

      {!loading && data && (!data.subjectPerformance || data.subjectPerformance.length === 0) && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="text-center py-8">
            <Award className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Performance Data Available</h3>
            <p className="text-gray-600">
              No subject performance data found for the selected filters. Try adjusting your filter criteria.
            </p>
          </div>
        </div>
      )}

      {!loading && !data && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to Load Data</h3>
            <p className="text-gray-600">
              There was an error loading the performance data. Please try refreshing the page.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubjectPerformanceDashboard;
