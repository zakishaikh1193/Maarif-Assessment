import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea
} from 'recharts';
import { DifficultyProgression } from '../types';
import { CheckCircle, XCircle } from 'lucide-react';

interface DifficultyProgressionChartProps {
  data: DifficultyProgression[];
  currentRIT: number;
  previousRIT?: number | null;
  mode?: 'Standard' | 'Adaptive';
}

const DifficultyProgressionChart: React.FC<DifficultyProgressionChartProps> = ({
  data,
  currentRIT,
  previousRIT,
  mode = 'Adaptive'
}) => {
  // For Standard mode, transform data to show performance progression
  const isStandardMode = mode === 'Standard';
  
  // Transform data for Standard mode: show cumulative correct answers or percentage
  const performanceData = isStandardMode ? data.map((item, index) => {
    const previousItems = data.slice(0, index + 1);
    const correctCount = previousItems.filter(i => i.isCorrect).length;
    const percentage = ((correctCount / (index + 1)) * 100).toFixed(1);
    return {
      questionNumber: item.questionNumber,
      performance: parseFloat(percentage), // Percentage correct so far
      cumulativeCorrect: correctCount,
      isCorrect: item.isCorrect
    };
  }) : null;
  // Define difficulty level ranges for background colors (only for Adaptive mode)
  const difficultyRanges = [
    { min: 100, max: 149, color: '#fef2f2', label: 'Beginning' },
    { min: 150, max: 199, color: '#fff7ed', label: 'Developing' },
    { min: 200, max: 249, color: '#fefce8', label: 'Proficient' },
    { min: 250, max: 299, color: '#f0fdf4', label: 'Advanced' },
    { min: 300, max: 350, color: '#eff6ff', label: 'Advanced+' }
  ];

  // Calculate chart dimensions based on mode
  let yDomain: [number, number];
  let chartData: any[];
  let yAxisLabel: string;
  let dataKey: string;
  
  if (isStandardMode && performanceData) {
    // For Standard mode: show performance percentage (0-100)
    chartData = performanceData;
    yDomain = [0, 100];
    yAxisLabel = 'Performance (%)';
    dataKey = 'performance';
  } else {
    // For Adaptive mode: show difficulty progression
    chartData = data;
    const minDifficulty = Math.min(...data.map(d => d.difficulty));
    const maxDifficulty = Math.max(...data.map(d => d.difficulty));
    const padding = 20;
    yDomain = [
      Math.max(100, minDifficulty - padding),
      Math.min(350, maxDifficulty + padding)
    ];
    yAxisLabel = 'Difficulty Level';
    dataKey = 'difficulty';
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = isStandardMode 
        ? performanceData?.find(d => d.questionNumber === label)
        : data.find(d => d.questionNumber === label);
      
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
          <p className="font-medium text-gray-900">Question {label}</p>
          {isStandardMode ? (
            <>
              <p className="text-gray-600">
                Performance: <span className="font-medium">{payload[0].value}%</span>
              </p>
              <p className="text-gray-600 text-sm">
                Cumulative Correct: <span className="font-medium">{dataPoint?.cumulativeCorrect || 0} / {label}</span>
              </p>
            </>
          ) : (
            <p className="text-gray-600">
              Difficulty: <span className="font-medium">{payload[0].value}</span>
            </p>
          )}
          <div className="flex items-center space-x-2 mt-2">
            {dataPoint?.isCorrect ? (
              <>
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                <span className="text-emerald-600 font-medium">Correct</span>
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 text-red-600" />
                <span className="text-red-600 font-medium">Incorrect</span>
              </>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom dot component
  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    const dataPoint = isStandardMode
      ? performanceData?.find(d => d.questionNumber === payload.questionNumber)
      : data.find(d => d.questionNumber === payload.questionNumber);
    
    return (
      <g>
        <circle
          cx={cx}
          cy={cy}
          r={6}
          fill={dataPoint?.isCorrect ? '#10b981' : '#ef4444'}
          stroke="white"
          strokeWidth={2}
        />
        {dataPoint?.isCorrect ? (
          <CheckCircle
            x={cx - 4}
            y={cy - 4}
            width={8}
            height={8}
            fill="white"
          />
        ) : (
          <XCircle
            x={cx - 4}
            y={cy - 4}
            width={8}
            height={8}
            fill="white"
          />
        )}
      </g>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {isStandardMode ? 'Answer Performance Progression' : 'Difficulty Progression'}
        </h3>
        <p className="text-gray-600 text-sm">
          {isStandardMode 
            ? 'Track your performance as you progress through the assessment'
            : 'Track how question difficulty adapted based on your performance'}
        </p>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            
            {/* Background ranges - only for Adaptive mode */}
            {!isStandardMode && difficultyRanges.map((range, index) => (
              <ReferenceArea
                key={index}
                y1={range.min}
                y2={range.max}
                fill={range.color}
                fillOpacity={0.3}
              />
            ))}

            {/* For Standard mode: show average performance line */}
            {isStandardMode && (
              <ReferenceLine
                y={((currentRIT / 350) * 100)}
                stroke="#3b82f6"
                strokeDasharray="5 5"
                strokeWidth={2}
                label={{
                  value: `Average Performance: ${((currentRIT / 350) * 100).toFixed(1)}%`,
                  position: 'insideTopRight',
                  fill: '#3b82f6',
                  fontSize: 12
                }}
              />
            )}

            {/* Growth Metric Score Reference Lines - only for Adaptive mode */}
            {!isStandardMode && (
              <>
                <ReferenceLine
                  y={currentRIT}
                  stroke="#3b82f6"
                  strokeDasharray="5 5"
                  strokeWidth={2}
                  label={{
                    value: `Current Growth Metric: ${currentRIT}`,
                    position: 'insideTopRight',
                    fill: '#3b82f6',
                    fontSize: 12
                  }}
                />
                
                {previousRIT && (
                  <ReferenceLine
                    y={previousRIT}
                    stroke="#6b7280"
                    strokeDasharray="3 3"
                    strokeWidth={1}
                    label={{
                      value: `Previous Growth Metric: ${previousRIT}`,
                      position: 'insideBottomRight',
                      fill: '#6b7280',
                      fontSize: 12
                    }}
                  />
                )}
              </>
            )}

            <XAxis
              dataKey="questionNumber"
              type="number"
              domain={[1, 'dataMax']}
              tickCount={chartData.length}
              tick={{ fontSize: 12 }}
              label={{ value: 'Question Number', position: 'insideBottom', offset: -10 }}
            />
            
            <YAxis
              domain={yDomain}
              tick={{ fontSize: 12 }}
              label={{ 
                value: yAxisLabel, 
                angle: -90, 
                position: 'insideLeft',
                offset: 10
              }}
            />
            
            <Tooltip content={<CustomTooltip />} />
            
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke="#1f2937"
              strokeWidth={3}
              dot={<CustomDot />}
              activeDot={{ r: 8, stroke: '#1f2937', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="mt-6 flex flex-wrap gap-4 justify-center">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
          <span className="text-sm text-gray-600">Correct Answer</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <span className="text-sm text-gray-600">Incorrect Answer</span>
        </div>
        {!isStandardMode && (
          <>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full border-2 border-white"></div>
              <span className="text-sm text-gray-600">Current Growth Metric Score</span>
            </div>
            {previousRIT && (
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-gray-500 rounded-full border-2 border-white"></div>
                <span className="text-sm text-gray-600">Previous Growth Metric Score</span>
              </div>
            )}
          </>
        )}
        {isStandardMode && (
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full border-2 border-white"></div>
            <span className="text-sm text-gray-600">Average Performance</span>
          </div>
        )}
      </div>

      {/* Difficulty Level Legend - only for Adaptive mode */}
      {!isStandardMode && (
        <div className="mt-4 grid grid-cols-5 gap-2 text-xs">
          {difficultyRanges.map((range, index) => (
            <div key={index} className="text-center">
              <div 
                className="w-full h-2 rounded mb-1"
                style={{ backgroundColor: range.color }}
              ></div>
              <div className="text-gray-600">{range.label}</div>
              <div className="text-gray-500">{range.min}-{range.max}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DifficultyProgressionChart;
