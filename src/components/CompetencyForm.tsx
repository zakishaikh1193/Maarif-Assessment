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
    strong_threshold: null as number | null,
    neutral_threshold: null as number | null,
    is_active: true,
    parent_id: 0
  });
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Build hierarchical list for dropdown
  const buildHierarchicalList = (competencies: Competency[], excludeId?: number): (Competency & { level: number })[] => {
    const result: (Competency & { level: number })[] = [];
    
    // Ensure competencies is an array
    if (!Array.isArray(competencies)) {
      return result;
    }
    
    const competencyMap = new Map<number, Competency>();
    
    // Build map and filter excluded
    competencies.forEach(c => {
      if (c.id !== excludeId) {
        competencyMap.set(c.id, c);
      }
    });
    
    // Find top-level competencies (parent_id is 0, null, or undefined, or parent doesn't exist)
    const topLevel = Array.from(competencyMap.values()).filter(c => {
      const parentId = c.parent_id || 0;
      return parentId === 0 || !competencyMap.has(parentId);
    });
    
    // Recursively build tree
    const buildTree = (parentId: number, level: number) => {
      const children = Array.from(competencyMap.values()).filter(c => {
        const cParentId = c.parent_id || 0;
        return cParentId === parentId;
      });
      
      children.forEach(child => {
        result.push({ ...child, level });
        buildTree(child.id, level + 1);
      });
    };
    
    // Add top-level and their descendants
    topLevel.forEach(comp => {
      result.push({ ...comp, level: 0 });
      buildTree(comp.id, 1);
    });
    
    return result;
  };

  useEffect(() => {
    const loadCompetencies = async () => {
      try {
        // Get all competencies without pagination (pass large limit to get all)
        const response = await competenciesAPI.getAll(1, 10000);
        // Extract competencies array from response (which has { competencies, pagination } structure)
        const allCompetencies = Array.isArray(response) ? response : (response.competencies || []);
        
        // Filter out the current competency and its descendants if editing
        let filteredCompetencies = allCompetencies;
        if (editingCompetency) {
          // Get all descendants to exclude them
          const getDescendants = (parentId: number): number[] => {
            const children = allCompetencies.filter(c => (c.parent_id || 0) === parentId);
            const descendantIds = children.map(c => c.id);
            children.forEach(child => {
              descendantIds.push(...getDescendants(child.id));
            });
            return descendantIds;
          };
          
          const excludeIds = [editingCompetency.id, ...getDescendants(editingCompetency.id)];
          filteredCompetencies = allCompetencies.filter(c => !excludeIds.includes(c.id));
        }
        setCompetencies(filteredCompetencies);
      } catch (error) {
        console.error('Failed to load competencies:', error);
        setCompetencies([]); // Set empty array on error to prevent forEach errors
      }
    };
    loadCompetencies();
  }, [editingCompetency]);

  useEffect(() => {
    if (editingCompetency) {
      setFormData({
        code: editingCompetency.code,
        name: editingCompetency.name,
        description: editingCompetency.description || '',
        strong_description: editingCompetency.strong_description || '',
        neutral_description: editingCompetency.neutral_description || '',
        growth_description: editingCompetency.growth_description || '',
        strong_threshold: editingCompetency.strong_threshold ?? null,
        neutral_threshold: editingCompetency.neutral_threshold ?? null,
        is_active: editingCompetency.is_active,
        parent_id: editingCompetency.parent_id || 0
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

  const handleInputChange = (field: string, value: string | number | boolean | null) => {
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

          {/* Parent Competency - Full Width */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Parent Competency
            </label>
            <select
              value={formData.parent_id}
              onChange={(e) => handleInputChange('parent_id', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={0}>Top Level (No Parent)</option>
              {buildHierarchicalList(competencies, editingCompetency?.id).map((comp) => {
                const level = (comp as any).level || 0;
                const indent = '  '.repeat(level);
                return (
                  <option key={comp.id} value={comp.id}>
                    {indent}{comp.code} - {comp.name}
                  </option>
                );
              })}
            </select>
            <p className="text-xs text-gray-500 mt-1">Select a parent competency to create a hierarchy (1, 1.1, 1.1.a, etc.)</p>
          </div>

          {/* Competency Code and Name - Side by Side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                required
              />
              <p className="text-xs text-gray-500 mt-1">Unique identifier</p>
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
          </div>

          {/* Description - Full Width */}
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

          {/* Strong Threshold and Neutral Threshold - Side by Side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Strong Threshold
              </label>
              <input
                type="number"
                value={formData.strong_threshold ?? ''}
                onChange={(e) => handleInputChange('strong_threshold', e.target.value === '' ? null : parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min="0"
                max="100"
                placeholder="Optional (0-100)"
              />
              <p className="text-xs text-gray-500 mt-1">Minimum score for "strong" performance (0-100). Optional field.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Neutral Threshold
              </label>
              <input
                type="number"
                value={formData.neutral_threshold ?? ''}
                onChange={(e) => handleInputChange('neutral_threshold', e.target.value === '' ? null : parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min="0"
                max="100"
                placeholder="Optional (0-100)"
              />
              <p className="text-xs text-gray-500 mt-1">Minimum score for "neutral" performance (0-100). Optional field.</p>
            </div>
          </div>

          {/* Active Checkbox */}
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

          {/* Feedback Descriptions */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Feedback Descriptions (Optional)</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Strong Performance Feedback
              </label>
              <textarea
                value={formData.strong_description}
                onChange={(e) => handleInputChange('strong_description', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Feedback for students performing well (70+ score). Optional field."
                rows={3}
              />
              <p className="text-xs text-gray-500 mt-1">Shown when student score ≥ strong threshold (if provided)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Neutral Performance Feedback
              </label>
              <textarea
                value={formData.neutral_description}
                onChange={(e) => handleInputChange('neutral_description', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Feedback for students performing average (50-70 score). Optional field."
                rows={3}
              />
              <p className="text-xs text-gray-500 mt-1">Shown when student score ≥ neutral threshold but less than strong threshold (if provided)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Growth Needed Feedback
              </label>
              <textarea
                value={formData.growth_description}
                onChange={(e) => handleInputChange('growth_description', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Feedback for students needing improvement (<50 score). Optional field."
                rows={3}
              />
              <p className="text-xs text-gray-500 mt-1">Shown when student score less than neutral threshold (if provided)</p>
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
