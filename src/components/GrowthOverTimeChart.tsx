import React from 'react';
  import {
    ComposedChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Bar,
    Area
  } from 'recharts';
import { GrowthOverTimeData } from '../types';
import { TrendingUp, Target, Download } from 'lucide-react';
import { exportGrowthGraphicalToPDF } from '../utils/growthReportExport';
import { exportCompletePerformanceReportToPDF } from '../utils/performanceReportExport';

interface GrowthOverTimeChartProps {
  data: GrowthOverTimeData;
  userRole?: 'student' | 'admin';
  filters?: {
    schoolName?: string | null;
    gradeName?: string | null;
    studentName?: string | null;
    subjectName?: string | null;
  };
  performanceData?: {
    subjectPerformance?: Array<{
      subject_id: number;
      subject_name: string;
      average_rit_score: number;
      student_count: number;
      min_score: number;
      max_score: number;
      standard_deviation: number;
    }>;
    growthRates?: Array<{
      subject_id: number;
      subject_name: string;
      boy_avg: number;
      eoy_avg: number;
    }>;
    yearTrends?: Array<{
      year: number;
      subject_id: number;
      subject_name: string;
      average_rit_score: number;
    }>;
  };
  schoolNamesMap?: { [schoolId: number]: string }; // Map of schoolId to school name
  studentNamesMap?: { [studentId: number]: string }; // Map of studentId to student name
}

const GrowthOverTimeChart: React.FC<GrowthOverTimeChartProps> = ({ data, userRole = 'student', filters = {}, performanceData, schoolNamesMap = {}, studentNamesMap = {} }) => {
  // Get all unique periods from all data sources
  const allPeriods = new Set<string>();
  if (data.classAverages && data.classAverages.length > 0) {
    data.classAverages.forEach(avg => allPeriods.add(avg.period));
  }
  if (data.schoolAverages && data.schoolAverages.length > 0) {
    data.schoolAverages.forEach((avg: any) => allPeriods.add(avg.period));
  }
  if (data.districtAverages && data.districtAverages.length > 0) {
    data.districtAverages.forEach(avg => allPeriods.add(avg.period));
  }
  if (data.studentScores && data.studentScores.length > 0) {
    data.studentScores.forEach((score: any) => allPeriods.add(score.period));
  }
  
  // If no periods found, return empty chart
  if (allPeriods.size === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="text-center py-8">
          <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No growth data available</p>
        </div>
      </div>
    );
  }
  
  // Handle multiple schools - group by schoolId if present
  const schoolAveragesBySchool: { [schoolId: number]: any[] } = {};
  const schoolIds: number[] = [];
  if (data.schoolAverages && data.schoolAverages.length > 0) {
    data.schoolAverages.forEach((avg: any) => {
      // Check for schoolId property (could be schoolId or school_id from backend)
      let schoolId: number | null = null;
      
      // Try schoolId first
      if (avg.schoolId !== undefined && avg.schoolId !== null) {
        schoolId = typeof avg.schoolId === 'number' ? avg.schoolId : parseInt(avg.schoolId);
      }
      // Fallback to school_id
      else if (avg.school_id !== undefined && avg.school_id !== null) {
        schoolId = typeof avg.school_id === 'number' ? avg.school_id : parseInt(avg.school_id);
      }
      
      // Only process if we have a valid schoolId
      if (schoolId !== null && !isNaN(schoolId)) {
        if (!schoolAveragesBySchool[schoolId]) {
          schoolAveragesBySchool[schoolId] = [];
        }
        if (!schoolIds.includes(schoolId)) {
          schoolIds.push(schoolId);
        }
        schoolAveragesBySchool[schoolId].push(avg);
      }
    });
  }
  
  // Sort schoolIds to ensure consistent ordering
  schoolIds.sort((a, b) => a - b);
  
  // Handle multiple students - group by studentId if present
  const studentScoresByStudent: { [studentId: number]: any[] } = {};
  const studentIds: number[] = [];
  if (data.studentScores && data.studentScores.length > 0) {
    data.studentScores.forEach((score: any) => {
      // Check for studentId property (could be studentId or student_id from backend)
      let studentId: number | null = null;
      
      // Try studentId first
      if (score.studentId !== undefined && score.studentId !== null) {
        studentId = typeof score.studentId === 'number' ? score.studentId : parseInt(score.studentId);
      }
      // Fallback to student_id
      else if (score.student_id !== undefined && score.student_id !== null) {
        studentId = typeof score.student_id === 'number' ? score.student_id : parseInt(score.student_id);
      }
      
      // Only process if we have a valid studentId
      if (studentId !== null && !isNaN(studentId)) {
        if (!studentScoresByStudent[studentId]) {
          studentScoresByStudent[studentId] = [];
        }
        if (!studentIds.includes(studentId)) {
          studentIds.push(studentId);
        }
        studentScoresByStudent[studentId].push(score);
      }
    });
  }
  
  // Sort studentIds to ensure consistent ordering
  studentIds.sort((a, b) => a - b);
  
  // Debug logging for students
  if (data.studentScores && data.studentScores.length > 0) {
    console.log('[GrowthOverTimeChart] Student scores received:', data.studentScores);
    console.log('[GrowthOverTimeChart] First student score structure:', JSON.stringify(data.studentScores[0], null, 2));
    console.log('[GrowthOverTimeChart] First student score studentId:', data.studentScores[0]?.studentId, 'type:', typeof data.studentScores[0]?.studentId);
    console.log('[GrowthOverTimeChart] First student score student_id:', data.studentScores[0]?.student_id, 'type:', typeof data.studentScores[0]?.student_id);
    console.log('[GrowthOverTimeChart] Student IDs detected:', studentIds);
    console.log('[GrowthOverTimeChart] Student scores by student:', studentScoresByStudent);
  }
  
  // Light blue shades for multiple student lines (lighter to darker)
  const studentColors = ['#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a'];
  
  // Gray shades for multiple school lines (lighter to darker)
  const schoolColors = ['#9ca3af', '#6b7280', '#4b5563', '#374151', '#1f2937', '#111827'];
  
  const chartData = Array.from(allPeriods).map(period => {
    const classAvg = data.classAverages?.find(a => a.period === period);
    // For single school (no schoolId property), use first school average
    // For multiple schools, we'll add separate data keys - don't use single schoolAvg
    const schoolAvg = schoolIds.length === 0 
      ? (data.schoolAverages?.find((a: any) => a.period === period && !a.schoolId) || 
         data.schoolAverages?.find((a: any) => a.period === period))
      : null; // Don't use single schoolAvg when we have multiple schools
    // For single student (no studentId property), use first student score
    // For multiple students, we'll add separate data keys - don't use single studentScore
    const studentScore = studentIds.length === 0 
      ? (data.studentScores?.find((s: any) => s.period === period && !s.studentId) ||
         data.studentScores?.find((s: any) => s.period === period))
      : null; // Don't use single studentScore when we have multiple students
    const distribution = data.periodDistributions?.find(d => d.period === period);
    const districtAvg = data.districtAverages?.find(d => d.period === period);
    
    // Add school averages for each school if multiple schools
    const schoolData: { [key: string]: number | null } = {};
    if (schoolIds.length > 0) {
      schoolIds.forEach((schoolId) => {
        const schoolAvgForPeriod = schoolAveragesBySchool[schoolId]?.find((a: any) => a.period === period);
        schoolData[`school${schoolId}`] = schoolAvgForPeriod?.averageRITScore ?? null;
      });
    }
    
    // Add student scores for each student if multiple students
    const studentData: { [key: string]: number | null } = {};
    if (studentIds.length > 0) {
      studentIds.forEach((studentId) => {
        const studentScoreForPeriod = studentScoresByStudent[studentId]?.find((s: any) => s.period === period);
        studentData[`student${studentId}`] = studentScoreForPeriod?.ritScore ?? null;
      });
    }

    // Determine year and assessmentPeriod from any available source
    const source = classAvg || (schoolIds.length > 0 ? schoolAveragesBySchool[schoolIds[0]]?.[0] : schoolAvg) || 
                   (studentIds.length > 0 ? studentScoresByStudent[studentIds[0]]?.[0] : studentScore) || districtAvg;
    
    return {
      period,
      year: source?.year || 0,
      assessmentPeriod: source?.assessmentPeriod || 'BOY',
      ritScore: studentScore?.ritScore ?? null, // For single student or fallback
      dateTaken: studentScore?.dateTaken ?? '',
      classAverage: classAvg?.averageRITScore ?? null,
      schoolAverage: schoolAvg?.averageRITScore ?? null, // For single school or fallback
      districtAverage: districtAvg?.averageRITScore ?? null,
      studentCount: classAvg?.studentCount || schoolAvg?.studentCount || districtAvg?.studentCount || 0,
      // distribution values for stacked bars (percent of total students)
      red: distribution ? distribution.distributions.red : 0,
      orange: distribution ? distribution.distributions.orange : 0,
      yellow: distribution ? distribution.distributions.yellow : 0,
      green: distribution ? distribution.distributions.green : 0,
      blue: distribution ? distribution.distributions.blue : 0,
      // Add school-specific data for multiple schools
      ...schoolData,
      // Add student-specific data for multiple students
      ...studentData
    };
  });

  // Sort by year + assessment period order (BOY → EOY)
  chartData.sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    const periodOrder = { 'BOY': 1, 'EOY': 2 };
    return periodOrder[a.assessmentPeriod as keyof typeof periodOrder] -
           periodOrder[b.assessmentPeriod as keyof typeof periodOrder];
  });

  // Colors for score ranges
  const colorMap = {
    red: '#dc2626',
    orange: '#ea580c',
    yellow: '#ca8a04',
    green: '#16a34a',
    blue: '#2563eb'
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = chartData.find(d => d.period === label);
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
          <p className="font-medium text-gray-900 mb-2">{label}</p>
          {dataPoint?.ritScore !== null && dataPoint?.ritScore !== undefined && (
            <p className="text-gray-600">
              Student Growth Metric Score: <span className="font-medium text-gray-900">{dataPoint.ritScore}</span>
            </p>
          )}
          {dataPoint?.classAverage !== null && dataPoint?.classAverage !== undefined && (
            <p className="text-gray-600">
              Class Average: <span className="font-medium text-gray-600">{dataPoint.classAverage}</span>
              <span className="text-xs text-gray-500 ml-1">({dataPoint.studentCount} students)</span>
            </p>
          )}
          {/* Show school averages - handle both single and multiple */}
          {schoolIds.length > 0 ? (
            schoolIds.map((schoolId, idx) => {
              const schoolValue = (dataPoint as any)[`school${schoolId}`];
              const schoolName = schoolNamesMap[schoolId] || `School ${idx + 1}`;
              return schoolValue !== null && schoolValue !== undefined ? (
                <p key={`tooltip-school-${schoolId}`} className="text-gray-600">
                  {schoolName} Average: <span className="font-medium" style={{ color: schoolColors[idx % schoolColors.length] }}>{schoolValue}</span>
                </p>
              ) : null;
            })
          ) : (
            dataPoint?.schoolAverage !== null && dataPoint?.schoolAverage !== undefined && userRole === 'admin' && (
              <p className="text-gray-600">
                School Average: <span className="font-medium text-blue-600">{dataPoint.schoolAverage}</span>
              </p>
            )
          )}
          {dataPoint?.districtAverage !== null && dataPoint?.districtAverage !== undefined && userRole === 'admin' && (
            <p className="text-gray-600">
              District Average: <span className="font-medium text-red-600">{dataPoint.districtAverage}</span>
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  const handleDownloadPDF = async () => {
    try {
      // If performance data is provided, export complete report, otherwise just growth chart
      if (performanceData) {
        await exportCompletePerformanceReportToPDF(
          data,
          performanceData,
          filters,
          {
            performanceOverview: 'performance-overview-chart',
            growthOverTime: 'growth-chart-container',
            yearTrends: 'year-trends-chart'
          }
        );
      } else {
        await exportGrowthGraphicalToPDF(data, filters, 'growth-chart-container');
      }
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF. Please try again.');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            <span>Growth Over Time</span>
          </h3>
          <p className="text-gray-600 text-sm">
            {data.subjectName || 'All Subjects'} - Growth Metric Score progression across assessment periods
          </p>
        </div>
        <button
          onClick={handleDownloadPDF}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Download className="h-4 w-4" />
          <span>Download PDF</span>
        </button>
      </div>

      <div id="growth-chart-container" className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

                         {/* Connected background areas spanning full width */}
             <Area
               type="monotone"
               dataKey="red"
               stackId="background"
               fill={colorMap.red}
               fillOpacity={0.3}
               stroke="none"
               connectNulls={true}
             />
             <Area
               type="monotone"
               dataKey="orange"
               stackId="background"
               fill={colorMap.orange}
               fillOpacity={0.3}
               stroke="none"
               connectNulls={true}
             />
             <Area
               type="monotone"
               dataKey="yellow"
               stackId="background"
               fill={colorMap.yellow}
               fillOpacity={0.3}
               stroke="none"
               connectNulls={true}
             />
             <Area
               type="monotone"
               dataKey="green"
               stackId="background"
               fill={colorMap.green}
               fillOpacity={0.3}
               stroke="none"
               connectNulls={true}
             />
             <Area
               type="monotone"
               dataKey="blue"
               stackId="background"
               fill={colorMap.blue}
               fillOpacity={0.3}
               stroke="none"
               connectNulls={true}
             />

            <XAxis
              dataKey="period"
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 12 }}
              orientation="right"
              ticks={[0, 20, 40, 60, 80, 100]}
              label={{ value: '% of Students', angle: -90, position: 'insideRight' }}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Student Line(s) - show one line per student if multiple students */}
            {studentIds.length > 0 ? (
              // Multiple students - show a line for each with light blue shades
              studentIds.map((studentId, idx) => {
                const studentName = studentNamesMap[studentId] || `Student ${idx + 1}`;
                return (
                  <Line
                    key={`student-${studentId}`}
                    type="monotone"
                    dataKey={`student${studentId}`}
                    yAxisId={1}
                    stroke={studentColors[idx % studentColors.length]}
                    strokeWidth={studentIds.length === 1 ? 4 : 3} // Bold for single student
                    dot={{ r: 5, fill: studentColors[idx % studentColors.length], stroke: "white", strokeWidth: 2 }}
                    connectNulls={false}
                    name={studentName}
                  />
                );
              })
            ) : (
              // Single student without studentId property - show single bold light blue line
              data.studentScores && data.studentScores.length > 0 && data.studentScores.every((s: any) => !s.studentId) && (
                <Line
                  type="monotone"
                  dataKey="ritScore"
                  yAxisId={1}
                  stroke="#60a5fa" // Light blue
                  strokeWidth={4} // Bold
                  dot={{ r: 5, fill: "#60a5fa", stroke: "white", strokeWidth: 2 }}
                  connectNulls={false}
                  name="Student"
                />
              )
            )}
            {/* School Average Line(s) - show one line per school if multiple schools */}
            {schoolIds.length > 0 ? (
              // Multiple schools - show a line for each with gray shades
              schoolIds.map((schoolId, idx) => {
                const schoolName = schoolNamesMap[schoolId] || `School ${idx + 1}`;
                return (
                  <Line
                    key={`school-${schoolId}`}
                    type="monotone"
                    dataKey={`school${schoolId}`}
                    yAxisId={1}
                    stroke={schoolColors[idx % schoolColors.length]}
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ r: 4, fill: schoolColors[idx % schoolColors.length], stroke: "white", strokeWidth: 1 }}
                    connectNulls={false}
                    name={`${schoolName} Average`}
                  />
                );
              })
            ) : (
              // Single school or no schoolId - show single line (only if we have school averages without schoolId)
              data.schoolAverages && data.schoolAverages.length > 0 && data.schoolAverages.every((a: any) => !a.schoolId) && (
                <Line
                  type="monotone"
                  dataKey="schoolAverage"
                  yAxisId={1}
                  stroke="#3b82f6"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 4, fill: "#3b82f6", stroke: "white", strokeWidth: 1 }}
                  connectNulls={false}
                  name="School Average"
                />
              )
            )}
            {data.classAverages && data.classAverages.length > 0 && (
              <Line
                type="monotone"
                dataKey="classAverage"
                yAxisId={1}
                stroke="#6b7280"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ r: 4, fill: "#6b7280", stroke: "white", strokeWidth: 1 }}
                connectNulls={false}
                name="Class Average"
              />
            )}
            {/* District Average Line - always show for comparison */}
            {data.districtAverages && data.districtAverages.length > 0 && (
              <Line
                type="monotone"
                dataKey="districtAverage"
                yAxisId={1}
                stroke="#dc2626"
                strokeWidth={2}
                strokeDasharray="3 3"
                dot={{ r: 4, fill: "#dc2626", stroke: "white", strokeWidth: 1 }}
                connectNulls={false}
                name="District Average"
              />
            )}

            {/* Second Y axis for Growth Metric scores */}
            <YAxis
              yAxisId={1}
              orientation="left"
              domain={[100, 350]}
              ticks={[100, 150, 200, 250, 300, 350]}
              label={{
                value: 'Growth Metric Score ',
                angle: -90,
                position: 'insideLeft',
                offset: 10
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
              </div>

        {/* Legend */}
        <div className="mt-6 flex flex-wrap gap-6 justify-center">
          {/* Student Legend */}
          {studentIds.length > 0 ? (
            // Multiple students - show legend for each with student names
            studentIds.map((studentId, idx) => {
              const studentName = studentNamesMap[studentId] || `Student ${idx + 1}`;
              return (
                <div key={`legend-student-${studentId}`} className="flex items-center space-x-2">
                  <div 
                    className="w-4 h-1" 
                    style={{ 
                      backgroundColor: studentColors[idx % studentColors.length]
                    }}
                  ></div>
                  <span className="text-sm text-gray-600">{studentName}</span>
                </div>
              );
            })
          ) : (
            // Single student without studentId - show single legend
            data.studentScores && data.studentScores.length > 0 && data.studentScores.every((s: any) => !s.studentId) && (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-1 bg-blue-400"></div>
                <span className="text-sm text-gray-600">Student</span>
              </div>
            )
          )}
          {/* Student Legend */}
          {studentIds.length > 0 ? (
            // Multiple students - show legend for each with student names
            studentIds.map((studentId, idx) => {
              const studentName = studentNamesMap[studentId] || `Student ${idx + 1}`;
              return (
                <div key={`legend-student-${studentId}`} className="flex items-center space-x-2">
                  <div 
                    className="w-4 h-1" 
                    style={{ 
                      backgroundColor: studentColors[idx % studentColors.length],
                      borderColor: studentColors[idx % studentColors.length]
                    }}
                  ></div>
                  <span className="text-sm text-gray-600">{studentName}</span>
                </div>
              );
            })
          ) : (
            // Single student without studentId - show single legend
            data.studentScores && data.studentScores.length > 0 && data.studentScores.every((s: any) => !s.studentId) && (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-1 bg-blue-400"></div>
                <span className="text-sm text-gray-600">Student</span>
              </div>
            )
          )}
          {data.classAverages && data.classAverages.length > 0 && (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-1 bg-gray-500 border-dashed border border-gray-500"></div>
              <span className="text-sm text-gray-600">Class Average</span>
            </div>
          )}
          {schoolIds.length > 0 ? (
            // Multiple schools - show legend for each with school names
            schoolIds.map((schoolId, idx) => {
              const schoolName = schoolNamesMap[schoolId] || `School ${idx + 1}`;
              return (
                <div key={`legend-school-${schoolId}`} className="flex items-center space-x-2">
                  <div 
                    className="w-4 h-1 border" 
                    style={{ 
                      backgroundColor: schoolColors[idx % schoolColors.length],
                      borderColor: schoolColors[idx % schoolColors.length],
                      borderStyle: 'dashed'
                    }}
                  ></div>
                  <span className="text-sm text-gray-600">{schoolName} Average</span>
                </div>
              );
            })
          ) : (
            data.schoolAverages && data.schoolAverages.length > 0 && data.schoolAverages.every((a: any) => !a.schoolId) && userRole === 'admin' && (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-1 bg-blue-600 border border-blue-600" style={{ borderStyle: 'dashed' }}></div>
                <span className="text-sm text-gray-600">School Average</span>
              </div>
            )
          )}
          {data.districtAverages && data.districtAverages.length > 0 && userRole === 'admin' && (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-1 bg-red-600 border border-red-600" style={{ borderStyle: 'dashed' }}></div>
              <span className="text-sm text-gray-600">District Average</span>
            </div>
          )}
        </div>

        {/* Growth Metric Score Ranges Legend */}
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Growth Metric Score Ranges</h4>
          <div className="grid grid-cols-5 gap-2 text-xs">
            <div className="text-center">
              <div 
                className="w-full h-2 rounded mb-1"
                style={{ backgroundColor: colorMap.red }}
              ></div>
              <div className="text-gray-600">100-150</div>
              <div className="text-gray-500">Red</div>
            </div>
            <div className="text-center">
              <div 
                className="w-full h-2 rounded mb-1"
                style={{ backgroundColor: colorMap.orange }}
              ></div>
              <div className="text-gray-600">151-200</div>
              <div className="text-gray-500">Orange</div>
            </div>
            <div className="text-center">
              <div 
                className="w-full h-2 rounded mb-1"
                style={{ backgroundColor: colorMap.yellow }}
              ></div>
              <div className="text-gray-600">201-250</div>
              <div className="text-gray-500">Yellow</div>
            </div>
            <div className="text-center">
              <div 
                className="w-full h-2 rounded mb-1"
                style={{ backgroundColor: colorMap.green }}
              ></div>
              <div className="text-gray-600">251-300</div>
              <div className="text-gray-500">Green</div>
            </div>
            <div className="text-center">
              <div 
                className="w-full h-2 rounded mb-1"
                style={{ backgroundColor: colorMap.blue }}
              ></div>
              <div className="text-gray-600">301-350</div>
              <div className="text-gray-500">Blue</div>
            </div>
          </div>
        </div>


        {/* Summary Stats */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Target className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">Total Assessments</span>
            </div>
            <div className="text-2xl font-bold text-blue-900">{data.totalAssessments}</div>
          </div>
          
          <div className="bg-emerald-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-medium text-emerald-900">Growth Trend</span>
            </div>
            <div className="text-sm text-emerald-700">
              {data.studentScores.length >= 2 ? (
                data.studentScores[data.studentScores.length - 1].ritScore > data.studentScores[0].ritScore 
                  ? "📈 Improving" 
                  : "📉 Declining"
              ) : "📊 Insufficient data"}
            </div>
          </div>
        </div>
      </div>
    );
  };

export default GrowthOverTimeChart;
