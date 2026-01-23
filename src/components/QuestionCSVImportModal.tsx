import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, AlertTriangle, X, Download, FileQuestion } from 'lucide-react';
import { adminAPI } from '../services/api';

interface CSVRow {
  subject: string;
  grade: string;
  questionText: string;
  questionType?: string; // Optional: MCQ, MultipleSelect, ShortAnswer, Essay, FillInBlank
  optionA?: string; // Optional: not needed for ShortAnswer/Essay/FillInBlank
  optionB?: string; // Optional: not needed for ShortAnswer/Essay/FillInBlank
  optionC?: string; // Optional: not needed for ShortAnswer/Essay/FillInBlank
  optionD?: string; // Optional: not needed for ShortAnswer/Essay/FillInBlank
  correctAnswer?: string; // For MCQ: single letter (A, B, C, D)
  correctAnswers?: string; // For MultipleSelect: comma-separated (A,B or A,B,C)
  blankOptions?: string; // For FillInBlank: semicolon-separated options for each blank (e.g., "opt1,opt2,opt3;opt1,opt2,opt3")
  blankCorrects?: string; // For FillInBlank: semicolon-separated correct answers (e.g., "A;B" or "0;1")
  difficultyLevel: string;
  dokLevel?: string; // Optional: 1-4 (more relevant for ShortAnswer/Essay/FillInBlank)
  description?: string; // Optional: additional instructions/description for ShortAnswer/Essay
  competencyCodes?: string;
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
  const [detectedQuestionType, setDetectedQuestionType] = useState<'MCQ' | 'MultipleSelect' | 'ShortAnswer' | 'Essay' | 'FillInBlank' | 'mixed' | null>(null);
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
        
        // Check for required columns (base requirements)
        const requiredColumns = ['subject', 'grade', 'questiontext', 'difficultylevel'];
        const missingColumns = requiredColumns.filter(col => !header.includes(col));
        
        if (missingColumns.length > 0) {
          setError(`Missing required columns: ${missingColumns.join(', ')}`);
          return;
        }

        // Check for question type indicators
        const hasQuestionType = header.includes('questiontype');
        const hasCorrectAnswer = header.includes('correctanswer');
        const hasCorrectAnswers = header.includes('correctanswers');
        const hasOptions = header.includes('optiona') && header.includes('optionb');
        
        // Check for FillInBlank indicators
        const hasBlankOptions = header.includes('blankoptions');
        const hasBlankCorrects = header.includes('blankcorrects');
        
        // Determine question type from CSV structure
        let detectedType: 'MCQ' | 'MultipleSelect' | 'ShortAnswer' | 'Essay' | 'FillInBlank' | 'mixed' | null = null;
        if (hasQuestionType) {
          // Check first few rows to determine type
          const sampleRows = rows.slice(1, Math.min(6, rows.length));
          const types = new Set<string>();
          for (const row of sampleRows) {
            const values = parseCSVLine(row);
            const questionTypeIndex = header.indexOf('questiontype');
            if (questionTypeIndex >= 0 && values[questionTypeIndex]) {
              const qType = values[questionTypeIndex].trim().toLowerCase();
              if (qType === 'multipleselect' || qType === 'multiple select') {
                types.add('MultipleSelect');
              } else if (qType === 'mcq' || qType === 'multiple choice') {
                types.add('MCQ');
              } else if (qType === 'shortanswer' || qType === 'short answer') {
                types.add('ShortAnswer');
              } else if (qType === 'essay') {
                types.add('Essay');
              } else if (qType === 'fillinblank' || qType === 'fill in blank' || qType === 'fill-in-blank') {
                types.add('FillInBlank');
              }
            }
          }
          if (types.size > 1) {
            detectedType = 'mixed';
          } else if (types.has('MultipleSelect')) {
            detectedType = 'MultipleSelect';
          } else if (types.has('ShortAnswer')) {
            detectedType = 'ShortAnswer';
          } else if (types.has('Essay')) {
            detectedType = 'Essay';
          } else if (types.has('FillInBlank')) {
            detectedType = 'FillInBlank';
          } else {
            detectedType = 'MCQ';
          }
        } else if (hasBlankOptions || hasBlankCorrects) {
          detectedType = 'FillInBlank';
        } else if (hasCorrectAnswers) {
          detectedType = 'MultipleSelect';
        } else if (hasCorrectAnswer && hasOptions) {
          detectedType = 'MCQ';
        } else if (!hasOptions && !hasCorrectAnswer && !hasCorrectAnswers) {
          // No options and no correct answers - likely ShortAnswer or Essay
          // Default to ShortAnswer, but user should specify questionType
          setError('For Short Answer or Essay questions, please include "questionType" column. Options and correct answers are not required.');
          return;
        } else {
          setError('CSV must have either "correctAnswer" (for MCQ), "correctAnswers" (for Multiple Select), "blankOptions/blankCorrects" (for Fill in the Blanks), or "questionType" (for Short Answer/Essay)');
          return;
        }
        
        setDetectedQuestionType(detectedType);

        // Parse data rows with proper CSV parsing
        const data: CSVRow[] = [];
        
        for (let i = 1; i < rows.length; i++) {
          const values = parseCSVLine(rows[i]);
          if (values.length >= 8) {
            const subjectIndex = header.indexOf('subject');
            const gradeIndex = header.indexOf('grade');
            const questionTextIndex = header.indexOf('questiontext');
            const questionTypeIndex = header.indexOf('questiontype');
            const optionAIndex = header.indexOf('optiona');
            const optionBIndex = header.indexOf('optionb');
            const optionCIndex = header.indexOf('optionc');
            const optionDIndex = header.indexOf('optiond');
            const correctAnswerIndex = header.indexOf('correctanswer');
            const correctAnswersIndex = header.indexOf('correctanswers');
            const blankOptionsIndex = header.indexOf('blankoptions');
            const blankCorrectsIndex = header.indexOf('blankcorrects');
            const difficultyLevelIndex = header.indexOf('difficultylevel');
            const dokLevelIndex = header.indexOf('doklevel');
            const competencyCodesIndex = header.indexOf('competencycodes');

            const rowData: CSVRow = {
              subject: values[subjectIndex] || '',
              grade: values[gradeIndex] || '',
              questionText: values[questionTextIndex] || '',
              difficultyLevel: values[difficultyLevelIndex] || ''
            };

            // Add optional fields
            if (questionTypeIndex >= 0) {
              rowData.questionType = values[questionTypeIndex] || '';
            }
            if (optionAIndex >= 0) {
              rowData.optionA = values[optionAIndex] || '';
            }
            if (optionBIndex >= 0) {
              rowData.optionB = values[optionBIndex] || '';
            }
            if (optionCIndex >= 0) {
              rowData.optionC = values[optionCIndex] || '';
            }
            if (optionDIndex >= 0) {
              rowData.optionD = values[optionDIndex] || '';
            }
            if (correctAnswerIndex >= 0) {
              rowData.correctAnswer = values[correctAnswerIndex] || '';
            }
            if (correctAnswersIndex >= 0) {
              rowData.correctAnswers = values[correctAnswersIndex] || '';
            }
            if (blankOptionsIndex >= 0) {
              rowData.blankOptions = values[blankOptionsIndex] || '';
            }
            if (blankCorrectsIndex >= 0) {
              rowData.blankCorrects = values[blankCorrectsIndex] || '';
            }
            const descriptionIndex = header.indexOf('description');
            if (descriptionIndex >= 0) {
              rowData.description = values[descriptionIndex] || '';
            }
            if (dokLevelIndex >= 0) {
              rowData.dokLevel = values[dokLevelIndex] || '';
            }
            if (competencyCodesIndex >= 0) {
              rowData.competencyCodes = values[competencyCodesIndex] || '';
            }

            data.push(rowData);
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

  const downloadTemplate = (type: 'MCQ' | 'MultipleSelect' | 'ShortAnswer' | 'Essay' | 'FillInBlank' = 'MCQ') => {
    let template = '';
    let filename = '';
    
    if (type === 'MCQ') {
      template = `subject,grade,questionText,questionType,optionA,optionB,optionC,optionD,correctAnswer,difficultyLevel,competencyCodes
Computer Science,Grade 1,What does CPU stand for?,MCQ,Central Processing Unit,Computer Personal Unit,Central Process Unit,Central Processor Unit,A,150,LOG001,TEC001
Computer Science,Grade 1,Which of the following is a volatile memory?,MCQ,ROM,HDD,RAM,SSD,C,220,TEC001,PRO001
Science,Grade 1,Mitochondria is ______ of the cell.,MCQ,Brain,Powerhouse,Nucleus,Factory,B,167,LOG001,PRO001`;
      filename = 'question_import_template_mcq.csv';
    } else if (type === 'MultipleSelect') {
      template = `subject,grade,questionText,questionType,optionA,optionB,optionC,optionD,correctAnswers,difficultyLevel,competencyCodes
Computer Science,Grade 1,Which of the following are storage devices? (Select all that apply),MultipleSelect,Hard Disk Drive,Solid State Drive,Random Access Memory,Read Only Memory,A,B,180,LOG001,TEC001
Science,Grade 1,Which of the following are renewable energy sources? (Select all that apply),MultipleSelect,Solar Energy,Wind Energy,Coal,Natural Gas,A,B,200,LOG001,PRO001
Mathematics,Grade 1,Which of the following are prime numbers? (Select all that apply),MultipleSelect,2,3,4,5,A,B,D,190,LOG001,PRO001`;
      filename = 'question_import_template_multiple_select.csv';
    } else if (type === 'ShortAnswer') {
      template = `subject,grade,questionText,questionType,difficultyLevel,dokLevel,description,competencyCodes
Science,Grade 1,Explain the process of photosynthesis in your own words.,ShortAnswer,200,3,Provide a brief explanation (100 words or less),LOG001,PRO001
Mathematics,Grade 1,Describe how you would solve the equation 2x + 5 = 15.,ShortAnswer,180,2,Show your step-by-step reasoning,LOG001,PRO001
Computer Science,Grade 1,What is the difference between RAM and ROM?,ShortAnswer,220,2,Explain in 2-3 sentences,LOG001,TEC001`;
      filename = 'question_import_template_short_answer.csv';
    } else if (type === 'Essay') {
      template = `subject,grade,questionText,questionType,difficultyLevel,dokLevel,description,competencyCodes
Science,Grade 1,Discuss the impact of climate change on ecosystems.,Essay,280,4,Provide a comprehensive analysis with examples and evidence,LOG001,PRO001
History,Grade 1,Analyze the causes and effects of World War II.,Essay,300,4,Include multiple perspectives and historical evidence,LOG001,PRO001
English,Grade 1,Write an essay on the theme of friendship in literature.,Essay,250,3,Use examples from at least two literary works,LOG001,PRO001`;
      filename = 'question_import_template_essay.csv';
    } else if (type === 'FillInBlank') {
      template = `subject,grade,questionText,questionType,blankOptions,blankCorrects,difficultyLevel,competencyCodes
Science,Grade 1,The capital of France is ___ and the capital of Germany is ___.,FillInBlank,"Paris,London,Berlin,Madrid;Berlin,Paris,London,Madrid","A;A",200,LOG001,PRO001
Mathematics,Grade 1,The sum of 5 and 3 is ___ and the product of 2 and 4 is ___.,FillInBlank,"8,9,10,11;8,9,10,11","A;A",180,LOG001,PRO001
Science,Grade 1,Water freezes at ___ degrees Celsius and boils at ___ degrees Celsius.,FillInBlank,"0,10,20,30;100,90,80,70","A;A",190,LOG001,PRO001`;
      filename = 'question_import_template_fill_in_blank.csv';
    }
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const resetModal = () => {
    setStep('upload');
    setCsvData([]);
    setImportResults(null);
    setError('');
    setDetectedQuestionType(null);
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
                  <p className="text-sm font-medium text-gray-700 mb-3">Download Template:</p>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <button
                      onClick={() => downloadTemplate('MCQ')}
                      className="inline-flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <Download className="h-4 w-4" />
                      <span>MCQ</span>
                    </button>
                    <button
                      onClick={() => downloadTemplate('MultipleSelect')}
                      className="inline-flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Download className="h-4 w-4" />
                      <span>Multiple Select</span>
                    </button>
                    <button
                      onClick={() => downloadTemplate('ShortAnswer')}
                      className="inline-flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      <Download className="h-4 w-4" />
                      <span>Short Answer</span>
                    </button>
                    <button
                      onClick={() => downloadTemplate('Essay')}
                      className="inline-flex items-center space-x-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
                    >
                      <Download className="h-4 w-4" />
                      <span>Essay</span>
                    </button>
                    <button
                      onClick={() => downloadTemplate('FillInBlank')}
                      className="inline-flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      <Download className="h-4 w-4" />
                      <span>Fill in Blanks</span>
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-6">
                  Download the appropriate template based on your question type
                </p>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-2">
                  Upload CSV File
                </p>
                <div className="text-sm text-gray-600 mb-4 space-y-2">
                  <p><strong>Required columns:</strong> subject, grade, questionText, difficultyLevel</p>
                  <p><strong>For MCQ:</strong> optionA, optionB, optionC, optionD, correctAnswer (single letter: A, B, C, or D)</p>
                  <p><strong>For Multiple Select:</strong> optionA, optionB, optionC, optionD, correctAnswers (comma-separated: A,B or A,B,C)</p>
                  <p><strong>For Short Answer/Essay:</strong> questionType (required), dokLevel (required, 1-4), description (optional)</p>
                  <p><strong>For Fill in the Blanks:</strong> questionType (required), blankOptions (semicolon-separated, comma-separated options per blank), blankCorrects (semicolon-separated: A;B or 0;1)</p>
                  <p><strong>Note:</strong> Growth Metric Score (difficultyLevel) is required for ALL question types. DOK Level is ONLY for Short Answer and Essay questions.</p>
                  <p><strong>Optional columns:</strong> questionType, description, competencyCodes (comma-separated)</p>
                  {detectedQuestionType && (
                    <p className="mt-2 text-blue-600 font-medium">
                      Detected question type: {detectedQuestionType === 'mixed' ? 'Mixed types detected' : detectedQuestionType}
                    </p>
                  )}
                </div>
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
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grade</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Question</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Correct/Description</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Difficulty</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DOK (Short/Essay Only)</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Competencies</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {csvData.map((row, index) => {
                      const questionType = row.questionType || 
                        (row.blankOptions ? 'FillInBlank' : 
                         row.correctAnswers ? 'MultipleSelect' : 'MCQ');
                      const correctAnswer = row.correctAnswer || row.correctAnswers || 
                        (row.blankCorrects ? row.blankCorrects : '-');
                      const isTextBased = questionType === 'ShortAnswer' || questionType === 'Essay';
                      const isFillInBlank = questionType === 'FillInBlank';
                      
                      const getTypeColor = (type: string) => {
                        if (type === 'MultipleSelect') return 'bg-blue-100 text-blue-800';
                        if (type === 'ShortAnswer') return 'bg-purple-100 text-purple-800';
                        if (type === 'Essay') return 'bg-orange-100 text-orange-800';
                        if (type === 'FillInBlank') return 'bg-indigo-100 text-indigo-800';
                        return 'bg-green-100 text-green-800'; // MCQ
                      };
                      
                      return (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-3 py-3 text-sm text-gray-900">{index + 1}</td>
                          <td className="px-3 py-3 text-sm text-gray-900">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getTypeColor(questionType)}`}>
                              {questionType}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-900">{row.subject}</td>
                          <td className="px-3 py-3 text-sm text-gray-900">{row.grade}</td>
                          <td className="px-3 py-3 text-sm text-gray-900 max-w-xs truncate" title={row.questionText}>
                            {row.questionText}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-900 font-medium">
                            {isTextBased ? (row.description || '-') : 
                             isFillInBlank ? (row.blankCorrects || '-') : 
                             correctAnswer}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-900">{row.difficultyLevel}</td>
                          <td className="px-3 py-3 text-sm text-gray-900">
                            {(questionType === 'ShortAnswer' || questionType === 'Essay') ? (row.dokLevel || '-') : '-'}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-900">
                            {row.competencyCodes || '-'}
                          </td>
                        </tr>
                      );
                    })}
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
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Correct/Description</th>
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
