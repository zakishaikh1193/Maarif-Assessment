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
import { TrendingUp, Users, Target, Download } from 'lucide-react';
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
}

const GrowthOverTimeChart: React.FC<GrowthOverTimeChartProps> = ({ data, userRole = 'student', filters = {}, performanceData }) => {
  // Get all unique periods from all data sources
  const allPeriods = new Set<string>();
  if (data.classAverages && data.classAverages.length > 0) {
    data.classAverages.forEach(avg => allPeriods.add(avg.period));
  }
  if (data.schoolAverages && data.schoolAverages.length > 0) {
    data.schoolAverages.forEach(avg => allPeriods.add(avg.period));
  }
  if (data.districtAverages && data.districtAverages.length > 0) {
    data.districtAverages.forEach(avg => allPeriods.add(avg.period));
  }
  if (data.studentScores && data.studentScores.length > 0) {
    data.studentScores.forEach(score => allPeriods.add(score.period));
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
  
  // Merge scores and averages into chart data
  const chartData = Array.from(allPeriods).map(period => {
    const classAvg = data.classAverages?.find(a => a.period === period);
    const schoolAvg = data.schoolAverages?.find(a => a.period === period);
    const studentScore = data.studentScores?.find(s => s.period === period);
    const distribution = data.periodDistributions?.find(d => d.period === period);
    const districtAvg = data.districtAverages?.find(d => d.period === period);

    // Determine year and assessmentPeriod from any available source
    const source = classAvg || schoolAvg || districtAvg || studentScore;
    
    return {
      period,
      year: source?.year || 0,
      assessmentPeriod: source?.assessmentPeriod || 'BOY',
      ritScore: studentScore?.ritScore ?? null,
      dateTaken: studentScore?.dateTaken ?? '',
      classAverage: classAvg?.averageRITScore ?? null,
      schoolAverage: schoolAvg?.averageRITScore ?? null,
      districtAverage: districtAvg?.averageRITScore ?? null,
      studentCount: classAvg?.studentCount || schoolAvg?.studentCount || districtAvg?.studentCount || 0,
      // distribution values for stacked bars (percent of total students)
      red: distribution ? distribution.distributions.red : 0,
      orange: distribution ? distribution.distributions.orange : 0,
      yellow: distribution ? distribution.distributions.yellow : 0,
      green: distribution ? distribution.distributions.green : 0,
      blue: distribution ? distribution.distributions.blue : 0
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
          {dataPoint?.schoolAverage !== null && dataPoint?.schoolAverage !== undefined && userRole === 'admin' && (
            <p className="text-gray-600">
              School Average: <span className="font-medium text-blue-600">{dataPoint.schoolAverage}</span>
            </p>
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

            {/* Overlay student + class average + district average lines */}
            <Line
              type="monotone"
              dataKey="ritScore"
              yAxisId={1} // secondary axis
              stroke="#1f2937"
              strokeWidth={3}
              dot={{ r: 5, fill: "#1f2937", stroke: "white", strokeWidth: 2 }}
              connectNulls={false}
            />
            {data.schoolAverages && data.schoolAverages.length > 0 && (
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
          {data.studentScores && data.studentScores.length > 0 && (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-1 bg-gray-900"></div>
              <span className="text-sm text-gray-600">Student Growth Metric Score</span>
            </div>
          )}
          {data.classAverages && data.classAverages.length > 0 && (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-1 bg-gray-500 border-dashed border border-gray-500"></div>
              <span className="text-sm text-gray-600">Class Average</span>
            </div>
          )}
          {data.schoolAverages && data.schoolAverages.length > 0 && userRole === 'admin' && (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-1 bg-blue-600 border border-blue-600" style={{ borderStyle: 'dashed' }}></div>
              <span className="text-sm text-gray-600">School Average</span>
            </div>
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
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
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
          
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Users className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-900">Class Size</span>
            </div>
            <div className="text-2xl font-bold text-purple-900">
              {Math.max(...data.classAverages.map(avg => avg.studentCount))}
            </div>
          </div>
        </div>
      </div>
    );
  };

export default GrowthOverTimeChart;
