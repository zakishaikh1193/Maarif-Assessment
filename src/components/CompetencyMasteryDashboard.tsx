import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Brain, AlertTriangle, CheckCircle, Target, Users } from 'lucide-react';
import { adminAPI } from '../services/api';
import { School, Grade, Subject } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface CompetencyMasteryDashboardProps {
  schools: School[];
  grades: Grade[];
  subjects: Subject[];
}

const CompetencyMasteryDashboard: React.FC<CompetencyMasteryDashboardProps> = ({ schools, grades, subjects }) => {
  const { user, loading: authLoading } = useAuth();
  const [selectedSchool, setSelectedSchool] = useState<number | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const years = [2023, 2024, 2025];

  useEffect(() => {
    // Wait for auth to be ready before making requests
    if (!authLoading && user) {
      loadData();
    }
  }, [selectedSchool, selectedGrade, selectedSubject, selectedYear, authLoading, user]);

  const loadData = async () => {
    // Check if user is authenticated
    if (!user) {
      console.error('User not authenticated');
      setError('You are not authenticated. Please log in again.');
      setData(null);
      setLoading(false);
      return;
    }

    // Check if token exists before making request
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No authentication token found. Please log in again.');
      setError('You are not authenticated. Please log in again.');
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const filters: any = {};
      if (selectedSchool) filters.schoolId = selectedSchool;
      if (selectedGrade) filters.gradeId = selectedGrade;
      if (selectedSubject) filters.subjectId = selectedSubject;
      if (selectedYear) filters.year = selectedYear;

      console.log('[CompetencyMastery] Making request with filters:', filters);
      console.log('[CompetencyMastery] Token exists:', !!token);
      
      const response = await adminAPI.getCompetencyMastery(filters);
      console.log('Competency Mastery Data:', response);
      setData(response);
    } catch (error: any) {
      console.error('Error loading competency mastery data:', error);
      console.error('Error response:', error.response);
      // If it's an auth error, the interceptor should handle redirect
      // But we'll also set data to null to show appropriate message
      if (error.response?.status === 401 || error.response?.status === 403) {
        const errorMessage = error.response?.data?.error || 'Authentication failed';
        setError(`${errorMessage}. Please log in again.`);
        setData(null);
      } else if (error.code === 'ERR_NETWORK' || error.message?.includes('CORS')) {
        setError('Network error. Please check if the backend server is running.');
        setData(null);
      } else {
        setError(error.response?.data?.error || 'Failed to load competency mastery data. Please try again.');
        setData(null);
      }
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
          <div className="group relative bg-gradient-to-br from-white via-purple-50/20 to-white rounded-xl shadow-lg border-2 border-purple-100 p-6 overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-200/10 to-transparent rounded-full blur-3xl"></div>
            <div className="relative">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <Brain className="h-6 w-6 text-purple-600" />
                Competency Mastery Overview
              </h3>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={data.competencyMastery.map((competency: any) => ({
                      ...competency,
                      average_score: Number(competency.average_score) || 0
                    }))}
                      margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                    <XAxis 
                      dataKey="competency_name" 
                      tick={{ fill: '#6b7280', fontSize: 12, fontWeight: 500 }}
                      axisLine={{ stroke: '#d1d5db' }}
                      tickLine={{ stroke: '#d1d5db' }}
                      interval={0}
                    />
                    <YAxis 
                      domain={[0, 100]}
                      tick={{ fill: '#6b7280', fontSize: 12, fontWeight: 500 }}
                      axisLine={{ stroke: '#d1d5db' }}
                      tickLine={{ stroke: '#d1d5db' }}
                      label={{ 
                        value: 'Average Score (%)', 
                        angle: -90, 
                        position: 'insideLeft',
                        style: { textAnchor: 'middle', fill: '#6b7280', fontSize: 12, fontWeight: 600 }
                      }}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        padding: '12px'
                      }}
                      labelStyle={{ 
                        color: '#111827', 
                        fontWeight: 600, 
                        marginBottom: '8px',
                        fontSize: '14px'
                      }}
                      formatter={(value: any) => [`${Number(value).toFixed(2)}%`, 'Average Score (%)']}
                    />
                    <Legend 
                      wrapperStyle={{ paddingTop: '20px' }}
                      iconType="rect"
                    />
                    <Bar 
                      dataKey="average_score" 
                      fill="#8B5CF6" 
                      name="Average Score (%)"
                      radius={[8, 8, 0, 0]}
                      stroke="#7C3AED"
                      strokeWidth={1}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Competency Performance Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.competencyMastery.map((competency: any) => {
              const mastery = getMasteryLevel(competency.average_score);
              const proficientPercent = competency.student_count ? ((competency.proficient_count || 0) / competency.student_count * 100).toFixed(1) : '0.0';
              const strugglingPercent = competency.student_count ? ((competency.struggling_count || 0) / competency.student_count * 100).toFixed(1) : '0.0';
              
              // Determine gradient colors based on mastery level
              const gradientColors = {
                'Proficient': 'from-green-50/40 via-green-50/20 to-white',
                'Developing': 'from-yellow-50/40 via-yellow-50/20 to-white',
                'Needs Support': 'from-red-50/40 via-red-50/20 to-white'
              };
              const borderColors = {
                'Proficient': 'border-green-200/50',
                'Developing': 'border-yellow-200/50',
                'Needs Support': 'border-red-200/50'
              };
              const blurColors = {
                'Proficient': 'from-green-200/15',
                'Developing': 'from-yellow-200/15',
                'Needs Support': 'from-red-200/15'
              };
              const badgeBorderColors = {
                'Proficient': 'border-green-600',
                'Developing': 'border-yellow-600',
                'Needs Support': 'border-red-600'
              };
              
              return (
                <div key={competency.competency_id} className={`group relative bg-gradient-to-br ${gradientColors[mastery.level as keyof typeof gradientColors]} rounded-lg shadow-md border-2 ${borderColors[mastery.level as keyof typeof borderColors]} p-4 overflow-hidden hover:shadow-lg hover:scale-[1.01] transition-all duration-300`}>
                  <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${blurColors[mastery.level as keyof typeof blurColors]} to-transparent rounded-full blur-2xl`}></div>
                  <div className="relative">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold text-base text-gray-900">{competency.competency_name}</h4>
                      <div className="p-1.5 rounded-md bg-white/80 shadow-sm border border-gray-200/50">
                        {getMasteryIcon(competency.average_score)}
                      </div>
                    </div>
                    
                    {/* Average Score - Large and Prominent */}
                    <div className="mb-3">
                      <div className="flex items-baseline gap-1.5 mb-2">
                        <span className={`font-black text-3xl ${mastery.color}`}>
                          {competency.average_score ? Number(competency.average_score).toFixed(1) : '0.0'}
                        </span>
                        <span className={`text-lg font-bold ${mastery.color} opacity-70`}>%</span>
                      </div>
                      <div className={`inline-block px-3 py-1.5 rounded-md ${mastery.bgColor} border-2 ${badgeBorderColors[mastery.level as keyof typeof badgeBorderColors]} shadow-sm`}>
                        <span className={`text-xs font-bold ${mastery.color}`}>
                          {mastery.level}
                        </span>
                      </div>
                    </div>
                    
                    {/* Divider */}
                    <div className="border-t border-gray-200/50 my-3"></div>
                    
                    {/* Student Statistics */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center py-1.5 px-2.5 bg-gray-50/50 rounded-md">
                        <span className="text-xs font-semibold text-gray-700">Students:</span>
                        <span className="font-bold text-sm text-gray-900">{competency.student_count}</span>
                      </div>
                      <div className="flex justify-between items-center py-1.5 px-2.5 bg-green-50/50 rounded-md border border-green-100">
                        <span className="text-xs font-semibold text-gray-700">Proficient:</span>
                        <span className="font-bold text-sm text-green-600">
                          {competency.proficient_count || 0} <span className="text-xs font-normal">({proficientPercent}%)</span>
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-1.5 px-2.5 bg-red-50/50 rounded-md border border-red-100">
                        <span className="text-xs font-semibold text-gray-700">Struggling:</span>
                        <span className="font-bold text-sm text-red-600">
                          {competency.struggling_count || 0} <span className="text-xs font-normal">({strugglingPercent}%)</span>
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
            <div className="group relative bg-gradient-to-br from-white via-blue-50/20 to-white rounded-xl shadow-lg border-2 border-blue-100 p-6 overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-200/10 to-transparent rounded-full blur-3xl"></div>
              <div className="relative">
                <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                  <Users className="h-6 w-6 text-blue-600" />
                  School Competency Comparison
                </h3>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={data.schoolCompetencyMastery.map((school: any) => ({
                        ...school,
                        average_score: Number(school.average_score) || 0
                      }))}
                      margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                      <XAxis 
                        dataKey="school_name" 
                        tick={{ fill: '#6b7280', fontSize: 12, fontWeight: 500 }}
                        axisLine={{ stroke: '#d1d5db' }}
                        tickLine={{ stroke: '#d1d5db' }}
                        interval={0}
                      />
                      <YAxis 
                        domain={[0, 100]}
                        tick={{ fill: '#6b7280', fontSize: 12, fontWeight: 500 }}
                        axisLine={{ stroke: '#d1d5db' }}
                        tickLine={{ stroke: '#d1d5db' }}
                        label={{ 
                          value: 'Average Score (%)', 
                          angle: -90, 
                          position: 'insideLeft',
                          style: { textAnchor: 'middle', fill: '#6b7280', fontSize: 12, fontWeight: 600 }
                        }}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                          padding: '12px'
                        }}
                        labelStyle={{ 
                          color: '#111827', 
                          fontWeight: 600, 
                          marginBottom: '8px',
                          fontSize: '14px'
                        }}
                        formatter={(value: any) => [`${Number(value).toFixed(3)}%`, 'Average Score (%)']}
                      />
                      <Legend 
                        wrapperStyle={{ paddingTop: '20px' }}
                        iconType="rect"
                      />
                      <Bar 
                        dataKey="average_score" 
                        fill="#3B82F6" 
                        name="Average Score (%)"
                        radius={[8, 8, 0, 0]}
                        stroke="#2563eb"
                        strokeWidth={1}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Grade Competency Comparison */}
                     {data.gradeCompetencyMastery && data.gradeCompetencyMastery.length > 0 && (
            <div className="group relative bg-gradient-to-br from-white via-green-50/20 to-white rounded-xl shadow-lg border-2 border-green-100 p-6 overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-green-200/10 to-transparent rounded-full blur-3xl"></div>
              <div className="relative">
                <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                  <Target className="h-6 w-6 text-green-600" />
                  Grade Competency Comparison
                </h3>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={data.gradeCompetencyMastery.map((grade: any) => ({
                        ...grade,
                        average_score: Number(grade.average_score) || 0
                      }))}
                      margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                      <XAxis 
                        dataKey="grade_name" 
                        tick={{ fill: '#6b7280', fontSize: 12, fontWeight: 500 }}
                        axisLine={{ stroke: '#d1d5db' }}
                        tickLine={{ stroke: '#d1d5db' }}
                      />
                      <YAxis 
                        domain={[0, 100]}
                        tick={{ fill: '#6b7280', fontSize: 12, fontWeight: 500 }}
                        axisLine={{ stroke: '#d1d5db' }}
                        tickLine={{ stroke: '#d1d5db' }}
                        label={{ 
                          value: 'Average Score (%)', 
                          angle: -90, 
                          position: 'insideLeft',
                          style: { textAnchor: 'middle', fill: '#6b7280', fontSize: 12, fontWeight: 600 }
                        }}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                          padding: '12px'
                        }}
                        labelStyle={{ 
                          color: '#111827', 
                          fontWeight: 600, 
                          marginBottom: '8px',
                          fontSize: '14px'
                        }}
                        formatter={(value: any) => [`${Number(value).toFixed(3)}%`, 'Average Score (%)']}
                      />
                      <Legend 
                        wrapperStyle={{ paddingTop: '20px' }}
                        iconType="rect"
                      />
                      <Bar 
                        dataKey="average_score" 
                        fill="#10B981" 
                        name="Average Score (%)"
                        radius={[8, 8, 0, 0]}
                        stroke="#059669"
                        strokeWidth={1}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Mastery Distribution */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Mastery Distribution</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {data.competencyMastery.map((competency: any) => {
                const proficientCount = competency.proficient_count || 0;
                const developingCount = competency.developing_count || 0;
                const strugglingCount = competency.struggling_count || 0;
                const studentCount = competency.student_count || 1;
                
                // Use actual developing_count from backend, or calculate if not available
                const actualDevelopingCount = developingCount > 0 
                  ? developingCount 
                  : Math.max(0, studentCount - proficientCount - strugglingCount);
                
                const proficientPercent = (proficientCount / studentCount) * 100;
                const developingPercent = (actualDevelopingCount / studentCount) * 100;
                const strugglingPercent = (strugglingCount / studentCount) * 100;

                // Round percentages to avoid floating point issues
                let roundedProficient = Math.round(proficientPercent * 10) / 10;
                let roundedDeveloping = Math.round(developingPercent * 10) / 10;
                let roundedStruggling = Math.round(strugglingPercent * 10) / 10;
                
                // Ensure they add up to exactly 100% by adjusting the largest value
                const total = roundedProficient + roundedDeveloping + roundedStruggling;
                if (Math.abs(total - 100) > 0.1) {
                  const diff = 100 - total;
                  if (roundedProficient >= roundedDeveloping && roundedProficient >= roundedStruggling) {
                    roundedProficient += diff;
                  } else if (roundedDeveloping >= roundedStruggling) {
                    roundedDeveloping += diff;
                  } else {
                    roundedStruggling += diff;
                  }
                }

                // Create pie data and filter out zero values
                let pieData = [
                  { name: 'Proficient', value: roundedProficient, color: '#10B981' },
                  { name: 'Developing', value: roundedDeveloping, color: '#F59E0B' },
                  { name: 'Needs Support', value: roundedStruggling, color: '#EF4444' }
                ].filter(item => item.value > 0);
                
                // Final normalization to ensure exactly 100%
                const filteredTotal = pieData.reduce((sum, item) => sum + item.value, 0);
                if (filteredTotal > 0 && Math.abs(filteredTotal - 100) > 0.01) {
                  pieData = pieData.map(item => ({
                    ...item,
                    value: Math.round((item.value / filteredTotal) * 100 * 10) / 10
                  }));
                }

                return (
                  <div key={competency.competency_id} className="bg-white rounded-xl shadow-md border-2 border-gray-200 p-6 hover:shadow-lg transition-all duration-300">
                    <h4 className="font-semibold text-gray-900 mb-4 text-center">{competency.competency_name}</h4>
                    <div className="flex flex-col md:flex-row items-center gap-6">
                      {/* Donut Chart */}
                      <div className="flex-shrink-0">
                        <div className="h-48 w-48">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={40}
                                outerRadius={80}
                                paddingAngle={2}
                                dataKey="value"
                                startAngle={90}
                                endAngle={-270}
                              >
                                {pieData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} stroke="#fff" strokeWidth={2} />
                                ))}
                              </Pie>
                              <Tooltip 
                                contentStyle={{
                                  backgroundColor: 'white',
                                  border: '1px solid #e5e7eb',
                                  borderRadius: '6px',
                                  padding: '8px'
                                }}
                                formatter={(value: any) => `${Number(value).toFixed(1)}%`}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                      
                      {/* Legend */}
                      <div className="flex-1 space-y-2">
                        <div className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded-md">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            <span className="text-sm font-medium text-gray-700">Proficient:</span>
                          </div>
                          <span className="text-sm font-semibold text-green-600">{roundedProficient.toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded-md">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                            <span className="text-sm font-medium text-gray-700">Developing:</span>
                          </div>
                          <span className="text-sm font-semibold text-orange-600">{roundedDeveloping.toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded-md">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                            <span className="text-sm font-medium text-gray-700">Needs Support:</span>
                          </div>
                          <span className="text-sm font-semibold text-red-600">{roundedStruggling.toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
                 </>
       )}

       {error && (
         <div className="bg-red-50 border border-red-200 rounded-xl shadow-sm p-6">
           <div className="text-center py-4">
             <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
             <h3 className="text-lg font-medium text-red-900 mb-2">Error Loading Data</h3>
             <p className="text-red-700 mb-4">{error}</p>
             <button
               onClick={loadData}
               className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
             >
               Retry
             </button>
           </div>
         </div>
       )}

       {!error && data && (!data.competencyMastery || data.competencyMastery.length === 0) && (
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
