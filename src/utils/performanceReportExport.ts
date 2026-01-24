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

// Export Complete Performance Report to PDF (includes all sections)
export const exportCompletePerformanceReportToPDF = async (
  growthData: GrowthOverTimeData,
  performanceData: PerformanceData,
  filters: ExportFilters,
  chartElementIds: {
    performanceOverview?: string;
    growthOverTime?: string;
    yearTrends?: string;
  } = {}
) => {
  const pdf = new jsPDF('portrait', 'mm', 'a4');
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
  pdf.text('Performance & Growth Report', titleX, 25, { align: logoBase64 ? 'center' : 'left' });
  
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

  yPosition += 10;

  // 1. All Schools Performance Overview (Bar Chart)
  if (performanceData.subjectPerformance && performanceData.subjectPerformance.length > 0) {
    checkPageBreak(60);
    
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(59, 130, 246);
    pdf.text('All Schools Performance Overview', margin, yPosition);
    yPosition += 10;

    // Try to capture the bar chart
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      const chartElement = document.getElementById(chartElementIds.performanceOverview || 'performance-overview-chart') ||
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
  }

  yPosition += 10;

  // 2. Performance Statistics Cards
  if (performanceData.subjectPerformance && performanceData.subjectPerformance.length > 0) {
    checkPageBreak(50);
    
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(59, 130, 246);
    pdf.text('Performance Statistics', margin, yPosition);
    yPosition += 10;

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(0, 0, 0);

    // Create cards in a grid (2 columns)
    const cardWidth = (pageWidth - 2 * margin - 10) / 2;
    let cardX = margin;
    let cardY = yPosition;
    let cardsInRow = 0;

    performanceData.subjectPerformance.forEach((subject, idx) => {
      if (cardsInRow >= 2) {
        cardsInRow = 0;
        cardX = margin;
        cardY += 35;
        checkPageBreak(35);
      }

      // Card background
      pdf.setFillColor(255, 255, 255);
      pdf.setDrawColor(200, 200, 200);
      pdf.rect(cardX, cardY, cardWidth, 30, 'FD');

      // Subject name
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.text(subject.subject_name, cardX + 5, cardY + 8);

      // Statistics
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.text(`Average: ${Number(subject.average_rit_score).toFixed(1)}`, cardX + 5, cardY + 14);
      pdf.text(`Students: ${subject.student_count || 0}`, cardX + 5, cardY + 19);
      pdf.text(`Range: ${subject.min_score || 0} - ${subject.max_score || 0}`, cardX + 5, cardY + 24);
      pdf.text(`Std Dev: ${subject.standard_deviation ? Number(subject.standard_deviation).toFixed(1) : 'N/A'}`, cardX + 5, cardY + 29);

      cardX += cardWidth + 10;
      cardsInRow++;
    });

    yPosition = cardY + 35 + 10;
  }

  yPosition += 10;

  // 3. Growth Rates (BOY to EOY)
  if (performanceData.growthRates && performanceData.growthRates.length > 0) {
    checkPageBreak(60);
    
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(34, 197, 94); // Green
    pdf.text('Growth Rates (BOY to EOY)', margin, yPosition);
    yPosition += 10;

    // Create growth rate cards
    const cardWidth = (pageWidth - 2 * margin - 20) / 3;
    let cardX = margin;
    let cardY = yPosition;
    let cardsInRow = 0;

    performanceData.growthRates.forEach((subject, idx) => {
      if (cardsInRow >= 3) {
        cardsInRow = 0;
        cardX = margin;
        cardY += 30;
        checkPageBreak(30);
      }

      const growthRate = subject.boy_avg && subject.eoy_avg 
        ? ((subject.eoy_avg - subject.boy_avg) / subject.boy_avg * 100).toFixed(1)
        : null;

      // Card background
      pdf.setFillColor(249, 250, 251);
      pdf.setDrawColor(200, 200, 200);
      pdf.rect(cardX, cardY, cardWidth, 25, 'FD');

      // Subject name
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.text(subject.subject_name, cardX + 3, cardY + 7);

      // Growth data
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      pdf.text(`BOY: ${subject.boy_avg ? Number(subject.boy_avg).toFixed(1) : 'N/A'}`, cardX + 3, cardY + 12);
      pdf.text(`EOY: ${subject.eoy_avg ? Number(subject.eoy_avg).toFixed(1) : 'N/A'}`, cardX + 3, cardY + 17);
      
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(growthRate && Number(growthRate) > 0 ? 34 : growthRate && Number(growthRate) < 0 ? 239 : 0, 
                       growthRate && Number(growthRate) > 0 ? 197 : growthRate && Number(growthRate) < 0 ? 68 : 0, 
                       growthRate && Number(growthRate) > 0 ? 94 : growthRate && Number(growthRate) < 0 ? 68 : 0);
      pdf.text(`Growth: ${growthRate ? `${growthRate}%` : 'N/A'}`, cardX + 3, cardY + 22);
      pdf.setTextColor(0, 0, 0);

      cardX += cardWidth + 10;
      cardsInRow++;
    });

    yPosition = cardY + 30 + 10;
  }

  yPosition += 10;

  // 4. Year-over-Year Trends
  if (performanceData.yearTrends && performanceData.yearTrends.length > 0) {
    checkPageBreak(60);
    
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(147, 51, 234); // Purple
    pdf.text('Year-over-Year Trends', margin, yPosition);
    yPosition += 10;

    // Try to capture the line chart
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      const chartElement = document.getElementById(chartElementIds.yearTrends || 'year-trends-chart') ||
                          document.querySelector('[class*="recharts-line-chart"]') ||
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
        // Fallback: Create table
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(0, 0, 0);
        
        const years = [...new Set(performanceData.yearTrends.map(t => t.year))].sort();
        const subjects = [...new Set(performanceData.yearTrends.map(t => t.subject_name))];
        
        const colWidth = (pageWidth - 2 * margin) / (subjects.length + 1);
        let tableY = yPosition;
        
        // Header
        pdf.setFont('helvetica', 'bold');
        pdf.setFillColor(240, 240, 240);
        pdf.rect(margin, tableY - 8, pageWidth - 2 * margin, 8, 'F');
        pdf.text('Year', margin + 2, tableY - 2);
        subjects.forEach((subject, idx) => {
          pdf.text(subject, margin + colWidth * (idx + 1) + 2, tableY - 2);
        });
        tableY += 8;
        
        // Rows
        pdf.setFont('helvetica', 'normal');
        years.forEach(year => {
          checkPageBreak(8);
          pdf.text(String(year), margin + 2, tableY - 2);
          subjects.forEach((subject, idx) => {
            const trend = performanceData.yearTrends?.find(t => t.year === year && t.subject_name === subject);
            pdf.text(trend ? Number(trend.average_rit_score).toFixed(1) : '-', margin + colWidth * (idx + 1) + 2, tableY - 2);
          });
          tableY += 6;
        });
        yPosition = tableY + 5;
      }
    } catch (error) {
      console.error('Error capturing year trends chart:', error);
      yPosition += 10;
    }
  }

  yPosition += 10;

  // 5. Growth Over Time Chart
  checkPageBreak(60);
  
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(59, 130, 246);
  pdf.text('Growth Over Time', margin, yPosition);
  yPosition += 10;

  // Try to capture the growth chart
  try {
    await new Promise(resolve => setTimeout(resolve, 500));
    const chartElement = document.getElementById(chartElementIds.growthOverTime || 'growth-chart-container') ||
                        document.querySelector('[class*="GrowthOverTimeChart"]') ||
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
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(0, 0, 0);
      
      const tableData = prepareTableData(growthData);
      if (tableData.length > 0) {
        const colWidths = [40, 30, 30, 30, 30];
        const startX = margin;
        let tableY = yPosition;
        
        // Table header
        pdf.setFont('helvetica', 'bold');
        pdf.setFillColor(240, 240, 240);
        pdf.rect(startX, tableY - 8, pageWidth - 2 * margin, 8, 'F');
        pdf.text('Period', startX + 2, tableY - 2);
        if (growthData.studentScores && growthData.studentScores.length > 0) {
          pdf.text('Student', startX + colWidths[0] + 2, tableY - 2);
        }
        if (growthData.classAverages && growthData.classAverages.length > 0) {
          pdf.text('Class', startX + colWidths[0] + colWidths[1] + 2, tableY - 2);
        }
        if (growthData.schoolAverages && growthData.schoolAverages.length > 0) {
          pdf.text('School', startX + colWidths[0] + colWidths[1] + colWidths[2] + 2, tableY - 2);
        }
        if (growthData.districtAverages && growthData.districtAverages.length > 0) {
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
          if (growthData.studentScores && growthData.studentScores.length > 0) {
            pdf.text(row.studentScore !== null ? String(row.studentScore) : '-', startX + xOffset + 2, tableY - 2);
            xOffset += colWidths[1];
          }
          if (growthData.classAverages && growthData.classAverages.length > 0) {
            pdf.text(row.classAverage !== null ? String(row.classAverage) : '-', startX + xOffset + 2, tableY - 2);
            xOffset += colWidths[2];
          }
          if (growthData.schoolAverages && growthData.schoolAverages.length > 0) {
            pdf.text(row.schoolAverage !== null ? String(row.schoolAverage) : '-', startX + xOffset + 2, tableY - 2);
            xOffset += colWidths[3];
          }
          if (growthData.districtAverages && growthData.districtAverages.length > 0) {
            pdf.text(row.districtAverage !== null ? String(row.districtAverage) : '-', startX + xOffset + 2, tableY - 2);
          }
          tableY += 6;
        });
        yPosition = tableY;
      }
    }
  } catch (error) {
    console.error('Error capturing growth chart:', error);
    yPosition += 10;
  }

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

  const filename = `Complete_Performance_Report_${filters.subjectName || 'All'}_${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(filename);
};

// Helper function to prepare table data from growth data
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
