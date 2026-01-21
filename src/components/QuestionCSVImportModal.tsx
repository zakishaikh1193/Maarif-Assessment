import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, AlertTriangle, X, Download, FileQuestion, Eye, EyeOff } from 'lucide-react';
import { adminAPI } from '../services/api';

interface CSVRow {
  subject: string;
  grade: string;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  difficultyLevel: string;
  competencyCodes: string;
}

interface ImportResult {
  success: Array<{
    row: number;
    questionId: number;
    questionText: string;
    subjectName: string;
    gradeName: string;
    correctAnswer: string;
    difficultyLevel: number;
    competencyCount: number;
    foundCompetencies: string[];
    notFoundCompetencies: string[];
  }>;
  errors: Array<{
    row: number;
    error: string;
    data: CSVRow;
  }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

interface QuestionCSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

const QuestionCSVImportModal: React.FC<QuestionCSVImportModalProps> = ({ isOpen, onClose, onImportComplete }) => {
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'results'>('upload');
  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  const [importResults, setImportResults] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      setError('Please select a valid CSV file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csvText = e.target?.result as string;
        const rows = csvText.split('\n').filter(row => row.trim());
        
        if (rows.length < 2) {
          setError('CSV file must have at least a header row and one data row');
          return;
        }

        // Function to parse CSV line with proper quote handling
        const parseCSVLine = (line: string): string[] => {
          const result: string[] = [];
          let current = '';
          let inQuotes = false;
          
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
              if (inQuotes && line[i + 1] === '"') {
                // Escaped quote
                current += '"';
                i++; // Skip next quote
              } else {
                // Toggle quote state
                inQuotes = !inQuotes;
              }
            } else if (char === ',' && !inQuotes) {
              // End of field
              result.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          
          // Add the last field
          result.push(current.trim());
          return result;
        };
        
        const header = parseCSVLine(rows[0]).map(h => h.trim().toLowerCase());
        const requiredColumns = ['subject', 'grade', 'questiontext', 'optiona', 'optionb', 'optionc', 'optiond', 'correctanswer', 'difficultylevel'];
        const missingColumns = requiredColumns.filter(col => !header.includes(col));
        
        if (missingColumns.length > 0) {
          setError(`Missing required columns: ${missingColumns.join(', ')}`);
          return;
        }

        // Parse data rows with proper CSV parsing
        const data: CSVRow[] = [];
        
        for (let i = 1; i < rows.length; i++) {
          const values = parseCSVLine(rows[i]);
          if (values.length >= 9) {
            const subjectIndex = header.indexOf('subject');
            const gradeIndex = header.indexOf('grade');
            const questionTextIndex = header.indexOf('questiontext');
            const optionAIndex = header.indexOf('optiona');
            const optionBIndex = header.indexOf('optionb');
            const optionCIndex = header.indexOf('optionc');
            const optionDIndex = header.indexOf('optiond');
            const correctAnswerIndex = header.indexOf('correctanswer');
            const difficultyLevelIndex = header.indexOf('difficultylevel');
            const competencyCodesIndex = header.indexOf('competencycodes');

            data.push({
              subject: values[subjectIndex] || '',
              grade: values[gradeIndex] || '',
              questionText: values[questionTextIndex] || '',
              optionA: values[optionAIndex] || '',
              optionB: values[optionBIndex] || '',
              optionC: values[optionCIndex] || '',
              optionD: values[optionDIndex] || '',
              correctAnswer: values[correctAnswerIndex] || '',
              difficultyLevel: values[difficultyLevelIndex] || '',
              competencyCodes: competencyCodesIndex >= 0 ? values[competencyCodesIndex] || '' : ''
            });
          }
        }

        if (data.length === 0) {
          setError('No valid data rows found in CSV file');
          return;
        }

        setCsvData(data);
        setError('');
        setStep('preview');
      } catch (err) {
        setError('Error parsing CSV file. Please check the file format.');
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    setStep('importing');
    setError('');

    try {
      const result = await adminAPI.importQuestionsFromCSV(csvData);
      setImportResults(result.results);
      setStep('results');
      onImportComplete();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to import questions');
      setStep('preview');
    }
  };

  const downloadTemplate = () => {
    const template = `subject,grade,questionText,optionA,optionB,optionC,optionD,correctAnswer,difficultyLevel,competencyCodes
Computer Science,Grade 1,What does CPU stand for?,Central Processing Unit,Computer Personal Unit,Central Process Unit,Central Processor Unit,A,150,LOG001,TEC001
Computer Science,Grade 1,Which of the following is a volatile memory?,ROM,HDD,RAM,SSD,C,220,TEC001,PRO001
Science,Grade 1,Mitochondria is ______ of the cell.,Brain,Powerhouse,Nucleus,Factory,B,167,LOG001,PRO001`;
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'question_import_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const resetModal = () => {
    setStep('upload');
    setCsvData([]);
    setImportResults(null);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <FileQuestion className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Import Questions from CSV</h2>
              <p className="text-sm text-gray-600">
                {step === 'upload' && 'Upload a CSV file with question information'}
                {step === 'preview' && `Preview ${csvData.length} questions to be imported`}
                {step === 'importing' && 'Importing questions...'}
                {step === 'results' && 'Import completed'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <span className="text-red-800">{error}</span>
              </div>
            </div>
          )}

          {/* Upload Step */}
          {step === 'upload' && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="mb-4">
                  <button
                    onClick={downloadTemplate}
                    className="inline-flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download Template</span>
                  </button>
                </div>
                <p className="text-sm text-gray-600 mb-6">
                  Download the template to see the required format
                </p>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-2">
                  Upload CSV File
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  Required columns: subject, grade, questionText, optionA, optionB, optionC, optionD, correctAnswer, difficultyLevel<br />
                  Optional columns: competencyCodes (comma-separated)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Choose File
                </button>
              </div>
            </div>
          )}

          {/* Preview Step */}
          {step === 'preview' && (
            <div className="space-y-6">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-purple-600" />
                <span className="font-medium">Preview Data ({csvData.length} questions)</span>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Row</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grade</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Question</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Correct</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Difficulty</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Competencies</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {csvData.map((row, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-3 py-3 text-sm text-gray-900">{index + 1}</td>
                        <td className="px-3 py-3 text-sm text-gray-900">{row.subject}</td>
                        <td className="px-3 py-3 text-sm text-gray-900">{row.grade}</td>
                        <td className="px-3 py-3 text-sm text-gray-900 max-w-xs truncate" title={row.questionText}>
                          {row.questionText}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-900 font-medium">{row.correctAnswer}</td>
                        <td className="px-3 py-3 text-sm text-gray-900">{row.difficultyLevel}</td>
                        <td className="px-3 py-3 text-sm text-gray-900">
                          {row.competencyCodes || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setStep('upload')}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleImport}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
                >
                  <FileQuestion className="h-4 w-4" />
                  <span>Import {csvData.length} Questions</span>
                </button>
              </div>
            </div>
          )}

          {/* Importing Step */}
          {step === 'importing' && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-lg font-medium text-gray-900">Importing Questions...</p>
              <p className="text-sm text-gray-600">Please wait while we process your data</p>
            </div>
          )}

          {/* Results Step */}
          {step === 'results' && importResults && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center space-x-2">
                    <FileQuestion className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium text-blue-700">Total</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-900 mt-1">
                    {importResults.summary.total}
                  </div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium text-green-700">Successful</span>
                  </div>
                  <div className="text-2xl font-bold text-green-900 mt-1">
                    {importResults.summary.successful}
                  </div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <span className="text-sm font-medium text-red-700">Failed</span>
                  </div>
                  <div className="text-2xl font-bold text-red-900 mt-1">
                    {importResults.summary.failed}
                  </div>
                </div>
              </div>

              {/* Success Results */}
              {importResults.success.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span>Successfully Imported ({importResults.success.length})</span>
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Row</th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Question</th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grade</th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Correct</th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Difficulty</th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Competencies</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {importResults.success.map((item) => (
                          <tr key={item.row} className="hover:bg-gray-50">
                            <td className="px-3 py-3 text-sm text-gray-900">{item.row}</td>
                            <td className="px-3 py-3 text-sm text-gray-900 max-w-xs truncate" title={item.questionText}>
                              {item.questionText}
                            </td>
                            <td className="px-3 py-3 text-sm text-gray-900">{item.subjectName}</td>
                            <td className="px-3 py-3 text-sm text-gray-900">{item.gradeName}</td>
                            <td className="px-3 py-3 text-sm text-gray-900 font-medium">{item.correctAnswer}</td>
                            <td className="px-3 py-3 text-sm text-gray-900">{item.difficultyLevel}</td>
                            <td className="px-3 py-3 text-sm text-gray-900">
                              <div>
                                <div className="font-medium">{item.competencyCount} linked</div>
                                {item.foundCompetencies.length > 0 && (
                                  <div className="text-xs text-green-600">
                                    Found: {item.foundCompetencies.join(', ')}
                                  </div>
                                )}
                                {item.notFoundCompetencies.length > 0 && (
                                  <div className="text-xs text-red-600">
                                    Not found: {item.notFoundCompetencies.join(', ')}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Error Results */}
              {importResults.errors.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <span>Errors ({importResults.errors.length})</span>
                  </h3>
                  <div className="space-y-3">
                    {importResults.errors.map((error, index) => (
                      <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                          <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-red-800">
                              Row {error.row}: {error.error}
                            </div>
                            <div className="text-sm text-red-700 mt-1">
                              Question: {error.data.questionText}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleClose}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuestionCSVImportModal;
