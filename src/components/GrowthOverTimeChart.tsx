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
import { TrendingUp, Users, Target } from 'lucide-react';

interface GrowthOverTimeChartProps {
  data: GrowthOverTimeData;
  userRole?: 'student' | 'admin';
}

const GrowthOverTimeChart: React.FC<GrowthOverTimeChartProps> = ({ data, userRole = 'student' }) => {
  // Merge scores and averages into chart data
  const chartData = data.classAverages.map(classAvg => {
    const studentScore = data.studentScores.find(s => s.period === classAvg.period);
    const distribution = data.periodDistributions.find(d => d.period === classAvg.period);
    const districtAvg = data.districtAverages?.find(d => d.period === classAvg.period);

    return {
      period: classAvg.period,
      year: classAvg.year,
      assessmentPeriod: classAvg.assessmentPeriod,
      ritScore: studentScore?.ritScore ?? null,
      dateTaken: studentScore?.dateTaken ?? '',
      classAverage: classAvg.averageRITScore,
      districtAverage: districtAvg?.averageRITScore ?? null,
      studentCount: classAvg.studentCount,
      // distribution values for stacked bars (percent of total students)
      red: distribution ? distribution.distributions.red : 0,
      orange: distribution ? distribution.distributions.orange : 0,
      yellow: distribution ? distribution.distributions.yellow : 0,
      green: distribution ? distribution.distributions.green : 0,
      blue: distribution ? distribution.distributions.blue : 0
    };
  });

  // Sort by year + assessment period order (Winter → Spring → Fall)
  chartData.sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    const periodOrder = { 'Winter': 1, 'Spring': 2, 'Fall': 3 };
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
          {dataPoint?.ritScore && (
            <p className="text-gray-600">
              Your Growth Metric Score: <span className="font-medium text-blue-600">{dataPoint.ritScore}</span>
            </p>
          )}
          {dataPoint?.classAverage && (
            <p className="text-gray-600">
              Class Average: <span className="font-medium text-gray-600">{dataPoint.classAverage}</span>
              <span className="text-xs text-gray-500 ml-1">({dataPoint.studentCount} students)</span>
            </p>
          )}
          {dataPoint?.districtAverage && userRole === 'admin' && (
            <p className="text-gray-600">
              District Average: <span className="font-medium text-red-600">{dataPoint.districtAverage}</span>
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center space-x-2">
          <TrendingUp className="h-5 w-5 text-blue-600" />
          <span>Growth Over Time</span>
        </h3>
        <p className="text-gray-600 text-sm">
          {data.subjectName} - Growth Metric Score progression across assessment periods
        </p>
      </div>

      <div className="h-96">
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
            <Line
              type="monotone"
              dataKey="classAverage"
              yAxisId={1}
              stroke="#6b7280"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ r: 4, fill: "#6b7280", stroke: "white", strokeWidth: 1 }}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="districtAverage"
              yAxisId={1}
              stroke="#dc2626"
              strokeWidth={2}
              strokeDasharray="3 3"
              dot={{ r: 4, fill: "#dc2626", stroke: "white", strokeWidth: 1 }}
              connectNulls={false}
            />

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
          <div className="flex items-center space-x-2">
            <div className="w-4 h-1 bg-gray-900"></div>
            <span className="text-sm text-gray-600">Your Growth Metric Score</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-1 bg-gray-500 border-dashed border border-gray-500"></div>
            <span className="text-sm text-gray-600">Class Average</span>
          </div>
          {userRole === 'admin' && (
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
