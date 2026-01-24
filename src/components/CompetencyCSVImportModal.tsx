import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, AlertTriangle, X, Download, Layers } from 'lucide-react';
import { competenciesAPI } from '../services/api';

interface CSVRow {
  compCode: string;
  compName: string;
  description?: string;
  parentCompetency?: string;
}

interface ImportResult {
  success: Array<{
    row: number;
    competencyId: number;
    code: string;
    name: string;
    parentCode?: string;
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

interface CompetencyCSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

const CompetencyCSVImportModal: React.FC<CompetencyCSVImportModalProps> = ({ isOpen, onClose, onImportComplete }) => {
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
        
        // Check for required columns
        const requiredColumns = ['comp code', 'comp name'];
        const missingColumns = requiredColumns.filter(col => !header.includes(col));
        
        if (missingColumns.length > 0) {
          setError(`Missing required columns: ${missingColumns.join(', ')}`);
          return;
        }

        // Parse data rows
        const data: CSVRow[] = [];
        for (let i = 1; i < rows.length; i++) {
          const values = parseCSVLine(rows[i]);
          if (values.length >= 2) {
            const compCodeIndex = header.indexOf('comp code');
            const compNameIndex = header.indexOf('comp name');
            const descriptionIndex = header.indexOf('description');
            const parentCompetencyIndex = header.indexOf('parent competency');

            const compCode = values[compCodeIndex]?.trim() || '';
            const compName = values[compNameIndex]?.trim() || '';

            if (!compCode || !compName) {
              continue; // Skip empty rows
            }

            data.push({
              compCode,
              compName,
              description: descriptionIndex >= 0 ? (values[descriptionIndex]?.trim() || '') : '',
              parentCompetency: parentCompetencyIndex >= 0 ? (values[parentCompetencyIndex]?.trim() || '') : ''
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
      const result = await competenciesAPI.importFromCSV(csvData);
      setImportResults(result.results);
      setStep('results');
      onImportComplete();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to import competencies');
      setStep('preview');
    }
  };

  const downloadTemplate = () => {
    const template = `Comp Code,Comp Name,Description,Parent Competency
ENG1,English Language Fundamentals,Basic English language skills,
ENG1.1,Reading Comprehension,Understanding written text,ENG1
ENG1.1.a,Reading Fiction,Understanding fictional texts,ENG1.1
MATH1,Mathematics Fundamentals,Basic math skills,
MATH1.1,Algebra,Algebraic concepts,MATH1
LOG1,Logical Reasoning,Problem-solving skills,`;
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'competency_import_template.csv';
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
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Layers className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Import Competencies from CSV</h2>
              <p className="text-sm text-gray-600">
                {step === 'upload' && 'Upload a CSV file with competency information'}
                {step === 'preview' && `Preview ${csvData.length} competencies to be imported`}
                {step === 'importing' && 'Importing competencies...'}
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
                  Download the template to see the required format. Parent Competency can reference existing competencies or newly created ones in the same CSV.
                </p>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-2">
                  Upload CSV File
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  Required columns: <strong>Comp Code</strong>, <strong>Comp Name</strong><br />
                  Optional columns: <strong>Description</strong>, <strong>Parent Competency</strong> (competency code)
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
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
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
                <FileText className="h-5 w-5 text-blue-600" />
                <span className="font-medium">Preview Data ({csvData.length} competencies)</span>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Row</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comp Code</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comp Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parent Competency</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {csvData.map((row, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">{index + 1}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 font-medium">{row.compCode}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{row.compName}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{row.description || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{row.parentCompetency || '-'}</td>
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
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <Layers className="h-4 w-4" />
                  <span>Import {csvData.length} Competencies</span>
                </button>
              </div>
            </div>
          )}

          {/* Importing Step */}
          {step === 'importing' && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-lg font-medium text-gray-900">Importing Competencies...</p>
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
                    <Layers className="h-5 w-5 text-blue-600" />
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
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Row</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parent</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {importResults.success.map((item) => (
                          <tr key={item.row} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-900">{item.row}</td>
                            <td className="px-4 py-3 text-sm text-gray-900 font-medium">{item.code}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{item.name}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{item.parentCode || '-'}</td>
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
                              Data: {error.data.compCode} - {error.data.compName}
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
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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

export default CompetencyCSVImportModal;
