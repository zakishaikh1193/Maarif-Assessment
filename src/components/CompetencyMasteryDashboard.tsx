import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Brain, TrendingUp, AlertTriangle, CheckCircle, Target, Users } from 'lucide-react';
import { adminAPI } from '../services/api';
import { School, Grade, Subject } from '../types';

interface CompetencyMasteryDashboardProps {
  schools: School[];
  grades: Grade[];
  subjects: Subject[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const CompetencyMasteryDashboard: React.FC<CompetencyMasteryDashboardProps> = ({ schools, grades, subjects }) => {
  const [selectedSchool, setSelectedSchool] = useState<number | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const years = [2023, 2024, 2025];

  useEffect(() => {
    loadData();
  }, [selectedSchool, selectedGrade, selectedSubject, selectedYear]);

  const loadData = async () => {
    setLoading(true);
    try {
      const filters: any = {};
      if (selectedSchool) filters.schoolId = selectedSchool;
      if (selectedGrade) filters.gradeId = selectedGrade;
      if (selectedSubject) filters.subjectId = selectedSubject;
      if (selectedYear) filters.year = selectedYear;

             const response = await adminAPI.getCompetencyMastery(filters);
       console.log('Competency Mastery Data:', response);
       setData(response);
    } catch (error) {
      console.error('Error loading competency mastery data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMasteryLevel = (score: any) => {
    const numericScore = Number(score) || 0;
    if (numericScore >= 75) return { level: 'Proficient', color: 'text-green-600', bgColor: 'bg-green-100' };
    if (numericScore >= 50) return { level: 'Developing', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
    return { level: 'Needs Support', color: 'text-red-600', bgColor: 'bg-red-100' };
  };

  const getMasteryIcon = (score: any) => {
    const numericScore = Number(score) || 0;
    if (numericScore >= 75) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (numericScore >= 50) return <Target className="h-4 w-4 text-yellow-600" />;
    return <AlertTriangle className="h-4 w-4 text-red-600" />;
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
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Competency Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
            <select
              value={selectedSubject || ''}
              onChange={(e) => setSelectedSubject(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Subjects</option>
              {subjects.map(subject => (
                <option key={subject.id} value={subject.id}>{subject.name}</option>
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

             {data && data.competencyMastery && data.competencyMastery.length > 0 && (
        <>
          {/* Competency Mastery Overview */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Brain className="h-5 w-5 text-purple-600 mr-2" />
              Competency Mastery Overview
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                                 <BarChart data={data.competencyMastery.map((competency: any) => ({
                   ...competency,
                   average_score: Number(competency.average_score) || 0
                 }))}>
                   <CartesianGrid strokeDasharray="3 3" />
                   <XAxis dataKey="competency_name" angle={-45} textAnchor="end" height={80} />
                   <YAxis domain={[0, 100]} />
                   <Tooltip />
                   <Legend />
                   <Bar dataKey="average_score" fill="#8B5CF6" name="Average Score (%)" />
                 </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Competency Performance Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.competencyMastery.map((competency: any) => {
              const mastery = getMasteryLevel(competency.average_score);
              return (
                <div key={competency.competency_id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900">{competency.competency_name}</h4>
                    {getMasteryIcon(competency.average_score)}
                  </div>
                  <div className="space-y-3">
                                         <div className="flex justify-between items-center">
                       <span className="text-gray-600">Average Score:</span>
                       <span className={`font-bold text-lg ${mastery.color}`}>
                         {competency.average_score ? Number(competency.average_score).toFixed(1) : '0.0'}%
                       </span>
                     </div>
                    <div className={`px-3 py-2 rounded-lg ${mastery.bgColor}`}>
                      <span className={`text-sm font-medium ${mastery.color}`}>
                        {mastery.level}
                      </span>
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex justify-between">
                        <span>Students:</span>
                        <span className="font-medium">{competency.student_count}</span>
                      </div>
                                             <div className="flex justify-between">
                         <span>Proficient:</span>
                         <span className="font-medium text-green-600">
                           {competency.proficient_count || 0} ({competency.student_count ? ((competency.proficient_count || 0) / competency.student_count * 100).toFixed(1) : '0.0'}%)
                         </span>
                       </div>
                       <div className="flex justify-between">
                         <span>Struggling:</span>
                         <span className="font-medium text-red-600">
                           {competency.struggling_count || 0} ({competency.student_count ? ((competency.struggling_count || 0) / competency.student_count * 100).toFixed(1) : '0.0'}%)
                         </span>
                       </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* School Competency Comparison */}
                     {data.schoolCompetencyMastery && data.schoolCompetencyMastery.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Users className="h-5 w-5 text-blue-600 mr-2" />
                School Competency Comparison
              </h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                                   <BarChart data={data.schoolCompetencyMastery.map((school: any) => ({
                   ...school,
                   average_score: Number(school.average_score) || 0
                 }))}>
                   <CartesianGrid strokeDasharray="3 3" />
                   <XAxis dataKey="school_name" />
                   <YAxis domain={[0, 100]} />
                   <Tooltip />
                   <Legend />
                   <Bar dataKey="average_score" fill="#3B82F6" name="Average Score (%)" />
                 </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Grade Competency Comparison */}
                     {data.gradeCompetencyMastery && data.gradeCompetencyMastery.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Target className="h-5 w-5 text-green-600 mr-2" />
                Grade Competency Comparison
              </h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                                   <BarChart data={data.gradeCompetencyMastery.map((grade: any) => ({
                   ...grade,
                   average_score: Number(grade.average_score) || 0
                 }))}>
                   <CartesianGrid strokeDasharray="3 3" />
                   <XAxis dataKey="grade_name" />
                   <YAxis domain={[0, 100]} />
                   <Tooltip />
                   <Legend />
                   <Bar dataKey="average_score" fill="#10B981" name="Average Score (%)" />
                 </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Mastery Distribution */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Mastery Distribution</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                             {data.competencyMastery.map((competency: any) => {
                 const proficientCount = competency.proficient_count || 0;
                 const strugglingCount = competency.struggling_count || 0;
                 const studentCount = competency.student_count || 1;
                 
                 const proficientPercent = (proficientCount / studentCount) * 100;
                 const developingPercent = ((studentCount - proficientCount - strugglingCount) / studentCount) * 100;
                 const strugglingPercent = (strugglingCount / studentCount) * 100;

                const pieData = [
                  { name: 'Proficient', value: proficientPercent, color: '#10B981' },
                  { name: 'Developing', value: developingPercent, color: '#F59E0B' },
                  { name: 'Needs Support', value: strugglingPercent, color: '#EF4444' }
                ].filter(item => item.value > 0);

                return (
                  <div key={competency.competency_id} className="text-center">
                    <h4 className="font-medium text-gray-900 mb-3">{competency.competency_name}</h4>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={30}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-3 space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-green-600">Proficient:</span>
                        <span>{proficientPercent.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-yellow-600">Developing:</span>
                        <span>{developingPercent.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-red-600">Needs Support:</span>
                        <span>{strugglingPercent.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
                 </>
       )}

       {data && (!data.competencyMastery || data.competencyMastery.length === 0) && (
         <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
           <div className="text-center py-8">
             <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
             <h3 className="text-lg font-medium text-gray-900 mb-2">No Competency Data Available</h3>
             <p className="text-gray-600">
               No competency mastery data found for the selected filters. Try adjusting your filter criteria.
             </p>
           </div>
         </div>
       )}
    </div>
  );
};

export default CompetencyMasteryDashboard;
