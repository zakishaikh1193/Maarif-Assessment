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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Subjects</h3>
        <button
          onClick={onAddNew}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          Add Subject
        </button>
      </div>

      {subjects.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <BookOpen size={48} className="mx-auto mb-4 text-gray-300" />
          <p>No subjects found</p>
          <p className="text-sm">Create your first subject to get started</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {subjects.map((subject) => (
            <div
              key={subject.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-1">{subject.name}</h4>
                  {subject.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {subject.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <button
                    onClick={() => onEdit(subject)}
                    className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                    title="Edit subject"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(subject.id)}
                    disabled={deletingId === subject.id}
                    className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                    title="Delete subject"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              
              <div className="text-xs text-gray-500">
                ID: {subject.id}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SubjectList;
