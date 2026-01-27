import React, { useState } from 'react';
import { Subject } from '../types';
import { Edit, Trash2, Plus, BookOpen } from 'lucide-react';

interface SubjectListProps {
  subjects: Subject[];
  onEdit: (subject: Subject) => void;
  onDelete: (subjectId: number) => void;
  onAddNew: () => void;
  loading?: boolean;
}

const SubjectList: React.FC<SubjectListProps> = ({
  subjects,
  onEdit,
  onDelete,
  onAddNew,
  loading = false
}) => {
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleDelete = async (subjectId: number) => {
    if (window.confirm('Are you sure you want to delete this subject? This action cannot be undone.')) {
      setDeletingId(subjectId);
      try {
        await onDelete(subjectId);
      } finally {
        setDeletingId(null);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Subjects</h2>
        <button
          onClick={onAddNew}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md"
        >
          <Plus size={18} />
          <span>Add Subject</span>
        </button>
      </div>

      {subjects.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <BookOpen size={64} className="mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No subjects found</h3>
          <p className="text-sm text-gray-500 mb-6">Create your first subject to get started</p>
          <button
            onClick={onAddNew}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={18} />
            <span>Add Subject</span>
          </button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {subjects.map((subject) => (
            <div
              key={subject.id}
              className="group relative bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-300 overflow-hidden"
            >
              {/* Decorative gradient overlay on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50/0 to-blue-50/0 group-hover:from-blue-50/30 group-hover:to-transparent transition-all duration-300 pointer-events-none"></div>
              
              <div className="relative">
                {/* Header with actions */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0 pr-3">
                    <h4 className="text-lg font-bold text-gray-900 mb-2 truncate">
                      {subject.name}
                    </h4>
                    {subject.description && (
                      <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
                        {subject.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => onEdit(subject)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                      title="Edit subject"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(subject.id)}
                      disabled={deletingId === subject.id}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 disabled:opacity-50"
                      title="Delete subject"
                    >
                      {deletingId === subject.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                      ) : (
                        <Trash2 size={18} />
                      )}
                    </button>
                  </div>
                </div>
                
                {/* Footer with ID */}
                <div className="pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-500">ID:</span>
                    <span className="text-xs font-semibold text-gray-700">{subject.id}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SubjectList;
