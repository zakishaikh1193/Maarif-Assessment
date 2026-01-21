import React from 'react';
import { AdminStats } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface AdminStatsCardProps {
  stats: AdminStats;
}

const AdminStatsCard: React.FC<AdminStatsCardProps> = ({ stats }) => {
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mt-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Statistics</h3>
      
      {/* Difficulty Distribution */}
      <div className="mb-8">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Questions by Difficulty</h4>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={stats.difficultyDistribution}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="difficulty_range" 
              tick={{ fontSize: 12 }}
              interval={0}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Subject Distribution */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">Questions by Subject</h4>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={stats.subjectDistribution}
              cx="50%"
              cy="50%"
              outerRadius={60}
              fill="#8884d8"
              dataKey="question_count"
              label={({ name, value }) => `${name}: ${value}`}
            >
              {stats.subjectDistribution.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default AdminStatsCard;