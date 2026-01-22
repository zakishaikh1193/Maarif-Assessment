import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Target, Users, Award, AlertTriangle } from 'lucide-react';
import { adminAPI } from '../services/api';
import { School, Grade } from '../types';

interface SubjectPerformanceDashboardProps {
  schools: School[];
  grades: Grade[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const SubjectPerformanceDashboard: React.FC<SubjectPerformanceDashboardProps> = ({ schools, grades }) => {
  const [selectedSchool, setSelectedSchool] = useState<number | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const years = [2023, 2024, 2025];

  useEffect(() => {
    loadData();
  }, [selectedSchool, selectedGrade, selectedYear]);

  const loadData = async () => {
    setLoading(true);
    try {
      const filters: any = {};
      if (selectedSchool) filters.schoolId = selectedSchool;
      if (selectedGrade) filters.gradeId = selectedGrade;
      if (selectedYear) filters.year = selectedYear;

             const response = await adminAPI.getSubjectPerformance(filters);
       console.log('Subject Performance Data:', response);
       setData(response);
    } catch (error) {
      console.error('Error loading subject performance data:', error);
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

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">School</label>
            <select
              value={selectedSchool || ''}
              onChange={(e) => setSelectedSchool(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Schools</option>
              {schools.map(school => (
                <option key={school.id} value={school.id}>{school.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Grade</label>
            <select
              value={selectedGrade || ''}
              onChange={(e) => setSelectedGrade(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Grades</option>
              {grades.map(grade => (
                <option key={grade.id} value={grade.id}>{grade.display_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
            <select
              value={selectedYear || ''}
              onChange={(e) => setSelectedYear(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Years</option>
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

             {data && data.subjectPerformance && data.subjectPerformance.length > 0 && (
        <>
          {/* Subject Performance Overview */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Award className="h-5 w-5 text-blue-600 mr-2" />
              Subject Performance Overview
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                                 <BarChart data={data.subjectPerformance.map((subject: any) => ({
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
          </div>

          {/* Growth Rates */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <TrendingUp className="h-5 w-5 text-green-600 mr-2" />
              Growth Rates (BOY to EOY)
            </h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               {data.growthRates && data.growthRates.map((subject: any, index: number) => {
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

          {/* Year-over-Year Trends */}
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
                   {data.subjectPerformance && data.subjectPerformance.map((subject: any, index: number) => (
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

          {/* Performance Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                         {data.subjectPerformance && data.subjectPerformance.map((subject: any) => (
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
                 </>
       )}

       {data && (!data.subjectPerformance || data.subjectPerformance.length === 0) && (
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
    </div>
  );
};

export default SubjectPerformanceDashboard;
