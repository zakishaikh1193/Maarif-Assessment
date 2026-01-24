import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { GrowthOverTimeData } from '../types';
import maarifLogo from '../images/Marrif_V 1.1.png';

interface ExportFilters {
  schoolName?: string | null;
  gradeName?: string | null;
  studentName?: string | null;
  subjectName?: string | null;
}

// Helper to load logo image as base64
const loadLogoAsBase64 = async (): Promise<string | null> => {
  try {
    // Method 1: Try the imported logo path (Vite handles this)
    try {
      // In Vite, imported images are URLs, so we can fetch them directly
      const logoUrl = maarifLogo;
      const response = await fetch(logoUrl);
      if (response.ok) {
        const blob = await response.blob();
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            if (result && result.startsWith('data:')) {
              resolve(result);
            } else {
              resolve(null);
            }
          };
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(blob);
        });
      }
    } catch (e) {
      console.warn('Failed to load logo via import path:', e);
    }
    
    // Method 2: Try direct paths (for development/production)
    const fallbackPaths = [
      '/src/images/Marrif_V 1.1.png',
      '/images/Marrif_V 1.1.png',
      './src/images/Marrif_V 1.1.png',
      './images/Marrif_V 1.1.png',
      '/Marrif_V 1.1.png'
    ];
    
    for (const path of fallbackPaths) {
      try {
        const response = await fetch(path);
        if (response.ok) {
          const blob = await response.blob();
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const result = reader.result as string;
              if (result && result.startsWith('data:')) {
                resolve(result);
              } else {
                resolve(null);
              }
            };
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
          });
        }
      } catch (e) {
        continue;
      }
    }
    
    console.warn('Logo not found after trying all paths, continuing without logo');
    return null;
  } catch (error) {
    console.error('Error loading logo:', error);
    return null;
  }
};

interface PerformanceData {
  subjectPerformance?: Array<{
    subject_id: number;
    subject_name: string;
    average_rit_score: number;
    student_count: number;
    min_score: number;
    max_score: number;
    standard_deviation: number;
  }>;
  growthRates?: Array<{
    subject_id: number;
    subject_name: string;
    boy_avg: number;
    eoy_avg: number;
  }>;
  yearTrends?: Array<{
    year: number;
    subject_id: number;
    subject_name: string;
    average_rit_score: number;
  }>;
}

// Export Complete Performance Report to PDF (includes all sections)
export const exportCompletePerformanceReportToPDF = async (
  growthData: GrowthOverTimeData,
  performanceData: PerformanceData,
  filters: ExportFilters,
  chartElementId: string = 'growth-chart-container'
) => {
  const pdf = new jsPDF('landscape', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  let yPosition = margin;

  // Helper to check page break
  const checkPageBreak = (requiredHeight: number) => {
    if (yPosition + requiredHeight > pageHeight - margin) {
      pdf.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };

  // Header with colored background and logo
  pdf.setFillColor(59, 130, 246); // Blue
  pdf.rect(0, 0, pageWidth, 40, 'F');
  
  // Load and add logo in header
  const logoBase64 = await loadLogoAsBase64();
  if (logoBase64) {
    try {
      const img = new Image();
      img.src = logoBase64;
      await new Promise((resolve) => {
        img.onload = () => {
          const logoHeight = 20;
          const logoWidth = (img.width / img.height) * logoHeight;
          // Add logo on the left side of header
          pdf.addImage(logoBase64, 'PNG', margin, 10, logoWidth, logoHeight);
          resolve(null);
        };
        img.onerror = () => resolve(null);
      });
    } catch (error) {
      console.warn('Error adding logo to PDF:', error);
    }
  }
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  // Center the title, accounting for logo on left
  const titleX = logoBase64 ? (pageWidth / 2) : margin;
  pdf.text('Growth Over Time Report', titleX, 25, { align: logoBase64 ? 'center' : 'left' });
  
  yPosition = 50;

  // Filter Information Section
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Report Filters', margin, yPosition);
  yPosition += 8;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  const filterLines = [
    `Subject: ${filters.subjectName || 'All Subjects'}`,
    filters.schoolName ? `School: ${filters.schoolName}` : null,
    filters.gradeName ? `Grade: ${filters.gradeName}` : null,
    filters.studentName ? `Student: ${filters.studentName}` : null,
  ].filter(Boolean) as string[];

  filterLines.forEach(line => {
    checkPageBreak(7);
    pdf.text(line, margin, yPosition);
    yPosition += 7;
  });

  yPosition += 5;

  // Try to capture the chart as image
  try {
    // Wait a bit for chart to render
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const chartElement = document.getElementById(chartElementId) || 
                        document.querySelector('.recharts-wrapper') ||
                        document.querySelector('[class*="GrowthOverTimeChart"]') ||
                        document.querySelector('[class*="recharts"]');
    
    if (chartElement) {
      const canvas = await html2canvas(chartElement as HTMLElement, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
        windowWidth: (chartElement as HTMLElement).scrollWidth,
        windowHeight: (chartElement as HTMLElement).scrollHeight
      });
      
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = pageWidth - 2 * margin;
      const imgHeight = (canvas.height / canvas.width) * imgWidth;
      
      checkPageBreak(imgHeight + 10);
      
      pdf.addImage(imgData, 'PNG', margin, yPosition, imgWidth, imgHeight);
      yPosition += imgHeight + 10;
    } else {
      // Fallback: Create a text-based representation
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Growth Data Summary', margin, yPosition);
      yPosition += 10;
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      
      // Create a simple table representation
      const tableData = prepareTableData(data);
      if (tableData.length > 0) {
        const colWidths = [40, 30, 30, 30, 30];
        const startX = margin;
        let tableY = yPosition;
        
        // Table header
        pdf.setFont('helvetica', 'bold');
        pdf.setFillColor(240, 240, 240);
        pdf.rect(startX, tableY - 8, pageWidth - 2 * margin, 8, 'F');
        pdf.text('Period', startX + 2, tableY - 2);
        if (data.studentScores && data.studentScores.length > 0) {
          pdf.text('Student', startX + colWidths[0] + 2, tableY - 2);
        }
        if (data.classAverages && data.classAverages.length > 0) {
          pdf.text('Class', startX + colWidths[0] + colWidths[1] + 2, tableY - 2);
        }
        if (data.schoolAverages && data.schoolAverages.length > 0) {
          pdf.text('School', startX + colWidths[0] + colWidths[1] + colWidths[2] + 2, tableY - 2);
        }
        if (data.districtAverages && data.districtAverages.length > 0) {
          pdf.text('District', startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + 2, tableY - 2);
        }
        tableY += 8;
        
        // Table rows
        pdf.setFont('helvetica', 'normal');
        tableData.forEach((row, idx) => {
          checkPageBreak(8);
          if (idx % 2 === 0) {
            pdf.setFillColor(250, 250, 250);
            pdf.rect(startX, tableY - 6, pageWidth - 2 * margin, 6, 'F');
          }
          pdf.text(row.period, startX + 2, tableY - 2);
          let xOffset = colWidths[0];
          if (data.studentScores && data.studentScores.length > 0) {
            pdf.text(row.studentScore !== null ? String(row.studentScore) : '-', startX + xOffset + 2, tableY - 2);
            xOffset += colWidths[1];
          }
          if (data.classAverages && data.classAverages.length > 0) {
            pdf.text(row.classAverage !== null ? String(row.classAverage) : '-', startX + xOffset + 2, tableY - 2);
            xOffset += colWidths[2];
          }
          if (data.schoolAverages && data.schoolAverages.length > 0) {
            pdf.text(row.schoolAverage !== null ? String(row.schoolAverage) : '-', startX + xOffset + 2, tableY - 2);
            xOffset += colWidths[3];
          }
          if (data.districtAverages && data.districtAverages.length > 0) {
            pdf.text(row.districtAverage !== null ? String(row.districtAverage) : '-', startX + xOffset + 2, tableY - 2);
          }
          tableY += 6;
        });
        yPosition = tableY;
      }
    }
  } catch (error) {
    console.error('Error capturing chart:', error);
    // Fallback text representation
    pdf.setFontSize(10);
    pdf.text('Chart visualization could not be captured. Please use tabular view for detailed data.', margin, yPosition);
    yPosition += 10;
  }

  // Summary Statistics
  yPosition += 10;
  checkPageBreak(30);
  
  pdf.setFillColor(240, 248, 255); // Light blue
  pdf.rect(margin, yPosition - 8, pageWidth - 2 * margin, 25, 'F');
  
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.text('Summary Statistics', margin + 5, yPosition);
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  yPosition += 8;
  pdf.text(`Total Assessments: ${data.totalAssessments}`, margin + 5, yPosition);
  yPosition += 6;
  
  const maxClassSize = Math.max(
    ...(data.classAverages?.map(avg => avg.studentCount) || 
        data.schoolAverages?.map(avg => avg.studentCount) || 
        data.districtAverages?.map(avg => avg.studentCount) || [0])
  );
  pdf.text(`Max Class Size: ${maxClassSize}`, margin + 5, yPosition);

  // Footer
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(128, 128, 128);
    pdf.text(
      `Page ${i} of ${totalPages} | Generated on ${new Date().toLocaleDateString()}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  // Generate filename
  const filename = `Growth_Report_${filters.subjectName || 'All'}_${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(filename);
};

// Prepare table data for export
const prepareTableData = (data: GrowthOverTimeData) => {
  const allPeriods = new Set<string>();
  if (data.classAverages && data.classAverages.length > 0) {
    data.classAverages.forEach(avg => allPeriods.add(avg.period));
  }
  if (data.schoolAverages && data.schoolAverages.length > 0) {
    data.schoolAverages.forEach(avg => allPeriods.add(avg.period));
  }
  if (data.districtAverages && data.districtAverages.length > 0) {
    data.districtAverages.forEach(avg => allPeriods.add(avg.period));
  }
  if (data.studentScores && data.studentScores.length > 0) {
    data.studentScores.forEach(score => allPeriods.add(score.period));
  }

  return Array.from(allPeriods)
    .map(period => {
      const classAvg = data.classAverages?.find(a => a.period === period);
      const schoolAvg = data.schoolAverages?.find(a => a.period === period);
      const studentScore = data.studentScores?.find(s => s.period === period);
      const districtAvg = data.districtAverages?.find(d => d.period === period);
      const source = classAvg || schoolAvg || districtAvg || studentScore;

      return {
        period,
        year: source?.year || 0,
        assessmentPeriod: source?.assessmentPeriod || 'BOY',
        studentScore: studentScore?.ritScore ?? null,
        classAverage: classAvg?.averageRITScore ?? null,
        schoolAverage: schoolAvg?.averageRITScore ?? null,
        districtAverage: districtAvg?.averageRITScore ?? null,
        studentCount: classAvg?.studentCount || schoolAvg?.studentCount || districtAvg?.studentCount || 0,
        distributions: data.periodDistributions?.find(d => d.period === period)?.distributions || {
          red: 0, orange: 0, yellow: 0, green: 0, blue: 0
        }
      };
    })
    .sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      const periodOrder = { 'BOY': 1, 'EOY': 2 };
      return periodOrder[a.assessmentPeriod as keyof typeof periodOrder] -
        periodOrder[b.assessmentPeriod as keyof typeof periodOrder];
    });
};

// Export Graphical View to PDF (Growth Over Time only)
export const exportGrowthGraphicalToPDF = async (
  data: GrowthOverTimeData,
  filters: ExportFilters,
  chartElementId: string = 'growth-chart-container'
) => {
  const pdf = new jsPDF('landscape', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  let yPosition = margin;

  // Helper to check page break
  const checkPageBreak = (requiredHeight: number) => {
    if (yPosition + requiredHeight > pageHeight - margin) {
      pdf.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };

  // Header with colored background and logo
  pdf.setFillColor(59, 130, 246); // Blue
  pdf.rect(0, 0, pageWidth, 40, 'F');
  
  // Load and add logo in header
  const logoBase64 = await loadLogoAsBase64();
  if (logoBase64) {
    try {
      const img = new Image();
      img.src = logoBase64;
      await new Promise((resolve) => {
        img.onload = () => {
          const logoHeight = 20;
          const logoWidth = (img.width / img.height) * logoHeight;
          // Add logo on the left side of header
          pdf.addImage(logoBase64, 'PNG', margin, 10, logoWidth, logoHeight);
          resolve(null);
        };
        img.onerror = () => resolve(null);
      });
    } catch (error) {
      console.warn('Error adding logo to PDF:', error);
    }
  }
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  // Center the title, accounting for logo on left
  const titleX = logoBase64 ? (pageWidth / 2) : margin;
  pdf.text('Growth Over Time Report', titleX, 25, { align: logoBase64 ? 'center' : 'left' });
  
  yPosition = 50;

  // Filter Information Section
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Report Filters', margin, yPosition);
  yPosition += 8;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  const filterLines = [
    `Subject: ${filters.subjectName || 'All Subjects'}`,
    filters.schoolName ? `School: ${filters.schoolName}` : null,
    filters.gradeName ? `Grade: ${filters.gradeName}` : null,
    filters.studentName ? `Student: ${filters.studentName}` : null,
  ].filter(Boolean) as string[];

  filterLines.forEach(line => {
    checkPageBreak(7);
    pdf.text(line, margin, yPosition);
    yPosition += 7;
  });

  yPosition += 5;

  // Try to capture the chart as image
  try {
    // Wait a bit for chart to render
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const chartElement = document.getElementById(chartElementId) || 
                        document.querySelector('.recharts-wrapper') ||
                        document.querySelector('[class*="GrowthOverTimeChart"]') ||
                        document.querySelector('[class*="recharts"]');
    
    if (chartElement) {
      const canvas = await html2canvas(chartElement as HTMLElement, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
        windowWidth: (chartElement as HTMLElement).scrollWidth,
        windowHeight: (chartElement as HTMLElement).scrollHeight
      });
      
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = pageWidth - 2 * margin;
      const imgHeight = (canvas.height / canvas.width) * imgWidth;
      
      checkPageBreak(imgHeight + 10);
      
      pdf.addImage(imgData, 'PNG', margin, yPosition, imgWidth, imgHeight);
      yPosition += imgHeight + 10;
    } else {
      // Fallback: Create a text-based representation
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Growth Data Summary', margin, yPosition);
      yPosition += 10;
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      
      // Create a simple table representation
      const tableData = prepareTableData(data);
      if (tableData.length > 0) {
        const colWidths = [40, 30, 30, 30, 30];
        const startX = margin;
        let tableY = yPosition;
        
        // Table header
        pdf.setFont('helvetica', 'bold');
        pdf.setFillColor(240, 240, 240);
        pdf.rect(startX, tableY - 8, pageWidth - 2 * margin, 8, 'F');
        pdf.text('Period', startX + 2, tableY - 2);
        if (data.studentScores && data.studentScores.length > 0) {
          pdf.text('Student', startX + colWidths[0] + 2, tableY - 2);
        }
        if (data.classAverages && data.classAverages.length > 0) {
          pdf.text('Class', startX + colWidths[0] + colWidths[1] + 2, tableY - 2);
        }
        if (data.schoolAverages && data.schoolAverages.length > 0) {
          pdf.text('School', startX + colWidths[0] + colWidths[1] + colWidths[2] + 2, tableY - 2);
        }
        if (data.districtAverages && data.districtAverages.length > 0) {
          pdf.text('District', startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + 2, tableY - 2);
        }
        tableY += 8;
        
        // Table rows
        pdf.setFont('helvetica', 'normal');
        tableData.forEach((row, idx) => {
          checkPageBreak(8);
          if (idx % 2 === 0) {
            pdf.setFillColor(250, 250, 250);
            pdf.rect(startX, tableY - 6, pageWidth - 2 * margin, 6, 'F');
          }
          pdf.text(row.period, startX + 2, tableY - 2);
          let xOffset = colWidths[0];
          if (data.studentScores && data.studentScores.length > 0) {
            pdf.text(row.studentScore !== null ? String(row.studentScore) : '-', startX + xOffset + 2, tableY - 2);
            xOffset += colWidths[1];
          }
          if (data.classAverages && data.classAverages.length > 0) {
            pdf.text(row.classAverage !== null ? String(row.classAverage) : '-', startX + xOffset + 2, tableY - 2);
            xOffset += colWidths[2];
          }
          if (data.schoolAverages && data.schoolAverages.length > 0) {
            pdf.text(row.schoolAverage !== null ? String(row.schoolAverage) : '-', startX + xOffset + 2, tableY - 2);
            xOffset += colWidths[3];
          }
          if (data.districtAverages && data.districtAverages.length > 0) {
            pdf.text(row.districtAverage !== null ? String(row.districtAverage) : '-', startX + xOffset + 2, tableY - 2);
          }
          tableY += 6;
        });
        yPosition = tableY;
      }
    }
  } catch (error) {
    console.error('Error capturing chart:', error);
    // Fallback text representation
    pdf.setFontSize(10);
    pdf.text('Chart visualization could not be captured. Please use tabular view for detailed data.', margin, yPosition);
    yPosition += 10;
  }

  // Summary Statistics
  yPosition += 10;
  checkPageBreak(30);
  
  pdf.setFillColor(240, 248, 255); // Light blue
  pdf.rect(margin, yPosition - 8, pageWidth - 2 * margin, 25, 'F');
  
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.text('Summary Statistics', margin + 5, yPosition);
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  yPosition += 8;
  pdf.text(`Total Assessments: ${data.totalAssessments}`, margin + 5, yPosition);
  yPosition += 6;
  
  const maxClassSize = Math.max(
    ...(data.classAverages?.map(avg => avg.studentCount) || 
        data.schoolAverages?.map(avg => avg.studentCount) || 
        data.districtAverages?.map(avg => avg.studentCount) || [0])
  );
  pdf.text(`Max Class Size: ${maxClassSize}`, margin + 5, yPosition);

  // Footer
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(128, 128, 128);
    pdf.text(
      `Page ${i} of ${totalPages} | Generated on ${new Date().toLocaleDateString()}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  // Generate filename
  const filename = `Growth_Report_${filters.subjectName || 'All'}_${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(filename);
};

// Export Tabular View to PDF
export const exportGrowthTabularToPDF = async (
  data: GrowthOverTimeData,
  filters: ExportFilters,
  performanceData?: {
    subjectPerformance?: Array<{
      subject_id: number;
      subject_name: string;
      average_rit_score: number;
      student_count: number;
      min_score: number;
      max_score: number;
      standard_deviation: number;
    }>;
    growthRates?: Array<{
      subject_id: number;
      subject_name: string;
      boy_avg: number;
      eoy_avg: number;
    }>;
    yearTrends?: Array<{
      year: number;
      subject_id: number;
      subject_name: string;
      average_rit_score: number;
    }>;
  },
  chartElementIds?: {
    performanceOverview?: string;
    yearTrends?: string;
  }
) => {
  const pdf = new jsPDF('landscape', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  let yPosition = margin;

  const checkPageBreak = (requiredHeight: number) => {
    if (yPosition + requiredHeight > pageHeight - margin) {
      pdf.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };

  // Header with colored background and logo
  pdf.setFillColor(59, 130, 246); // Blue
  pdf.rect(0, 0, pageWidth, 40, 'F');
  
  // Load and add logo in header
  const logoBase64 = await loadLogoAsBase64();
  if (logoBase64) {
    try {
      const img = new Image();
      img.src = logoBase64;
      await new Promise((resolve) => {
        img.onload = () => {
          const logoHeight = 20;
          const logoWidth = (img.width / img.height) * logoHeight;
          // Add logo on the left side of header
          pdf.addImage(logoBase64, 'PNG', margin, 10, logoWidth, logoHeight);
          resolve(null);
        };
        img.onerror = () => resolve(null);
      });
    } catch (error) {
      console.warn('Error adding logo to PDF:', error);
    }
  }
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  // Center the title, accounting for logo on left
  const titleX = logoBase64 ? (pageWidth / 2) : margin;
  pdf.text('Growth Over Time Report - Tabular View', titleX, 25, { align: logoBase64 ? 'center' : 'left' });
  
  yPosition = 50;

  // Filter Information
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Report Filters', margin, yPosition);
  yPosition += 8;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  const filterLines = [
    `Subject: ${filters.subjectName || 'All Subjects'}`,
    filters.schoolName ? `School: ${filters.schoolName}` : null,
    filters.gradeName ? `Grade: ${filters.gradeName}` : null,
    filters.studentName ? `Student: ${filters.studentName}` : null,
  ].filter(Boolean) as string[];

  filterLines.forEach(line => {
    checkPageBreak(7);
    pdf.text(line, margin, yPosition);
    yPosition += 7;
  });

  yPosition += 10;

  // Performance Overview Section (if performance data provided)
  if (performanceData && performanceData.subjectPerformance && performanceData.subjectPerformance.length > 0) {
    checkPageBreak(60);
    
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(59, 130, 246);
    pdf.text('All Schools Performance Overview', margin, yPosition);
    yPosition += 10;

    // Try to capture the bar chart
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      const chartElement = document.getElementById(chartElementIds?.performanceOverview || 'performance-overview-chart') ||
                          document.querySelector('[class*="recharts-bar-chart"]') ||
                          document.querySelector('.recharts-wrapper');
      
      if (chartElement) {
        const canvas = await html2canvas(chartElement as HTMLElement, {
          backgroundColor: '#ffffff',
          scale: 2,
          logging: false,
          useCORS: true,
          allowTaint: true
        });
        
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = pageWidth - 2 * margin;
        const imgHeight = (canvas.height / canvas.width) * imgWidth;
        
        checkPageBreak(imgHeight + 10);
        pdf.addImage(imgData, 'PNG', margin, yPosition, imgWidth, Math.min(imgHeight, pageHeight - yPosition - 40));
        yPosition += Math.min(imgHeight, pageHeight - yPosition - 40) + 10;
      } else {
        // Fallback: Create table representation
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(0, 0, 0);
        
        const colWidths = [60, 40, 30, 40, 30];
        const startX = margin;
        let tableY = yPosition;
        
        // Table header
        pdf.setFont('helvetica', 'bold');
        pdf.setFillColor(240, 240, 240);
        pdf.rect(startX, tableY - 8, pageWidth - 2 * margin, 8, 'F');
        pdf.text('Subject', startX + 2, tableY - 2);
        pdf.text('Average', startX + colWidths[0] + 2, tableY - 2);
        pdf.text('Students', startX + colWidths[0] + colWidths[1] + 2, tableY - 2);
        pdf.text('Range', startX + colWidths[0] + colWidths[1] + colWidths[2] + 2, tableY - 2);
        pdf.text('Std Dev', startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + 2, tableY - 2);
        tableY += 8;
        
        // Table rows
        pdf.setFont('helvetica', 'normal');
        performanceData.subjectPerformance.forEach((subject, idx) => {
          checkPageBreak(8);
          if (idx % 2 === 0) {
            pdf.setFillColor(250, 250, 250);
            pdf.rect(startX, tableY - 6, pageWidth - 2 * margin, 6, 'F');
          }
          pdf.text(subject.subject_name, startX + 2, tableY - 2);
          pdf.text(Number(subject.average_rit_score).toFixed(1), startX + colWidths[0] + 2, tableY - 2);
          pdf.text(String(subject.student_count || 0), startX + colWidths[0] + colWidths[1] + 2, tableY - 2);
          pdf.text(`${subject.min_score || 0} - ${subject.max_score || 0}`, startX + colWidths[0] + colWidths[1] + colWidths[2] + 2, tableY - 2);
          pdf.text(subject.standard_deviation ? Number(subject.standard_deviation).toFixed(1) : 'N/A', startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + 2, tableY - 2);
          tableY += 6;
        });
        yPosition = tableY + 5;
      }
    } catch (error) {
      console.error('Error capturing performance overview chart:', error);
      yPosition += 10;
    }
    
    yPosition += 10;
  }

  // Growth Over Time Table Data
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(59, 130, 246);
  pdf.text('Growth Over Time - Tabular Data', margin, yPosition);
  yPosition += 10;

  const tableData = prepareTableData(data);
  
  if (tableData.length > 0) {
    const colWidths: number[] = [];
    const headers: string[] = ['Period'];
    let currentWidth = 35; // Period column
    
    if (data.studentScores && data.studentScores.length > 0) {
      headers.push('Student Score');
      colWidths.push(25);
      currentWidth += 25;
    }
    if (data.classAverages && data.classAverages.length > 0) {
      headers.push('Class Avg');
      colWidths.push(25);
      currentWidth += 25;
    }
    if (data.schoolAverages && data.schoolAverages.length > 0) {
      headers.push('School Avg');
      colWidths.push(25);
      currentWidth += 25;
    }
    if (data.districtAverages && data.districtAverages.length > 0) {
      headers.push('District Avg');
      colWidths.push(25);
      currentWidth += 25;
    }
    headers.push('Students', 'Distribution');
    colWidths.push(20, 40);
    currentWidth += 60;

    const startX = margin;
    let tableY = yPosition;

    // Table Header with colors
    pdf.setFillColor(59, 130, 246);
    pdf.rect(startX, tableY - 8, pageWidth - 2 * margin, 8, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    
    let xPos = startX + 2;
    pdf.text(headers[0], xPos, tableY - 2);
    xPos += 35;
    
    let colIndex = 1;
    if (data.studentScores && data.studentScores.length > 0) {
      pdf.text(headers[colIndex], xPos, tableY - 2);
      xPos += colWidths[colIndex - 1];
      colIndex++;
    }
    if (data.classAverages && data.classAverages.length > 0) {
      pdf.text(headers[colIndex], xPos, tableY - 2);
      xPos += colWidths[colIndex - 1];
      colIndex++;
    }
    if (data.schoolAverages && data.schoolAverages.length > 0) {
      pdf.text(headers[colIndex], xPos, tableY - 2);
      xPos += colWidths[colIndex - 1];
      colIndex++;
    }
    if (data.districtAverages && data.districtAverages.length > 0) {
      pdf.text(headers[colIndex], xPos, tableY - 2);
      xPos += colWidths[colIndex - 1];
      colIndex++;
    }
    pdf.text(headers[colIndex], xPos, tableY - 2);
    xPos += 20;
    pdf.text(headers[colIndex + 1], xPos, tableY - 2);
    
    tableY += 8;

    // Table Rows
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    
    tableData.forEach((row, idx) => {
      checkPageBreak(7);
      
      // Alternating row colors
      if (idx % 2 === 0) {
        pdf.setFillColor(250, 250, 250);
        pdf.rect(startX, tableY - 6, pageWidth - 2 * margin, 6, 'F');
      }
      
      xPos = startX + 2;
      pdf.text(row.period, xPos, tableY - 2);
      xPos += 35;
      
      colIndex = 1;
      if (data.studentScores && data.studentScores.length > 0) {
        pdf.text(row.studentScore !== null ? String(row.studentScore) : '-', xPos, tableY - 2);
        xPos += colWidths[colIndex - 1];
        colIndex++;
      }
      if (data.classAverages && data.classAverages.length > 0) {
        pdf.text(row.classAverage !== null ? String(row.classAverage) : '-', xPos, tableY - 2);
        xPos += colWidths[colIndex - 1];
        colIndex++;
      }
      if (data.schoolAverages && data.schoolAverages.length > 0) {
        pdf.setFillColor(219, 234, 254); // Light blue for school
        pdf.rect(xPos - 1, tableY - 6, colWidths[colIndex - 1], 6, 'F');
        pdf.setTextColor(37, 99, 235); // Blue text
        pdf.text(row.schoolAverage !== null ? String(row.schoolAverage) : '-', xPos, tableY - 2);
        pdf.setTextColor(0, 0, 0);
        xPos += colWidths[colIndex - 1];
        colIndex++;
      }
      if (data.districtAverages && data.districtAverages.length > 0) {
        pdf.setFillColor(254, 226, 226); // Light red for district
        pdf.rect(xPos - 1, tableY - 6, colWidths[colIndex - 1], 6, 'F');
        pdf.setTextColor(220, 38, 38); // Red text
        pdf.text(row.districtAverage !== null ? String(row.districtAverage) : '-', xPos, tableY - 2);
        pdf.setTextColor(0, 0, 0);
        xPos += colWidths[colIndex - 1];
        colIndex++;
      }
      pdf.text(String(row.studentCount), xPos, tableY - 2);
      xPos += 20;
      
      // Distribution as text
      const distText = `R:${row.distributions.red}% O:${row.distributions.orange}% Y:${row.distributions.yellow}% G:${row.distributions.green}% B:${row.distributions.blue}%`;
      pdf.text(distText, xPos, tableY - 2);
      
      tableY += 6;
    });
    
    yPosition = tableY + 5;
  }

  // Summary Statistics
  checkPageBreak(30);
  pdf.setFillColor(240, 248, 255);
  pdf.rect(margin, yPosition - 8, pageWidth - 2 * margin, 25, 'F');
  
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.text('Summary Statistics', margin + 5, yPosition);
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  yPosition += 8;
  pdf.text(`Total Assessments: ${data.totalAssessments}`, margin + 5, yPosition);
  yPosition += 6;
  
  const maxClassSize = Math.max(
    ...(data.classAverages?.map(avg => avg.studentCount) || 
        data.schoolAverages?.map(avg => avg.studentCount) || 
        data.districtAverages?.map(avg => avg.studentCount) || [0])
  );
  pdf.text(`Max Class Size: ${maxClassSize}`, margin + 5, yPosition);

  // Footer
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(128, 128, 128);
    pdf.text(
      `Page ${i} of ${totalPages} | Generated on ${new Date().toLocaleDateString()}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  const filename = `Growth_Report_Tabular_${filters.subjectName || 'All'}_${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(filename);
};

// Export Tabular View to CSV
export const exportGrowthTabularToCSV = (
  data: GrowthOverTimeData,
  filters: ExportFilters
) => {
  const tableData = prepareTableData(data);
  
  // CSV Headers
  const headers: string[] = ['Period', 'Year', 'Assessment Period'];
  if (data.studentScores && data.studentScores.length > 0) {
    headers.push('Student Score');
  }
  if (data.classAverages && data.classAverages.length > 0) {
    headers.push('Class Average');
  }
  if (data.schoolAverages && data.schoolAverages.length > 0) {
    headers.push('School Average');
  }
  if (data.districtAverages && data.districtAverages.length > 0) {
    headers.push('District Average');
  }
  headers.push('Student Count', 'Red % (100-150)', 'Orange % (151-200)', 'Yellow % (201-250)', 'Green % (251-300)', 'Blue % (301-350)');

  // CSV Rows
  const rows = tableData.map(row => {
    const csvRow: (string | number)[] = [
      row.period,
      row.year,
      row.assessmentPeriod
    ];
    
    if (data.studentScores && data.studentScores.length > 0) {
      csvRow.push(row.studentScore !== null ? row.studentScore : '');
    }
    if (data.classAverages && data.classAverages.length > 0) {
      csvRow.push(row.classAverage !== null ? row.classAverage : '');
    }
    if (data.schoolAverages && data.schoolAverages.length > 0) {
      csvRow.push(row.schoolAverage !== null ? row.schoolAverage : '');
    }
    if (data.districtAverages && data.districtAverages.length > 0) {
      csvRow.push(row.districtAverage !== null ? row.districtAverage : '');
    }
    csvRow.push(
      row.studentCount,
      row.distributions.red,
      row.distributions.orange,
      row.distributions.yellow,
      row.distributions.green,
      row.distributions.blue
    );
    
    return csvRow;
  });

  // Create CSV content
  let csvContent = '';
  
  // Add metadata as comments
  csvContent += `# Growth Over Time Report\n`;
  csvContent += `# Generated: ${new Date().toLocaleString()}\n`;
  csvContent += `# Subject: ${filters.subjectName || 'All Subjects'}\n`;
  if (filters.schoolName) csvContent += `# School: ${filters.schoolName}\n`;
  if (filters.gradeName) csvContent += `# Grade: ${filters.gradeName}\n`;
  if (filters.studentName) csvContent += `# Student: ${filters.studentName}\n`;
  csvContent += `\n`;

  // Add headers
  csvContent += headers.map(h => `"${h}"`).join(',') + '\n';
  
  // Add rows
  rows.forEach(row => {
    csvContent += row.map(cell => {
      if (cell === null || cell === undefined) return '""';
      if (typeof cell === 'string' && cell.includes(',')) {
        return `"${cell.replace(/"/g, '""')}"`;
      }
      return cell;
    }).join(',') + '\n';
  });

  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `Growth_Report_${filters.subjectName || 'All'}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
