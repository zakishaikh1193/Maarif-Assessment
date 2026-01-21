import React, { useState, useEffect } from 'react';
import { Subject, Question, Grade, Competency } from '../types';
import { adminAPI, gradesAPI, competenciesAPI } from '../services/api';
import { AlertCircle, Save, X, Plus, Trash2 } from 'lucide-react';

interface QuestionFormProps {
  subjects: Subject[];
  selectedSubject: Subject;
  editingQuestion?: Question | null;
  onQuestionCreated: () => void;
  onQuestionUpdated: () => void;
  onCancel: () => void;
}

const QuestionForm: React.FC<QuestionFormProps> = ({
  subjects,
  selectedSubject,
  editingQuestion,
  onQuestionCreated,
  onQuestionUpdated,
  onCancel
}) => {
  const [formData, setFormData] = useState({
    subjectId: selectedSubject.id,
    gradeId: 0,
    questionText: '',
    options: ['', '', '', ''],
    correctOptionIndex: 0,
    difficultyLevel: 200,
    competencies: [] as Array<{ id: number; code: string; name: string }>
  });
  const [grades, setGrades] = useState<Grade[]>([]);
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [gradesData, competenciesData] = await Promise.all([
          gradesAPI.getActive(),
          competenciesAPI.getActive()
        ]);
        setGrades(gradesData);
        setCompetencies(competenciesData);
      } catch (err) {
        console.error('Failed to fetch data:', err);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    console.log('QuestionForm useEffect - editingQuestion:', editingQuestion);
    if (editingQuestion) {
      console.log('Setting form data for editing:', {
        subjectId: editingQuestion.subjectId,
        gradeId: editingQuestion.gradeId,
        questionText: editingQuestion.questionText,
        options: editingQuestion.options,
        correctOptionIndex: editingQuestion.correctOptionIndex,
        difficultyLevel: editingQuestion.difficultyLevel
      });
      setFormData({
        subjectId: editingQuestion.subjectId,
        gradeId: editingQuestion.gradeId || 0,
        questionText: editingQuestion.questionText,
        options: [...editingQuestion.options],
        correctOptionIndex: editingQuestion.correctOptionIndex,
        difficultyLevel: editingQuestion.difficultyLevel,
        competencies: editingQuestion.competencies || []
      });
    } else {
      setFormData({
        subjectId: selectedSubject.id,
        gradeId: 0,
        questionText: '',
        options: ['', '', '', ''],
        correctOptionIndex: 0,
        difficultyLevel: 200,
        competencies: []
      });
    }
  }, [editingQuestion, selectedSubject]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validation
      if (!formData.questionText.trim()) {
        throw new Error('Question text is required');
      }

      if (formData.options.some(option => !option.trim())) {
        throw new Error('All options must be filled');
      }

      if (formData.difficultyLevel < 100 || formData.difficultyLevel > 350) {
        throw new Error('Difficulty level must be between 100 and 350');
      }

      if (editingQuestion) {
        await adminAPI.updateQuestion(editingQuestion.id, {
          subjectId: formData.subjectId,
          gradeId: formData.gradeId,
          questionText: formData.questionText.trim(),
          options: formData.options.map(opt => opt.trim()),
          correctOptionIndex: formData.correctOptionIndex,
          difficultyLevel: formData.difficultyLevel,
          competencies: formData.competencies.length > 0 ? formData.competencies.map(c => ({ id: c.id })) : undefined
        });
        onQuestionUpdated();
      } else {
        await adminAPI.createQuestion({
          subjectId: formData.subjectId,
          gradeId: formData.gradeId,
          questionText: formData.questionText.trim(),
          options: formData.options.map(opt => opt.trim()),
          correctOptionIndex: formData.correctOptionIndex,
          difficultyLevel: formData.difficultyLevel,
          competencies: formData.competencies.length > 0 ? formData.competencies.map(c => ({ id: c.id })) : undefined
        });
        onQuestionCreated();
      }
    } catch (error: any) {
      setError(error.response?.data?.error || error.message || 'Failed to save question');
    } finally {
      setLoading(false);
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData({ ...formData, options: newOptions });
  };

  const getDifficultyLabel = (level: number) => {
    if (level <= 150) return 'Easy';
    if (level <= 200) return 'Medium-Low';
    if (level <= 250) return 'Medium-High';
    return 'Hard';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          {editingQuestion ? 'Edit Question' : 'Add New Question'}
        </h3>
        <button
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 text-red-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Subject
          </label>
          <select
            value={formData.subjectId}
            onChange={(e) => setFormData({ ...formData, subjectId: Number(e.target.value) })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Grade *
          </label>
          <select
            value={formData.gradeId === 0 ? '' : formData.gradeId}
            onChange={(e) => setFormData({ ...formData, gradeId: Number(e.target.value) })}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select a grade</option>
            {grades.map((grade) => (
              <option key={grade.id} value={grade.id}>
                {grade.display_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Question Text
          </label>
          <textarea
            value={formData.questionText}
            onChange={(e) => setFormData({ ...formData, questionText: e.target.value })}
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter the question text..."
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Answer Options
          </label>
          <div className="space-y-3">
            {formData.options.map((option, index) => (
              <div key={index} className="flex items-center space-x-3">
                <input
                  type="radio"
                  name="correctOption"
                  checked={formData.correctOptionIndex === index}
                  onChange={() => setFormData({ ...formData, correctOptionIndex: index })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="text-sm font-medium text-gray-500 w-8">
                  {String.fromCharCode(65 + index)}.
                </span>
                <input
                  type="text"
                  value={option}
                  onChange={(e) => handleOptionChange(index, e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={`Option ${String.fromCharCode(65 + index)}`}
                  required
                />
              </div>
            ))}
          </div>
          <p className="mt-2 text-sm text-gray-600">
            Select the radio button for the correct answer
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Difficulty Level: {formData.difficultyLevel} ({getDifficultyLabel(formData.difficultyLevel)})
          </label>
          <input
            type="range"
            min="100"
            max="350"
            value={formData.difficultyLevel}
            onChange={(e) => setFormData({ ...formData, difficultyLevel: Number(e.target.value) })}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>100 (Easy)</span>
            <span>200 (Medium)</span>
            <span>350 (Hard)</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Competencies
          </label>
          <div className="space-y-3">
            {formData.competencies.map((comp, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">
                    {comp.code} - {comp.name}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newCompetencies = formData.competencies.filter((_, i) => i !== index);
                    setFormData({ ...formData, competencies: newCompetencies });
                  }}
                  className="p-1 text-red-600 hover:text-red-800 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            
            <div className="flex items-center space-x-3">
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    const competencyId = Number(e.target.value);
                    const competency = competencies.find(c => c.id === competencyId);
                    if (competency && !formData.competencies.find(c => c.id === competencyId)) {
                      const newCompetency = {
                        id: competency.id,
                        code: competency.code,
                        name: competency.name
                      };
                      setFormData({
                        ...formData,
                        competencies: [...formData.competencies, newCompetency]
                      });
                    }
                    e.target.value = '';
                  }
                }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Add a competency</option>
                {competencies
                  .filter(comp => !formData.competencies.find(c => c.id === comp.id))
                  .map((competency) => (
                    <option key={competency.id} value={competency.id}>
                      {competency.code} - {competency.name}
                    </option>
                  ))}
              </select>
              <button
                type="button"
                className="p-2 text-blue-600 hover:text-blue-800 transition-colors"
                title="Add competency"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
          <p className="mt-1 text-sm text-gray-600">
            Link this question to specific competencies (optional)
          </p>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span>{editingQuestion ? 'Update' : 'Create'} Question</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default QuestionForm;