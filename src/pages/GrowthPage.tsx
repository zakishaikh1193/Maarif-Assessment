import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { studentAPI, subjectsAPI } from '../services/api';
import { GrowthOverTimeData, Subject } from '../types';
import Navigation from '../components/Navigation';
import GrowthOverTimeChart from '../components/GrowthOverTimeChart';
import { ArrowLeft, BookOpen, TrendingUp, AlertCircle } from 'lucide-react';

const GrowthPage: React.FC = () => {
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [growthData, setGrowthData] = useState<GrowthOverTimeData | null>(null);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (subjectId) {
      loadGrowthData();
      loadSubject();
    }
  }, [subjectId]);

  const loadGrowthData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await studentAPI.getGrowthOverTime(parseInt(subjectId!));
      setGrowthData(data);
    } catch (error: any) {
      console.error('Failed to load growth data:', error);
      setError(error.response?.data?.error || 'Failed to load growth data');
    } finally {
      setLoading(false);
    }
  };

  const loadSubject = async () => {
    try {
      const subjectData = await subjectsAPI.getById(parseInt(subjectId!));
      setSubject(subjectData);
    } catch (error) {
      console.error('Failed to load subject:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <Navigation />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
            <div className="text-red-600 text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Growth Data</h1>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!growthData || growthData.studentScores.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
            <div className="text-blue-600 text-6xl mb-4">📊</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">No Growth Data Available</h1>
            <p className="text-gray-600 mb-4">
              You need to complete at least one assessment in {subject?.name} to view growth data.
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Navigation />
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Dashboard</span>
          </button>
          
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BookOpen className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Growth Over Time
              </h1>
              <p className="text-gray-600">
                {subject?.name} • {user?.firstName || user?.username}
              </p>
            </div>
          </div>
        </div>

        {/* Growth Chart */}
        <div className="mb-8">
                          <GrowthOverTimeChart data={growthData} userRole="student" />
        </div>

        {/* Insights Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            <span>Growth Insights</span>
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Your Progress</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">First Assessment:</span>
                  <span className="font-medium">
                    {growthData.studentScores[0]?.ritScore} Growth Metric
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Latest Assessment:</span>
                  <span className="font-medium">
                    {growthData.studentScores[growthData.studentScores.length - 1]?.ritScore} Growth Metric
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Growth:</span>
                  <span className={`font-medium ${
                    growthData.studentScores[growthData.studentScores.length - 1]?.ritScore > growthData.studentScores[0]?.ritScore
                      ? 'text-emerald-600'
                      : 'text-red-600'
                  }`}>
                    {growthData.studentScores[growthData.studentScores.length - 1]?.ritScore - growthData.studentScores[0]?.ritScore} points
                  </span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Assessment History</h4>
              <div className="space-y-1 text-sm">
                {growthData.studentScores.map((score, index) => (
                  <div key={index} className="flex justify-between">
                    <span className="text-gray-600">{score.period}:</span>
                    <span className="font-medium">{score.ritScore} Growth Metric</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
          >
            Back to Dashboard
          </button>
          <button
            onClick={() => navigate(`/assessments/results/${subjectId}`)}
            className="px-8 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-medium"
          >
            View Detailed Results
          </button>
        </div>
      </div>
    </div>
  );
};

export default GrowthPage;
