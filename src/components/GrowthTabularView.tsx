import React from 'react';
import { GrowthOverTimeData } from '../types';
import { TrendingUp, Users, Target, Building, GraduationCap, User, Download, FileSpreadsheet } from 'lucide-react';
import { exportGrowthTabularToPDF, exportGrowthTabularToCSV } from '../utils/growthReportExport';
import { exportCompletePerformanceReportToPDF } from '../utils/performanceReportExport';

interface GrowthTabularViewProps {
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

const GrowthTabularView: React.FC<GrowthTabularViewProps> = ({ data, userRole = 'admin', filters = {}, performanceData }) => {
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

  // If no periods found, return empty message
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

  // Merge all data by period
  const tableData = Array.from(allPeriods)
    .map(period => {
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
        studentScore: studentScore?.ritScore ?? null,
        classAverage: classAvg?.averageRITScore ?? null,
        schoolAverage: schoolAvg?.averageRITScore ?? null,
        districtAverage: districtAvg?.averageRITScore ?? null,
        studentCount: classAvg?.studentCount || schoolAvg?.studentCount || districtAvg?.studentCount || 0,
        distributions: distribution?.distributions || {
          red: 0,
          orange: 0,
          yellow: 0,
          green: 0,
          blue: 0
        }
      };
    })
    .sort((a, b) => {
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

  const handleDownloadPDF = async () => {
    try {
      // Export tabular PDF with performance overview included
      await exportGrowthTabularToPDF(
        data, 
        filters,
        performanceData,
        {
          performanceOverview: 'performance-overview-chart',
          yearTrends: 'year-trends-chart'
        }
      );
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF. Please try again.');
    }
  };

  const handleDownloadCSV = () => {
    try {
      exportGrowthTabularToCSV(data, filters);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('Failed to export CSV. Please try again.');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            <span>Growth Over Time - Tabular View</span>
          </h3>
          <p className="text-gray-600 text-sm">
            {data.subjectName || 'All Subjects'} - Growth Metric Score progression across assessment periods
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleDownloadPDF}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>Download PDF</span>
          </button>
          <button
            onClick={handleDownloadCSV}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Download CSV</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Period
              </th>
              {data.studentScores && data.studentScores.length > 0 && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4" />
                    <span>Student Score</span>
                  </div>
                </th>
              )}
              {data.classAverages && data.classAverages.length > 0 && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center space-x-2">
                    <GraduationCap className="h-4 w-4" />
                    <span>Class Average</span>
                  </div>
                </th>
              )}
              {data.schoolAverages && data.schoolAverages.length > 0 && userRole === 'admin' && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center space-x-2">
                    <Building className="h-4 w-4" />
                    <span>School Average</span>
                  </div>
                </th>
              )}
              {data.districtAverages && data.districtAverages.length > 0 && userRole === 'admin' && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center space-x-2">
                    <Target className="h-4 w-4" />
                    <span>District Average</span>
                  </div>
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4" />
                  <span>Student Count</span>
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Score Distribution (%)
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tableData.map((row, index) => (
              <tr key={row.period} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {row.period}
                </td>
                {data.studentScores && data.studentScores.length > 0 && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {row.studentScore !== null ? (
                      <span className="font-semibold">{row.studentScore}</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                )}
                {data.classAverages && data.classAverages.length > 0 && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {row.classAverage !== null ? (
                      <span>{row.classAverage}</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                )}
                {data.schoolAverages && data.schoolAverages.length > 0 && userRole === 'admin' && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                    {row.schoolAverage !== null ? (
                      <span>{row.schoolAverage}</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                )}
                {data.districtAverages && data.districtAverages.length > 0 && userRole === 'admin' && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                    {row.districtAverage !== null ? (
                      <span>{row.districtAverage}</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                )}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {row.studentCount}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-1">
                    {row.distributions.red > 0 && (
                      <div
                        className="h-4 rounded"
                        style={{
                          width: `${row.distributions.red}%`,
                          backgroundColor: colorMap.red,
                          minWidth: row.distributions.red > 0 ? '2px' : '0'
                        }}
                        title={`Red (100-150): ${row.distributions.red}%`}
                      />
                    )}
                    {row.distributions.orange > 0 && (
                      <div
                        className="h-4 rounded"
                        style={{
                          width: `${row.distributions.orange}%`,
                          backgroundColor: colorMap.orange,
                          minWidth: row.distributions.orange > 0 ? '2px' : '0'
                        }}
                        title={`Orange (151-200): ${row.distributions.orange}%`}
                      />
                    )}
                    {row.distributions.yellow > 0 && (
                      <div
                        className="h-4 rounded"
                        style={{
                          width: `${row.distributions.yellow}%`,
                          backgroundColor: colorMap.yellow,
                          minWidth: row.distributions.yellow > 0 ? '2px' : '0'
                        }}
                        title={`Yellow (201-250): ${row.distributions.yellow}%`}
                      />
                    )}
                    {row.distributions.green > 0 && (
                      <div
                        className="h-4 rounded"
                        style={{
                          width: `${row.distributions.green}%`,
                          backgroundColor: colorMap.green,
                          minWidth: row.distributions.green > 0 ? '2px' : '0'
                        }}
                        title={`Green (251-300): ${row.distributions.green}%`}
                      />
                    )}
                    {row.distributions.blue > 0 && (
                      <div
                        className="h-4 rounded"
                        style={{
                          width: `${row.distributions.blue}%`,
                          backgroundColor: colorMap.blue,
                          minWidth: row.distributions.blue > 0 ? '2px' : '0'
                        }}
                        title={`Blue (301-350): ${row.distributions.blue}%`}
                      />
                    )}
                    <span className="ml-2 text-xs text-gray-500">
                      {row.distributions.red + row.distributions.orange + row.distributions.yellow + row.distributions.green + row.distributions.blue}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
            {data.studentScores && data.studentScores.length >= 2 ? (
              data.studentScores[data.studentScores.length - 1].ritScore > data.studentScores[0].ritScore 
                ? "📈 Improving" 
                : "📉 Declining"
            ) : data.districtAverages && data.districtAverages.length >= 2 ? (
              data.districtAverages[data.districtAverages.length - 1].averageRITScore > data.districtAverages[0].averageRITScore
                ? "📈 Improving"
                : "📉 Declining"
            ) : "📊 Insufficient data"}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Score Distribution Legend</h4>
        <div className="grid grid-cols-5 gap-2 text-xs">
          <div className="text-center">
            <div 
              className="w-full h-3 rounded mb-1"
              style={{ backgroundColor: colorMap.red }}
            ></div>
            <div className="text-gray-600 font-medium">100-150</div>
            <div className="text-gray-500">Red</div>
          </div>
          <div className="text-center">
            <div 
              className="w-full h-3 rounded mb-1"
              style={{ backgroundColor: colorMap.orange }}
            ></div>
            <div className="text-gray-600 font-medium">151-200</div>
            <div className="text-gray-500">Orange</div>
          </div>
          <div className="text-center">
            <div 
              className="w-full h-3 rounded mb-1"
              style={{ backgroundColor: colorMap.yellow }}
            ></div>
            <div className="text-gray-600 font-medium">201-250</div>
            <div className="text-gray-500">Yellow</div>
          </div>
          <div className="text-center">
            <div 
              className="w-full h-3 rounded mb-1"
              style={{ backgroundColor: colorMap.green }}
            ></div>
            <div className="text-gray-600 font-medium">251-300</div>
            <div className="text-gray-500">Green</div>
          </div>
          <div className="text-center">
            <div 
              className="w-full h-3 rounded mb-1"
              style={{ backgroundColor: colorMap.blue }}
            ></div>
            <div className="text-gray-600 font-medium">301-350</div>
            <div className="text-gray-500">Blue</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GrowthTabularView;
