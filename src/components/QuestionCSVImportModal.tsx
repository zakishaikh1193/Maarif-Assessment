import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, AlertTriangle, X, Download, FileQuestion, Image as ImageIcon, Package } from 'lucide-react';
import { adminAPI } from '../services/api';
import JSZip from 'jszip';

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
  leftItems?: string; // For Matching: comma-separated left column items
  rightItems?: string; // For Matching: comma-separated right column items
  correctPairs?: string; // For Matching: comma-separated pairs in format "leftIndex-rightIndex" (e.g., "0-0,1-1,2-2")
  difficultyLevel: string;
  dokLevel?: string; // Optional: 1-4 (more relevant for ShortAnswer/Essay/FillInBlank)
  standard?: string; // Optional: Standard identifier (e.g., NGSS, CGSA)
  contentFocus?: string; // Optional: Content Focus description - parameters for DOK level used in AI grading
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
  const [step, setStep] = useState<'upload' | 'uploadImages' | 'preview' | 'importing' | 'results'>('upload');
  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  const [importResults, setImportResults] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string>('');
  const [detectedQuestionType, setDetectedQuestionType] = useState<'MCQ' | 'MultipleSelect' | 'ShortAnswer' | 'Essay' | 'FillInBlank' | 'mixed' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  
  // Image upload state
  const [imageFiles, setImageFiles] = useState<Map<string, File>>(new Map());
  const [imageUploadStatus, setImageUploadStatus] = useState<{
    uploading: boolean;
    uploaded: number;
    total: number;
    errors: string[];
  }>({
    uploading: false,
    uploaded: 0,
    total: 0,
    errors: []
  });

  // Extract image filenames from CSV data
  const extractImageFilenames = (csvData: CSVRow[]): string[] => {
    const imageSet = new Set<string>();
    const placeholderRegex = /\{([a-zA-Z0-9._-]+\.(png|jpg|jpeg|gif|webp|svg))\}/gi;
    
    csvData.forEach(row => {
      let match;
      const text = row.questionText || '';
      while ((match = placeholderRegex.exec(text)) !== null) {
        imageSet.add(match[1]); // match[1] is the filename
      }
    });
    
    return Array.from(imageSet);
  };

  // Get base name without extension for flexible matching
  const getBaseName = (filename: string): string => {
    const lastDot = filename.lastIndexOf('.');
    return lastDot > 0 ? filename.substring(0, lastDot) : filename;
  };

  // Check if an image file matches a required filename (flexible extension matching)
  const imageMatches = (requiredFilename: string, uploadedFilename: string): boolean => {
    // Exact match
    if (requiredFilename === uploadedFilename) return true;
    
    // Match by base name (ignore extension)
    const requiredBase = getBaseName(requiredFilename);
    const uploadedBase = getBaseName(uploadedFilename);
    return requiredBase === uploadedBase;
  };

  // Find matching uploaded image for a required filename
  const findMatchingImage = (requiredFilename: string, imageFiles: Map<string, File>): string | null => {
    // Check exact match first
    if (imageFiles.has(requiredFilename)) {
      return requiredFilename;
    }
    
    // Check for base name match
    const requiredBase = getBaseName(requiredFilename);
    for (const uploadedFilename of imageFiles.keys()) {
      const uploadedBase = getBaseName(uploadedFilename);
      if (requiredBase === uploadedBase) {
        return uploadedFilename;
      }
    }
    
    return null;
  };

  // Handle ZIP file upload (images only, no CSV)
  const handleZipUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.zip')) {
      setError('Please select a ZIP file');
      return;
    }

    try {
      setError('');
      const zip = await JSZip.loadAsync(file);
      const images = new Map<string, File>();

      // Extract only image files from ZIP
      for (const [filename, zipEntry] of Object.entries(zip.files)) {
        // Skip directories
        if (zipEntry.dir) continue;

        // Only extract image files
        if (filename.match(/\.(png|jpg|jpeg|gif|webp|svg)$/i)) {
          const blob = await zipEntry.async('blob');
          const imageName = filename.split('/').pop() || filename;
          
          // Determine MIME type from file extension
          let mimeType = blob.type;
          
          if (!mimeType || mimeType === 'application/octet-stream') {
            const ext = imageName.toLowerCase().split('.').pop();
            const mimeTypes: { [key: string]: string } = {
              'png': 'image/png',
              'jpg': 'image/jpeg',
              'jpeg': 'image/jpeg',
              'gif': 'image/gif',
              'webp': 'image/webp',
              'svg': 'image/svg+xml'
            };
            mimeType = mimeTypes[ext || ''] || 'image/png';
          }
          
          const imageFile = new File([blob], imageName, { type: mimeType });
          // Store with just the filename (not path)
          images.set(imageName, imageFile);
        }
      }

      if (images.size === 0) {
        setError('No image files found in ZIP. Please ensure your ZIP contains image files (PNG, JPG, GIF, WebP, or SVG).');
        return;
      }

      // Add images to existing imageFiles map
      setImageFiles(prev => {
        const combined = new Map(prev);
        images.forEach((file, name) => {
          combined.set(name, file);
        });
        return combined;
      });
      
      setError('');
    } catch (err: any) {
      setError(`Error processing ZIP file: ${err.message || 'Invalid ZIP file'}`);
    }
  };

  // Handle multiple image files upload
  const handleImageFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const imageFiles = files.filter(file => 
      file.type.startsWith('image/') || 
      /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(file.name)
    );
    
    if (imageFiles.length === 0) {
      setError('Please select valid image files');
      return;
    }
    
    const imageMap = new Map<string, File>();
    imageFiles.forEach(file => {
      imageMap.set(file.name, file);
    });
    
    setImageFiles(prev => {
      const combined = new Map(prev);
      imageMap.forEach((file, name) => {
        combined.set(name, file);
      });
      return combined;
    });
    setError('');
  };

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
            const leftItemsIndex = header.indexOf('leftitems');
            const rightItemsIndex = header.indexOf('rightitems');
            const correctPairsIndex = header.indexOf('correctpairs');
            const difficultyLevelIndex = header.indexOf('difficultylevel');
            const dokLevelIndex = header.indexOf('doklevel');
            const standardIndex = header.indexOf('standard');
            const contentFocusIndex = header.indexOf('contentfocus');
            // Try both 'competencies' and 'competencycodes' for backward compatibility
            let competencyCodesIndex = header.indexOf('competencies');
            if (competencyCodesIndex < 0) {
              competencyCodesIndex = header.indexOf('competencycodes');
            }

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
            if (leftItemsIndex >= 0) {
              rowData.leftItems = values[leftItemsIndex] || '';
            }
            if (rightItemsIndex >= 0) {
              rowData.rightItems = values[rightItemsIndex] || '';
            }
            if (correctPairsIndex >= 0) {
              rowData.correctPairs = values[correctPairsIndex] || '';
            }
            const descriptionIndex = header.indexOf('description');
            if (descriptionIndex >= 0) {
              rowData.description = values[descriptionIndex] || '';
            }
            if (dokLevelIndex >= 0) {
              rowData.dokLevel = values[dokLevelIndex] || '';
            }
            if (standardIndex >= 0) {
              rowData.standard = values[standardIndex] || '';
            }
            if (contentFocusIndex >= 0) {
              rowData.contentFocus = values[contentFocusIndex] || '';
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
        
        // Check if images are needed
        const requiredImages = extractImageFilenames(data);
        if (requiredImages.length > 0) {
          // Images are needed, go to image upload step
          setStep('uploadImages');
        } else {
          // No images needed, go directly to preview
          setStep('preview');
        }
      } catch (err) {
        setError('Error parsing CSV file. Please check the file format.');
      }
    };
    reader.readAsText(file);
  };

  // Upload images before importing CSV
  const uploadImages = async (): Promise<Map<string, string>> => {
    const uploadedMap = new Map<string, string>(); // original filename (from CSV) -> uploaded filename
    
    // Get required images from CSV
    const requiredImages = extractImageFilenames(csvData);
    
    setImageUploadStatus({
      uploading: true,
      uploaded: 0,
      total: requiredImages.length,
      errors: []
    });

    const errors: string[] = [];

    // Upload images and map them to required filenames
    for (const requiredFilename of requiredImages) {
      // Find matching uploaded file
      const matchingUploadedFile = findMatchingImage(requiredFilename, imageFiles);
      
      if (!matchingUploadedFile) {
        const errorMsg = `No matching file found for ${requiredFilename}`;
        errors.push(errorMsg);
        setImageUploadStatus(prev => ({
          ...prev,
          errors: [...prev.errors, errorMsg]
        }));
        continue;
      }

      const file = imageFiles.get(matchingUploadedFile);
      if (!file) continue;

      try {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await adminAPI.uploadFile(formData);
        
        if (!response || !response.file || !response.file.filename) {
          throw new Error('Invalid response from server');
        }
        
        const uploadedFilename = response.file.filename;
        // Map required filename to uploaded filename
        uploadedMap.set(requiredFilename, uploadedFilename);
        
        setImageUploadStatus(prev => ({
          ...prev,
          uploaded: prev.uploaded + 1
        }));
      } catch (err: any) {
        const errorMsg = `Failed to upload ${matchingUploadedFile}: ${err.response?.data?.error || err.message || 'Unknown error'}`;
        errors.push(errorMsg);
        console.error(`Image upload error for ${matchingUploadedFile}:`, err);
        setImageUploadStatus(prev => ({
          ...prev,
          errors: [...prev.errors, errorMsg]
        }));
      }
    }

    setImageUploadStatus(prev => ({ ...prev, uploading: false }));
    return uploadedMap;
  };

  const handleImport = async () => {
    setStep('importing');
    setError('');

    try {
      // Step 1: Check if images are needed
      const requiredImages = extractImageFilenames(csvData);
      
      if (requiredImages.length > 0) {
        // Step 2: Check if all required images are available
        const missingImages = requiredImages.filter(img => !findMatchingImage(img, imageFiles));
        
        if (missingImages.length > 0) {
          setError(`Missing images: ${missingImages.join(', ')}. Please upload all required images before importing.`);
          setStep('preview');
          return;
        }

        // Step 3: Upload all images
        const uploadedImages = await uploadImages();
        
        // Check if we got any successful uploads
        if (uploadedImages.size === 0 && requiredImages.length > 0) {
          const errorDetails = imageUploadStatus.errors.length > 0 
            ? ` Errors: ${imageUploadStatus.errors.join('; ')}`
            : '';
          setError(`Failed to upload images. Please check your connection and try again.${errorDetails}`);
          setStep('preview');
          return;
        }
        
        // If some images failed but we have some successful, warn but continue
        if (uploadedImages.size < requiredImages.length) {
          const failedCount = requiredImages.length - uploadedImages.size;
          console.warn(`${failedCount} image(s) failed to upload, but proceeding with ${uploadedImages.size} successful upload(s)`);
          // Don't set error, just log - we'll proceed with what we have
        }

        // Step 4: Update CSV data with uploaded filenames
        const updatedCsvData = csvData.map(row => {
          let updatedText = row.questionText;
          const placeholderRegex = /\{([a-zA-Z0-9._-]+\.(png|jpg|jpeg|gif|webp|svg))\}/gi;
          
          updatedText = updatedText.replace(placeholderRegex, (match, originalFilename) => {
            // Try exact match first
            let uploadedFilename = uploadedImages.get(originalFilename);
            
            // If no exact match, try base name match
            if (!uploadedFilename) {
              const originalBase = getBaseName(originalFilename);
              for (const [uploaded, original] of uploadedImages.entries()) {
                if (getBaseName(original) === originalBase) {
                  uploadedFilename = uploaded;
                  break;
                }
              }
            }
            
            if (uploadedFilename) {
              return `{${uploadedFilename}}`;
            }
            return match; // Keep original if upload failed
          });
          
          return { ...row, questionText: updatedText };
        });

        // Step 5: Import with updated CSV data
        const result = await adminAPI.importQuestionsFromCSV(updatedCsvData);
        setImportResults(result.results);
      } else {
        // No images, proceed with normal import
        const result = await adminAPI.importQuestionsFromCSV(csvData);
        setImportResults(result.results);
      }
      
      setStep('results');
      onImportComplete();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to import questions');
      setStep('preview');
    }
  };

  const downloadTemplate = (type: 'MCQ' | 'MultipleSelect' | 'ShortAnswer' | 'Essay' | 'FillInBlank' | 'Matching' | 'TrueFalse' = 'MCQ') => {
    let template = '';
    let filename = '';
    
    if (type === 'MCQ') {
      template = `Subject,Grade,QuestionText,Description,questionType,optionA,optionB,optionC,optionD,correctAnswer,difficultyLevel,dokLevel,standard,contentFocus,Competencies
Computer Science,Grade 6,What does CPU stand for? {mcq1.png},Select the correct full form of CPU,MCQ,Central Processing Unit,Computer Personal Unit,Central Process Unit,Central Processor Unit,A,150,1,CGSA,"Understanding computer hardware components",LOG001, TEC001
Computer Science,Grade 6,Which of the following is a volatile memory? {mcq2.jpg},Identify the type of memory that loses data when power is off,MCQ,ROM,HDD,RAM,SSD,C,220,1,CGSA,"Memory types and their characteristics",TEC001, PRO001
Science,Grade 6,Mitochondria is ______ of the cell. {mcq3.png},Choose the correct function of mitochondria,MCQ,Brain,Powerhouse,Nucleus,Factory,B,167,2,NGSS,"Cell structure and function",LOG001, PRO001`;
      filename = 'question_import_template_mcq.csv';
    } else if (type === 'MultipleSelect') {
      template = `Subject,Grade,QuestionText,Description,questionType,optionA,optionB,optionC,optionD,correctAnswers,difficultyLevel,dokLevel,standard,contentFocus,Competencies
Maths,Grade 6,Which of the following are prime numbers? {multiselect1.png} (Select all that apply),Select all prime numbers from the given options,MultipleSelect,2,3,4,5,"[A,B]",295,2,CGSA,"Number properties and prime numbers",COMP1, COMP2
Science,Grade 6,Which of the following are renewable energy sources? {multiselect2.jpg} (Select all that apply),Identify all renewable energy sources from the list,MultipleSelect,Solar Energy,Wind Energy,Coal,Natural Gas,"[A,B]",280,2,NGSS,"Energy sources and sustainability",COMP1, COMP2`;
      filename = 'question_import_template_multiple_select.csv';
    } else if (type === 'ShortAnswer') {
      template = `Subject,Grade,QuestionText,Description,questionType,difficultyLevel,dokLevel,standard,contentFocus,Competencies
Science,Grade 6,Explain the process of photosynthesis in your own words. {shortanswer1.png},Provide a brief explanation (100 words or less),ShortAnswer,200,3,NGSS,"Biological processes and energy conversion",COMP1, COMP2
Maths,Grade 6,Describe how you would solve the equation 2x + 5 = 15. {shortanswer2.jpg},Show your step-by-step reasoning,ShortAnswer,180,2,CGSA,"Algebraic problem solving",COMP1, COMP2
Science,Grade 6,What is the difference between RAM and ROM? {shortanswer3.png},Explain in 2-3 sentences,ShortAnswer,220,2,NGSS,"Computer memory types",COMP1, COMP2
Science,Grade 6,What are the three states of matter? Give an example of each. {shortanswer4.png},Provide examples for each state,ShortAnswer,190,1,NGSS,"States of matter and examples",COMP1, COMP2`;
      filename = 'question_import_template_short_answer.csv';
    } else if (type === 'Essay') {
      template = `Subject,Grade,QuestionText,Description,questionType,difficultyLevel,dokLevel,standard,contentFocus,Competencies
Science,Grade 6,Discuss the impact of climate change on ecosystems. {essay1.png},Provide a comprehensive analysis with examples and evidence,Essay,280,4,NGSS,"Environmental science and ecosystem analysis",COMP1, COMP2
History,Grade 6,Analyze the causes and effects of World War II. {essay2.jpg},Include multiple perspectives and historical evidence,Essay,300,4,CGSA,"Historical analysis and critical thinking",COMP1, COMP2
English,Grade 6,Write an essay on the theme of friendship in literature. {essay3.png},Use examples from at least two literary works,Essay,250,3,CGSA,"Literary analysis and theme exploration",COMP1, COMP2
Science,Grade 6,Evaluate the pros and cons of renewable energy sources. {essay4.png},Consider economic, environmental, and social factors,Essay,270,4,NGSS,"Energy systems and evaluation",COMP1, COMP2`;
      filename = 'question_import_template_essay.csv';
    } else if (type === 'FillInBlank') {
      template = `Subject,Grade,QuestionText,Description,questionType,blankOptions,blankCorrects,difficultyLevel,dokLevel,standard,contentFocus,Competencies
Science,Grade 6,The capital of France is ___ and the capital of Germany is ___. {fillinblank1.png},Fill in the correct capitals for each country,FillInBlank,"Paris,London;Berlin,Munich","A;A",200,1,NGSS,"Geographic knowledge and capitals",COMP1, COMP2
Maths,Grade 6,The sum of 5 and 3 is ___ and the product of 2 and 4 is ___. {fillinblank2.jpg},Calculate and fill in the correct answers,FillInBlank,"8,9;8,9","A;A",180,1,CGSA,"Basic arithmetic operations",COMP1, COMP2
Science,Grade 6,Water freezes at ___ degrees Celsius and boils at ___ degrees Celsius. {fillinblank3.png},Fill in the correct temperature values,FillInBlank,"0,10;100,90","A;A",190,1,NGSS,"Physical properties of water",COMP1, COMP2`;
      filename = 'question_import_template_fill_in_blank.csv';
    } else if (type === 'Matching') {
      template = `Subject,Grade,QuestionText,Description,questionType,leftItems,rightItems,correctPairs,difficultyLevel,dokLevel,standard,contentFocus,Competencies
Maths,Grade 6,Match the mathematical operations with their symbols. {matching2.jpg},Match each operation with its correct symbol,Matching,"Addition,Subtraction,Multiplication,Division","×,+,÷,-","0-1,1-3,2-0,3-2",180,2,CGSA,"Mathematical operations and symbols",COMP1, COMP2
English,Grade 6,Match the words with their synonyms. {matching3.png},Match each word with its correct synonym,Matching,"Happy,Big,Smart,Small","Tiny,Large,Intelligent,Joyful","0-3,1-1,2-2,3-0",190,2,CGSA,"Vocabulary and word relationships",COMP1, COMP2`;
      filename = 'question_import_template_matching.csv';
    } else if (type === 'TrueFalse') {
      template = `Subject,Grade,QuestionText,Description,questionType,correctAnswer,difficultyLevel,dokLevel,standard,contentFocus,Competencies
Science,Grade 6,The Earth revolves around the Sun. {truefalse1.png},Determine if the statement is true or false,TrueFalse,true,200,1,NGSS,"Solar system and planetary motion",COMP1, COMP2
Maths,Grade 6,2 + 2 equals 5. {truefalse2.jpg},Determine if the statement is true or false,TrueFalse,false,180,1,CGSA,"Basic arithmetic facts",COMP1, COMP2
Science,Grade 6,Water boils at 100 degrees Celsius at sea level. {truefalse3.png},Determine if the statement is true or false,TrueFalse,true,190,1,NGSS,"Physical properties and temperature",COMP1, COMP2`;
      filename = 'question_import_template_true_false.csv';
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
    setImageFiles(new Map());
    setImageUploadStatus({
      uploading: false,
      uploaded: 0,
      total: 0,
      errors: []
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (zipInputRef.current) {
      zipInputRef.current.value = '';
    }
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
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
                {step === 'uploadImages' && 'Upload images referenced in your CSV file'}
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

          {/* CSV Upload Step */}
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
                    <button
                      onClick={() => downloadTemplate('Matching')}
                      className="inline-flex items-center space-x-2 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors"
                    >
                      <Download className="h-4 w-4" />
                      <span>Matching</span>
                    </button>
                    <button
                      onClick={() => downloadTemplate('TrueFalse')}
                      className="inline-flex items-center space-x-2 bg-cyan-600 text-white px-4 py-2 rounded-lg hover:bg-cyan-700 transition-colors"
                    >
                      <Download className="h-4 w-4" />
                      <span>True/False</span>
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-6">
                  Download the appropriate template based on your question type
                </p>
              </div>

              {/* CSV Upload Section */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-6">
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-2">
                  Upload CSV File
                </p>
                <div className="text-sm text-gray-600 mb-4 space-y-2">
                  <p><strong>Required columns:</strong> Subject, Grade, QuestionText, questionType, difficultyLevel</p>
                  <p><strong>For MCQ:</strong> optionA, optionB, optionC, optionD, correctAnswer (single letter: A, B, C, or D)</p>
                  <p><strong>For Multiple Select:</strong> optionA, optionB, optionC, optionD, correctAnswers (JSON array format: "[A,C]" or "[A,B,C]")</p>
                  <p><strong>For Short Answer/Essay:</strong> dokLevel (required, 1-4), description (optional)</p>
                  <p><strong>For Fill in the Blanks:</strong> blankOptions (semicolon-separated, comma-separated options per blank), blankCorrects (semicolon-separated: A;B or 0;1)</p>
                  <p><strong>Standard:</strong> Optional field. Use NGSS for Science, CGSA for English and Maths.</p>
                  <p><strong>Content Focus:</strong> Optional field. Description of content focus - parameters for DOK level used in AI grading.</p>
                  <p><strong>Note:</strong> Growth Metric Score (difficultyLevel) is required for ALL question types. DOK Level is required for Short Answer and Essay questions, and optional (but recommended) for other question types.</p>
                  <p><strong>Optional columns:</strong> Description (for all question types), Competencies (comma-separated: "COMP1, COMP2")</p>
                  <p><strong>Image placeholders:</strong> Use <code>{'{filename.png}'}</code> in QuestionText to include images. Example: <code>{'Question text {image1.png} more text'}</code>. Images will be converted to <code>&lt;img&gt;</code> tags pointing to <code>/api/uploads/images/filename.png</code></p>
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
                  Choose CSV File
                </button>
              </div>

              {/* Image Upload Section */}
            </div>
          )}

          {/* Image Upload Step */}
          {step === 'uploadImages' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <ImageIcon className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Upload Question Images
                </h3>
                <p className="text-sm text-gray-600">
                  Your CSV file references {extractImageFilenames(csvData).length} image(s). 
                  Please upload all required images before proceeding.
                </p>
              </div>

              {/* Required Images List */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm font-medium text-yellow-800 mb-2">
                  Required Images ({extractImageFilenames(csvData).length}):
                </p>
                <div className="flex flex-wrap gap-2">
                  {extractImageFilenames(csvData).map((filename, idx) => {
                    const isUploaded = !!findMatchingImage(filename, imageFiles);
                    return (
                      <span
                        key={idx}
                        className={`inline-flex items-center px-3 py-1 rounded text-sm ${
                          isUploaded
                            ? 'bg-green-100 text-green-800 border border-green-300'
                            : 'bg-red-100 text-red-800 border border-red-300'
                        }`}
                      >
                        {isUploaded && <CheckCircle className="h-4 w-4 mr-1" />}
                        {!isUploaded && <AlertTriangle className="h-4 w-4 mr-1" />}
                        {filename}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Image Upload Options */}
              <div className="border-2 border-dashed border-blue-300 rounded-lg p-6 bg-blue-50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* ZIP Upload Option */}
                  <div className="border border-blue-200 rounded-lg p-4 bg-white">
                    <div className="flex items-center mb-2">
                      <Package className="h-5 w-5 text-blue-600 mr-2" />
                      <p className="font-medium text-gray-900">ZIP File</p>
                    </div>
                    <p className="text-xs text-gray-600 mb-3">
                      Upload a ZIP file containing image files only
                    </p>
                    <input
                      ref={zipInputRef}
                      type="file"
                      accept=".zip"
                      onChange={handleZipUpload}
                      className="hidden"
                    />
                    <button
                      onClick={() => zipInputRef.current?.click()}
                      className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      Upload ZIP File
                    </button>
                  </div>

                  {/* Multiple Images Upload Option */}
                  <div className="border border-green-200 rounded-lg p-4 bg-white">
                    <div className="flex items-center mb-2">
                      <ImageIcon className="h-5 w-5 text-green-600 mr-2" />
                      <p className="font-medium text-gray-900">Image Files</p>
                    </div>
                    <p className="text-xs text-gray-600 mb-3">
                      Select single or multiple image files
                    </p>
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageFiles}
                      className="hidden"
                    />
                    <button
                      onClick={() => imageInputRef.current?.click()}
                      className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
                    >
                      Select Images
                    </button>
                  </div>
                </div>

                {/* Show selected images */}
                {imageFiles.size > 0 && (
                  <div className="mt-4 p-3 bg-white rounded-lg border border-gray-200">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Uploaded Images ({imageFiles.size}):
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {Array.from(imageFiles.keys()).map((filename, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center px-2 py-1 rounded bg-green-100 text-green-800 text-xs"
                        >
                          {filename}
                          <button
                            onClick={() => {
                              const newMap = new Map(imageFiles);
                              newMap.delete(filename);
                              setImageFiles(newMap);
                            }}
                            className="ml-2 text-green-600 hover:text-green-800"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Navigation Buttons */}
              <div className="flex justify-between space-x-3">
                <button
                  onClick={() => {
                    setStep('upload');
                    setImageFiles(new Map());
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Back to CSV Upload
                </button>
                <button
                  onClick={() => {
                    const requiredImages = extractImageFilenames(csvData);
                    const missingImages = requiredImages.filter(img => !findMatchingImage(img, imageFiles));
                    
                    if (missingImages.length > 0) {
                      setError(`Please upload all required images. Missing: ${missingImages.join(', ')}`);
                    } else {
                      setError('');
                      setStep('preview');
                    }
                  }}
                  disabled={extractImageFilenames(csvData).some(img => !findMatchingImage(img, imageFiles))}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Continue to Preview
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
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Correct Answer</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Difficulty</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DOK Level</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Standard</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Content Focus</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Competencies</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {csvData.map((row, index) => {
                      const questionType = row.questionType || 
                        (row.blankOptions ? 'FillInBlank' : 
                         row.leftItems || row.rightItems ? 'Matching' :
                         row.correctAnswers ? 'MultipleSelect' : 
                         (row.correctAnswer && (row.correctAnswer.toLowerCase() === 'true' || row.correctAnswer.toLowerCase() === 'false')) ? 'TrueFalse' :
                         'MCQ');
                      const isTextBased = questionType === 'ShortAnswer' || questionType === 'Essay';
                      const isFillInBlank = questionType === 'FillInBlank';
                      const isMatching = questionType === 'Matching';
                      const isTrueFalse = questionType === 'TrueFalse';
                      
                      // Parse correctAnswers if it's in JSON array format
                      let correctAnswerDisplay = '-';
                      if (isTextBased) {
                        correctAnswerDisplay = 'AI Graded';
                      } else if (isFillInBlank) {
                        correctAnswerDisplay = row.blankCorrects || '-';
                      } else if (isMatching) {
                        correctAnswerDisplay = row.correctPairs || '-';
                      } else if (isTrueFalse) {
                        correctAnswerDisplay = row.correctAnswer || '-';
                      } else if (row.correctAnswers) {
                        // Try to parse as JSON array first
                        try {
                          const parsed = JSON.parse(row.correctAnswers);
                          if (Array.isArray(parsed)) {
                            correctAnswerDisplay = parsed.join(', ');
                          } else {
                            correctAnswerDisplay = row.correctAnswers;
                          }
                        } catch {
                          // If not JSON, treat as comma-separated string
                          correctAnswerDisplay = row.correctAnswers;
                        }
                      } else if (row.correctAnswer) {
                        correctAnswerDisplay = row.correctAnswer;
                      }
                      
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
                          <td className="px-3 py-3 text-sm text-gray-900">
                            {row.description || '-'}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-900 font-medium">
                            {correctAnswerDisplay}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-900">{row.difficultyLevel}</td>
                          <td className="px-3 py-3 text-sm text-gray-900">
                            {row.dokLevel || '-'}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-900">
                            {row.standard || '-'}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-900 max-w-xs truncate" title={row.contentFocus || ''}>
                            {row.contentFocus || '-'}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-900">
                            {row.competencyCodes && row.competencyCodes.trim() ? row.competencyCodes.trim() : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Show image status if CSV has image placeholders */}
              {extractImageFilenames(csvData).length > 0 && (
                <div className={`mb-4 p-4 rounded-lg border ${
                  extractImageFilenames(csvData).every(img => findMatchingImage(img, imageFiles))
                    ? 'bg-green-50 border-green-200'
                    : 'bg-yellow-50 border-yellow-200'
                }`}>
                  <div className="flex items-start space-x-2">
                    {extractImageFilenames(csvData).every(img => findMatchingImage(img, imageFiles)) ? (
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    )}
                    <div>
                      <p className={`text-sm font-medium mb-1 ${
                        extractImageFilenames(csvData).every(img => findMatchingImage(img, imageFiles))
                          ? 'text-green-800'
                          : 'text-yellow-800'
                      }`}>
                        {extractImageFilenames(csvData).every(img => findMatchingImage(img, imageFiles))
                          ? 'All Images Uploaded'
                          : 'Images Status'
                        }
                      </p>
                      <p className={`text-xs ${
                        extractImageFilenames(csvData).every(img => findMatchingImage(img, imageFiles))
                          ? 'text-green-700'
                          : 'text-yellow-700'
                      }`}>
                        Your CSV references {extractImageFilenames(csvData).length} image(s): {extractImageFilenames(csvData).join(', ')}
                      </p>
                      {extractImageFilenames(csvData).some(img => !findMatchingImage(img, imageFiles)) && (
                        <p className="text-xs text-red-600 mt-1">
                          Missing: {extractImageFilenames(csvData).filter(img => !findMatchingImage(img, imageFiles)).join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3">
                {extractImageFilenames(csvData).length > 0 && (
                  <button
                    onClick={() => setStep('uploadImages')}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Back to Images
                  </button>
                )}
                <button
                  onClick={() => setStep('upload')}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Back to CSV
                </button>
                <button
                  onClick={handleImport}
                  disabled={extractImageFilenames(csvData).length > 0 && extractImageFilenames(csvData).some(img => !findMatchingImage(img, imageFiles))}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
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
              <p className="text-lg font-medium text-gray-900">
                {imageUploadStatus.uploading ? 'Uploading Images...' : 'Importing Questions...'}
              </p>
              <p className="text-sm text-gray-600">Please wait while we process your data</p>
              
              {/* Image Upload Progress */}
              {imageUploadStatus.uploading && imageUploadStatus.total > 0 && (
                <div className="mt-6 max-w-md mx-auto">
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Uploading images...</span>
                    <span>{imageUploadStatus.uploaded} / {imageUploadStatus.total}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(imageUploadStatus.uploaded / imageUploadStatus.total) * 100}%` }}
                    />
                  </div>
                  {imageUploadStatus.errors.length > 0 && (
                    <div className="mt-4 text-left">
                      <p className="text-sm font-medium text-red-600 mb-2">Upload Errors:</p>
                      <ul className="list-disc list-inside text-xs text-red-600 space-y-1">
                        {imageUploadStatus.errors.map((err, idx) => (
                          <li key={idx}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
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
