import React, { useState, useEffect } from 'react';
import { Competency } from '../types';
import { competenciesAPI } from '../services/api';
import { Plus, Edit, X, Save, AlertCircle } from 'lucide-react';

interface CompetencyFormProps {
  editingCompetency: Competency | null;
  onCompetencyCreated: () => void;
  onCompetencyUpdated: () => void;
  onCancel: () => void;
}

const CompetencyForm: React.FC<CompetencyFormProps> = ({
  editingCompetency,
  onCompetencyCreated,
  onCompetencyUpdated,
  onCancel
}) => {
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    strong_description: '',
    neutral_description: '',
    growth_description: '',
    strong_threshold: 70,
    neutral_threshold: 50,
    is_active: true
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingCompetency) {
      setFormData({
        code: editingCompetency.code,
        name: editingCompetency.name,
        description: editingCompetency.description || '',
        strong_description: editingCompetency.strong_description,
        neutral_description: editingCompetency.neutral_description,
        growth_description: editingCompetency.growth_description,
        strong_threshold: editingCompetency.strong_threshold,
        neutral_threshold: editingCompetency.neutral_threshold,
        is_active: editingCompetency.is_active
      });
    }
  }, [editingCompetency]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (editingCompetency) {
        await competenciesAPI.update(editingCompetency.id, formData);
        onCompetencyUpdated();
      } else {
        await competenciesAPI.create(formData);
        onCompetencyCreated();
      }
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to save competency');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">
              {editingCompetency ? 'Edit Competency' : 'Create New Competency'}
            </h2>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span className="text-red-800">{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Competency Code *
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => handleInputChange('code', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., LOG001, CRT001"
                  maxLength={20}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Unique identifier (max 20 characters)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Competency Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Logical Reasoning"
                  maxLength={100}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="General description of the competency"
                  rows={3}
                />
              </div>
            </div>

            {/* Thresholds */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Strong Threshold *
                </label>
                <input
                  type="number"
                  value={formData.strong_threshold}
                  onChange={(e) => handleInputChange('strong_threshold', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                  max="100"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Minimum score for "strong" performance (0-100)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Neutral Threshold *
                </label>
                <input
                  type="number"
                  value={formData.neutral_threshold}
                  onChange={(e) => handleInputChange('neutral_threshold', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                  max="100"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Minimum score for "neutral" performance (0-100)</p>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => handleInputChange('is_active', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                  Active
                </label>
              </div>
            </div>
          </div>

          {/* Feedback Descriptions */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Feedback Descriptions</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Strong Performance Feedback *
              </label>
              <textarea
                value={formData.strong_description}
                onChange={(e) => handleInputChange('strong_description', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Feedback for students performing well (70+ score)"
                rows={3}
                required
              />
              <p className="text-xs text-gray-500 mt-1">Shown when student score ≥ strong threshold</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Neutral Performance Feedback *
              </label>
              <textarea
                value={formData.neutral_description}
                onChange={(e) => handleInputChange('neutral_description', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Feedback for students performing average (50-70 score)"
                rows={3}
                required
              />
              <p className="text-xs text-gray-500 mt-1">Shown when student score ≥ neutral threshold but less than strong threshold</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Growth Needed Feedback *
              </label>
              <textarea
                value={formData.growth_description}
                onChange={(e) => handleInputChange('growth_description', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Feedback for students needing improvement (<50 score)"
                rows={3}
                required
              />
              <p className="text-xs text-gray-500 mt-1">Shown when student score less than neutral threshold</p>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              ) : editingCompetency ? (
                <Edit className="h-4 w-4" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              <span>{editingCompetency ? 'Update Competency' : 'Create Competency'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CompetencyForm;
