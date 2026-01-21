import React, { useState, useEffect } from 'react';
import { AssessmentConfiguration, Grade, Subject } from '../types';
import { X, Save, Clock, Hash } from 'lucide-react';

interface AssessmentConfigFormProps {
  config?: AssessmentConfiguration | null;
  grades: Grade[];
  subjects: Subject[];
  onSubmit: (data: any) => void;
  onClose: () => void;
}

const AssessmentConfigForm: React.FC<AssessmentConfigFormProps> = ({
  config,
  grades,
  subjects,
  onSubmit,
  onClose
}) => {
  const [formData, setFormData] = useState({
    gradeId: 0,
    subjectId: 0,
    timeLimitMinutes: 30,
    questionCount: 10,
    isActive: true
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (config) {
      setFormData({
        gradeId: config.gradeId,
        subjectId: config.subjectId,
        timeLimitMinutes: config.timeLimitMinutes,
        questionCount: config.questionCount,
        isActive: config.isActive
      });
    }
  }, [config]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.gradeId) {
      newErrors.gradeId = 'Please select a grade';
    }

    if (!formData.subjectId) {
      newErrors.subjectId = 'Please select a subject';
    }

    if (!formData.timeLimitMinutes || formData.timeLimitMinutes < 1) {
      newErrors.timeLimitMinutes = 'Time limit must be at least 1 minute';
    }

    if (!formData.questionCount || formData.questionCount < 1) {
      newErrors.questionCount = 'Question count must be at least 1';
    }

    if (formData.questionCount > 100) {
      newErrors.questionCount = 'Question count cannot exceed 100';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {config ? 'Edit Configuration' : 'Add Configuration'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Grade Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Grade *
            </label>
            <select
              value={formData.gradeId === 0 ? '' : formData.gradeId}
              onChange={(e) => handleInputChange('gradeId', Number(e.target.value))}
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.gradeId ? 'border-red-300' : 'border-gray-300'
              }`}
            >
              <option value="">Select a grade</option>
              {grades.map((grade) => (
                <option key={grade.id} value={grade.id}>
                  {grade.display_name}
                </option>
              ))}
            </select>
            {errors.gradeId && (
              <p className="mt-1 text-sm text-red-600">{errors.gradeId}</p>
            )}
          </div>

          {/* Subject Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subject *
            </label>
            <select
              value={formData.subjectId === 0 ? '' : formData.subjectId}
              onChange={(e) => handleInputChange('subjectId', Number(e.target.value))}
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.subjectId ? 'border-red-300' : 'border-gray-300'
              }`}
            >
              <option value="">Select a subject</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
            {errors.subjectId && (
              <p className="mt-1 text-sm text-red-600">{errors.subjectId}</p>
            )}
          </div>

          {/* Time Limit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4" />
                <span>Time Limit (minutes) *</span>
              </div>
            </label>
            <input
              type="number"
              min="1"
              max="180"
              value={formData.timeLimitMinutes}
              onChange={(e) => handleInputChange('timeLimitMinutes', Number(e.target.value))}
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.timeLimitMinutes ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="30"
            />
            {errors.timeLimitMinutes && (
              <p className="mt-1 text-sm text-red-600">{errors.timeLimitMinutes}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Recommended: 20-60 minutes for most grades
            </p>
          </div>

          {/* Question Count */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center space-x-2">
                <Hash className="h-4 w-4" />
                <span>Number of Questions *</span>
              </div>
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={formData.questionCount}
              onChange={(e) => handleInputChange('questionCount', Number(e.target.value))}
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.questionCount ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="10"
            />
            {errors.questionCount && (
              <p className="mt-1 text-sm text-red-600">{errors.questionCount}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Recommended: 10-20 questions for most assessments
            </p>
          </div>

          {/* Active Status */}
          <div>
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => handleInputChange('isActive', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm font-medium text-gray-700">
                Active Configuration
              </span>
            </label>
            <p className="mt-1 text-xs text-gray-500">
              Inactive configurations won't be used for new assessments
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center space-x-2"
            >
              <Save className="h-4 w-4" />
              <span>{config ? 'Update' : 'Create'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssessmentConfigForm;
