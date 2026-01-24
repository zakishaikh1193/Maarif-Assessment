import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Target, Users, Award, AlertTriangle, Building, GraduationCap, BookOpen, User } from 'lucide-react';
import { adminAPI, subjectsAPI } from '../services/api';
import { School, Grade, Subject } from '../types';

interface SubjectPerformanceDashboardProps {
  schools: School[];
  grades: Grade[];
  selectedSchool?: number | null;
  selectedGrade?: number | null;
  selectedSubject?: number | null;
  selectedStudent?: number | null;
  filteredStudents?: Array<{id: number, username: string, firstName?: string, lastName?: string}>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const SubjectPerformanceDashboard: React.FC<SubjectPerformanceDashboardProps> = ({ 
  schools, 
  grades,
  selectedSchool: propSelectedSchool = null,
  selectedGrade: propSelectedGrade = null,
  selectedSubject: propSelectedSubject = null,
  selectedStudent: propSelectedStudent = null,
  filteredStudents: propFilteredStudents = []
}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  // Use props for filters (from Growth Analysis Filters)
  const effectiveSchool = propSelectedSchool;
  const effectiveGrade = propSelectedGrade;
  const effectiveSubject = propSelectedSubject;
  const effectiveStudent = propSelectedStudent;

  // Load subjects on mount
  useEffect(() => {
    loadSubjects();
  }, []);

  useEffect(() => {
    loadData();
  }, [effectiveSchool, effectiveGrade, effectiveSubject, effectiveStudent]);

  const loadSubjects = async () => {
    try {
      const subjectsData = await subjectsAPI.getAll();
      setSubjects(subjectsData);
    } catch (error) {
      console.error('Error loading subjects:', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const filters: any = {};
      if (effectiveSchool) filters.schoolId = effectiveSchool;
      if (effectiveGrade) filters.gradeId = effectiveGrade;
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
    if (effectiveStudent) return 'student';
    if (effectiveSubject) return 'subject';
    if (effectiveGrade) return 'grade';
    if (effectiveSchool) return 'school';
    return 'all-schools';
  };

  const viewLevel = getViewLevel();

  // Determine what data to show based on filters
  const getFilteredData = () => {
    if (!data || !data.subjectPerformance) return [];

    let filtered = data.subjectPerformance;

    // Filter by subject if selected
    if (effectiveSubject) {
      filtered = filtered.filter((s: any) => s.subject_id === effectiveSubject);
    }

    return filtered;
  };

  const filteredPerformanceData = getFilteredData();
  const hasData = filteredPerformanceData.length > 0;

  // Get title based on view level
  const getTitle = () => {
    switch (viewLevel) {
      case 'student':
        const student = propFilteredStudents.find(s => s.id === effectiveStudent);
        return `${student?.firstName && student?.lastName 
          ? `${student.firstName} ${student.lastName}`
          : student?.username || 'Student'} - Individual Performance`;
      case 'subject':
        const subject = subjects.find(s => s.id === effectiveSubject);
        return `${subject?.name || 'Subject'} Performance`;
      case 'grade':
        const grade = grades.find(g => g.id === effectiveGrade);
        return `${grade?.display_name || 'Grade'} Performance`;
      case 'school':
        const school = schools.find(s => s.id === effectiveSchool);
        return `${school?.name || 'School'} Performance`;
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
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
                .filter((subject: any) => !effectiveSubject || subject.subject_id === effectiveSubject)
                .map((subject: any, index: number) => {
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
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
                  {filteredPerformanceData.map((subject: any, index: number) => (
                    <Line
                      key={subject.subject_id}
                      type="monotone"
                      dataKey="average_rit_score"
                      data={data.yearTrends.filter((item: any) => item.subject_id === subject.subject_id).map((item: any) => ({
                        ...item,
                        average_rit_score: Number(item.average_rit_score) || 0
                      }))}
                      stroke={COLORS[index % COLORS.length]}
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
