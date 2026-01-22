import jsPDF from 'jspdf';

interface Question {
  id: number;
  questionText: string;
  questionType?: string;
  options?: string[];
  questionMetadata?: any;
}

interface AssessmentMetadata {
  title: string;
  subject: string;
  grade: string;
  timeLimitMinutes: number;
  difficultyLevel: number;
  questionCount: number;
}

export const exportAssessmentToPDF = async (
  questions: Question[],
  metadata: AssessmentMetadata
) => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  let yPosition = margin;

  // Helper function to add a new page if needed
  const checkPageBreak = (requiredHeight: number) => {
    if (yPosition + requiredHeight > pageHeight - margin) {
      pdf.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };

  // Helper function to strip HTML tags but preserve content
  const stripHtml = (html: string): string => {
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  // Helper function to decode HTML entities and normalize special characters
  const decodeHtmlEntities = (text: string): string => {
    if (!text || typeof text !== 'string') return text;
    
    // First strip HTML tags
    let decoded = text.replace(/<[^>]*>/g, '');
    
    // Create a temporary element to decode HTML entities
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = decoded;
    decoded = tempDiv.textContent || tempDiv.innerText || decoded;
    
    // Additional manual replacements for common issues
    decoded = decoded
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&minus;/g, '-')
      .replace(/&#45;/g, '-')
      .replace(/&#8211;/g, '-') // en dash
      .replace(/&#8212;/g, '-') // em dash
      .replace(/&#8213;/g, '-') // horizontal bar
      .replace(/&ndash;/g, '-')
      .replace(/&mdash;/g, '-')
      .replace(/&times;/g, '×')
      .replace(/&#215;/g, '×')
      .replace(/&divide;/g, '÷')
      .replace(/&#247;/g, '÷')
      .replace(/&plus;/g, '+')
      .replace(/&#43;/g, '+');
    
    // Remove any remaining HTML entity patterns that might cause issues
    decoded = decoded.replace(/&#\d+;/g, '');
    decoded = decoded.replace(/&[a-zA-Z]+;/g, '');
    
    return decoded.trim();
  };

  // Helper function to extract images from HTML
  const extractImages = (html: string): string[] => {
    const images: string[] = [];
    if (!html) return images;
    
    // Try multiple regex patterns to catch different image formats
    const patterns = [
      /<img[^>]+src=["']([^"']+)["']/gi,  // Standard src="url"
      /<img[^>]+src=([^\s>]+)/gi,         // src=url (no quotes)
      /<img[^>]+data-src=["']([^"']+)["']/gi  // data-src="url"
    ];
    
    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(html)) !== null) {
        const url = match[1].replace(/["']/g, ''); // Remove any quotes
        if (url && !images.includes(url)) {
          images.push(url);
        }
      }
    });
    
    console.log('Extracted images from HTML:', images);
    return images;
  };

  // Helper function to process rich text content and maintain order of text and images
  const processRichTextContent = async (html: string): Promise<Array<{type: 'text' | 'image', content?: string, url?: string}>> => {
    const result: Array<{type: 'text' | 'image', content?: string, url?: string}> = [];
    
    if (!html || !html.trim()) {
      return result;
    }
    
    console.log('Processing rich text HTML:', html.substring(0, 200));
    
    try {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      
      // Walk through DOM tree maintaining order
      const walkTree = (node: Node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent?.trim();
          if (text) {
            // Add or merge text
            if (result.length > 0 && result[result.length - 1].type === 'text') {
              result[result.length - 1].content = (result[result.length - 1].content || '') + ' ' + text;
            } else {
              result.push({ type: 'text', content: text });
            }
          }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as HTMLElement;
          
          // Handle images - add them in order
          if (element.tagName === 'IMG') {
            const src = element.getAttribute('src') || element.getAttribute('data-src');
            if (src) {
              console.log('Found image in DOM tree:', src);
              result.push({ type: 'image', url: src });
            }
          }
          
          // Process all child nodes to maintain order
          Array.from(element.childNodes).forEach(walkTree);
        }
      };
      
      // Start walking from root
      Array.from(tempDiv.childNodes).forEach(walkTree);
      
      // Clean up merged text content
      result.forEach(item => {
        if (item.type === 'text' && item.content) {
          item.content = item.content.replace(/\s+/g, ' ').trim();
        }
      });
      
      // Filter out empty text items
      const filtered = result.filter(item => {
        if (item.type === 'text') {
          return item.content && item.content.trim().length > 0;
        }
        return true;
      });
      
      console.log('Processed content result:', filtered);
      return filtered;
    } catch (error) {
      console.error('Error processing rich text:', error);
      // Fallback to simple text extraction
      const text = stripHtml(html);
      if (text.trim()) {
        return [{ type: 'text', content: text }];
      }
      return result;
    }
  };

  // Helper function to add text with word wrap
  const addWrappedText = (text: string, fontSize: number, isBold: boolean = false) => {
    pdf.setFontSize(fontSize);
    if (isBold) {
      pdf.setFont('helvetica', 'bold');
    } else {
      pdf.setFont('helvetica', 'normal');
    }
    
    const lines = pdf.splitTextToSize(text, contentWidth);
    lines.forEach((line: string) => {
      checkPageBreak(7);
      pdf.text(line, margin, yPosition);
      yPosition += 7;
    });
  };

  // Helper function to add image from URL
  const addImageFromUrl = async (imageUrl: string, maxWidth: number = contentWidth) => {
    try {
      // Convert relative URL to absolute if needed
      let absoluteUrl = imageUrl;
      
      // Handle different URL formats
      if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        absoluteUrl = imageUrl;
      } else if (imageUrl.startsWith('/api/uploads/')) {
        absoluteUrl = `${window.location.origin}${imageUrl}`;
      } else if (imageUrl.startsWith('/uploads/')) {
        absoluteUrl = `${window.location.origin}/api${imageUrl}`;
      } else if (imageUrl.startsWith('/')) {
        absoluteUrl = `${window.location.origin}${imageUrl}`;
      } else {
        // Assume it's a filename, try different paths
        absoluteUrl = `${window.location.origin}/api/uploads/images/${imageUrl}`;
      }

      console.log('Fetching image from URL:', absoluteUrl);

      // Get auth token from localStorage if available
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {
        'Accept': 'image/*'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Fetch image and convert to base64
      const response = await fetch(absoluteUrl, {
        mode: 'cors',
        credentials: 'include',
        headers: headers
      });
      
      if (!response.ok) {
        console.error('Failed to fetch image:', response.status, response.statusText, absoluteUrl);
        // Try alternative URL formats
        if (!absoluteUrl.includes('/api/uploads/')) {
          const altUrl = absoluteUrl.replace('/uploads/', '/api/uploads/');
          console.log('Trying alternative URL:', altUrl);
          const altResponse = await fetch(altUrl, {
            mode: 'cors',
            credentials: 'include',
            headers: headers
          });
          if (altResponse.ok) {
            return await processImageBlob(await altResponse.blob(), maxWidth);
          }
        }
        return;
      }
      
      const blob = await response.blob();
      return await processImageBlob(blob, maxWidth);
    } catch (error) {
      console.error('Error adding image:', error, imageUrl);
      // Continue without image if there's an error
    }
  };

  // Helper function to process image blob
  const processImageBlob = (blob: Blob, maxWidth: number): Promise<void> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      
      reader.onloadend = () => {
        const base64data = reader.result as string;
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const imgWidth = img.width;
          const imgHeight = img.height;
          const ratio = Math.min(maxWidth / imgWidth, (pageHeight - yPosition - margin) / imgHeight);
          const scaledWidth = imgWidth * ratio;
          const scaledHeight = imgHeight * ratio;

          checkPageBreak(scaledHeight + 5);
          
          // Determine image format
          const format = blob.type.includes('png') ? 'PNG' : (blob.type.includes('gif') ? 'GIF' : 'JPEG');
          try {
            pdf.addImage(base64data, format, margin, yPosition, scaledWidth, scaledHeight);
            yPosition += scaledHeight + 5;
            console.log('Image added successfully');
          } catch (err) {
            console.error('Error adding image to PDF:', err);
          }
          resolve();
        };
        img.onerror = (err) => {
          console.error('Error loading image:', err);
          resolve(); // Continue without image
        };
        img.src = base64data;
      };
      reader.onerror = () => {
        console.error('Error reading image file');
        resolve(); // Continue without image
      };
      reader.readAsDataURL(blob);
    });
  };

  // Add Header
  pdf.setFillColor(59, 130, 246); // Blue color
  pdf.rect(0, 0, pageWidth, 40, 'F');
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Assessment Export', margin, 25);
  
  yPosition = 50;

  // Add Metadata Section
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Assessment Details', margin, yPosition);
  yPosition += 10;

  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  
  const metadataLines = [
    `Assessment Name: ${metadata.title}`,
    `Subject: ${metadata.subject}`,
    `Grade: ${metadata.grade}`,
    `Time Limit: ${metadata.timeLimitMinutes} minutes`,
    `Difficulty Level: ${metadata.difficultyLevel}`,
    `Total Questions: ${metadata.questionCount}`
  ];

  metadataLines.forEach(line => {
    checkPageBreak(7);
    pdf.text(line, margin, yPosition);
    yPosition += 7;
  });

  yPosition += 5;

  // Add Questions
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Questions', margin, yPosition);
  yPosition += 10;

  for (let i = 0; i < questions.length; i++) {
    const question = questions[i];
    const questionNum = i + 1;

    checkPageBreak(20);

    // Question Number and Type
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(59, 130, 246);
    pdf.text(`Question ${questionNum}`, margin, yPosition);
    
    if (question.questionType && question.questionType !== 'MCQ') {
      pdf.setFontSize(9);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`(${question.questionType})`, margin + 35, yPosition);
    }
    
    yPosition += 8;
    pdf.setTextColor(0, 0, 0);

    // Question Text (handle rich text with images)
    const questionText = question.questionText || '';
    let textContent = ''; // Store stripped text for FillInBlank processing
    
    // For FillInBlank, we'll show the formatted version with options inline instead of the original
    // For other types, show the rich text with images
    if (question.questionType !== 'FillInBlank') {
      // Process rich text content to maintain order of text and images
      if (questionText.trim()) {
        const processedContent = await processRichTextContent(questionText);
        
        if (processedContent.length > 0) {
          // Count images found in processed content
          const imagesInContent = processedContent.filter(item => item.type === 'image').length;
          console.log(`Found ${imagesInContent} images in processed content`);
          
          for (const item of processedContent) {
            if (item.type === 'text' && item.content && item.content.trim()) {
              pdf.setFontSize(11);
              pdf.setFont('helvetica', 'normal');
              addWrappedText(item.content, 11);
            } else if (item.type === 'image' && item.url) {
              console.log('Processing image item:', item.url);
              await addImageFromUrl(item.url);
            }
          }
          
          // Fallback: if no images found in processed content, try regex extraction
          if (imagesInContent === 0) {
            console.log('No images found in processed content, trying regex extraction...');
            const images = extractImages(questionText);
            console.log('Extracted images via regex fallback:', images);
            for (const imageUrl of images) {
              await addImageFromUrl(imageUrl);
            }
          }
        } else {
          // Fallback: if no structured content, use simple text extraction
          textContent = stripHtml(questionText);
          if (textContent.trim()) {
            pdf.setFontSize(11);
            pdf.setFont('helvetica', 'normal');
            addWrappedText(textContent, 11);
          }
          // Also try to extract and add images using regex
          const images = extractImages(questionText);
          console.log('Extracted images via regex:', images);
          for (const imageUrl of images) {
            await addImageFromUrl(imageUrl);
          }
        }
      }
    } else {
      // For FillInBlank, store text content for later processing with options
      textContent = stripHtml(questionText);
      
      // Show images in order (text will be shown with options below)
      if (questionText.trim()) {
        const processedContent = await processRichTextContent(questionText);
        console.log('FillInBlank processed content:', processedContent);
        for (const item of processedContent) {
          if (item.type === 'text' && item.content && item.content.trim()) {
            // Don't show text here - we'll show formatted version with options below
          } else if (item.type === 'image' && item.url) {
            console.log('FillInBlank processing image:', item.url);
            await addImageFromUrl(item.url);
          }
        }
        // Fallback: extract images directly if not found in processed content
        const images = extractImages(questionText);
        if (images.length > 0) {
          console.log('FillInBlank fallback - extracted images:', images);
          for (const imageUrl of images) {
            await addImageFromUrl(imageUrl);
          }
        }
      }
    }

    // Add options based on question type
    if (question.questionType === 'MCQ' || question.questionType === 'TrueFalse' || question.questionType === 'MultipleSelect') {
      if (question.options && question.options.length > 0) {
        yPosition += 3;
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Options:', margin, yPosition);
        yPosition += 7;

        pdf.setFont('helvetica', 'normal');
        question.options.forEach((option, optIdx) => {
          checkPageBreak(7);
          const optionLabel = String.fromCharCode(65 + optIdx); // A, B, C, D...
          pdf.text(`${optionLabel}. ${option}`, margin + 5, yPosition);
          yPosition += 7;
        });
      }
    } else if (question.questionType === 'FillInBlank' && question.questionMetadata?.blanks) {
      // Format: "8 is divisible by ___ (option1 / option2) and ___(option1/ option2)"
      // Display question text with options inline (images were already shown above if any)
      yPosition += 3;
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      
      // Get the text content for blank replacement
      const originalText = textContent || stripHtml(questionText);
      
      // Process blanks similar to AssessmentPage.tsx - split text and insert options after each blank
      const blanks = question.questionMetadata.blanks;
      const parts: Array<{ type: 'text' | 'blank', content?: string, blankIndex?: number }> = [];
      let lastIndex = 0;
      let blankIndex = 0;
      
      // Split text by blanks (___ or {0}, {1}, etc.) - same pattern as AssessmentPage
      const blankPattern = /(___|\{[0-9]+\})/g;
      const matches: RegExpExecArray[] = [];
      let tempMatch;
      
      // Collect all matches first
      while ((tempMatch = blankPattern.exec(originalText)) !== null) {
        matches.push(tempMatch);
      }
      
      // Process matches to build parts array
      for (const match of matches) {
        // Add text before blank
        if (match.index > lastIndex) {
          parts.push({ type: 'text', content: originalText.substring(lastIndex, match.index) });
        }
        // Add blank placeholder
        parts.push({ type: 'blank', blankIndex: blankIndex });
        blankIndex++;
        lastIndex = match.index + match[0].length;
      }
      
      // Add remaining text
      if (lastIndex < originalText.length) {
        parts.push({ type: 'text', content: originalText.substring(lastIndex) });
      }
      
      // Build the final text with options inserted after each blank
      let fillInText = '';
      for (const part of parts) {
        if (part.type === 'text' && part.content) {
          fillInText += part.content;
        } else if (part.type === 'blank' && part.blankIndex !== undefined) {
          const blank = blanks[part.blankIndex];
          if (blank && blank.options && blank.options.length > 0) {
            const optionsText = blank.options.join(' / ');
            fillInText += `___ (${optionsText})`;
          } else {
            fillInText += '___';
          }
        }
      }
      
      // Display the formatted text with inline options
      addWrappedText(fillInText, 11);
    } else if (question.questionType === 'Matching' && question.questionMetadata) {
      yPosition += 5;
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      
      const leftItems = question.questionMetadata.leftItems || [];
      const rightItems = question.questionMetadata.rightItems || [];
      
      // Table layout with 1.5 inches gap (approximately 38mm)
      const colAWidth = 60; // Column A width in mm
      const gapWidth = 38; // 1.5 inches = 38mm
      const colBWidth = contentWidth - colAWidth - gapWidth;
      const colAX = margin;
      const colBX = margin + colAWidth + gapWidth;
      const rowHeight = 10; // Base row height
      
      // Table headers (NO LINES - clean format)
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.text('Column A', colAX + 2, yPosition);
      pdf.text('Column B', colBX + 2, yPosition);
      yPosition += 8;
      
      // Render rows: each row has one left item and one right item
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      
      const maxRows = Math.max(leftItems.length, rightItems.length);
      
      for (let i = 0; i < maxRows; i++) {
        checkPageBreak(rowHeight + 2);
        
        const rowStartY = yPosition;
        let rowEndY = yPosition;
        
        // Column A item
        if (i < leftItems.length) {
          // Decode HTML entities and normalize special characters
          const leftItemText = decodeHtmlEntities(String(leftItems[i]));
          const leftText = `${i + 1}. ${leftItemText}`;
          const leftLines = pdf.splitTextToSize(leftText, colAWidth - 8);
          pdf.text(leftLines[0], colAX + 2, yPosition);
          if (leftLines.length > 1) {
            yPosition += 6;
            pdf.text(leftLines.slice(1).join(' '), colAX + 2, yPosition);
          }
          rowEndY = Math.max(rowEndY, yPosition);
        }
        
        // Column B item (aligned horizontally with Column A)
        yPosition = rowStartY;
        if (i < rightItems.length) {
          // Decode HTML entities and normalize special characters
          const rightItemText = decodeHtmlEntities(String(rightItems[i]));
          const rightText = `${String.fromCharCode(65 + i)}. ${rightItemText}`;
          const rightLines = pdf.splitTextToSize(rightText, colBWidth - 8);
          pdf.text(rightLines[0], colBX + 2, yPosition);
          if (rightLines.length > 1) {
            yPosition += 6;
            pdf.text(rightLines.slice(1).join(' '), colBX + 2, yPosition);
          }
          rowEndY = Math.max(rowEndY, yPosition);
        }
        
        // Move to next row (NO LINES)
        yPosition = rowEndY + 6;
      }
    } else if (question.questionType === 'ShortAnswer') {
      // 3 rows with underscores
      yPosition += 5;
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Answer:', margin, yPosition);
      yPosition += 8;
      
      // Draw 3 rows with underscores
      for (let i = 0; i < 3; i++) {
        checkPageBreak(8);
        const underscoreLine = '_ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _';
        pdf.text(underscoreLine, margin, yPosition);
        yPosition += 8;
      }
      
      if (question.questionMetadata?.description) {
        yPosition += 3;
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'italic');
        addWrappedText(`Note: ${question.questionMetadata.description}`, 9);
      }
    } else if (question.questionType === 'Essay') {
      // 10 rows with underscores
      yPosition += 5;
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Answer:', margin, yPosition);
      yPosition += 8;
      
      // Draw 10 rows with underscores
      for (let i = 0; i < 10; i++) {
        checkPageBreak(8);
        const underscoreLine = '_ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _';
        pdf.text(underscoreLine, margin, yPosition);
        yPosition += 8;
      }
      
      if (question.questionMetadata?.description) {
        yPosition += 3;
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'italic');
        addWrappedText(`Note: ${question.questionMetadata.description}`, 9);
      }
    }

    yPosition += 10; // Space between questions
  }

  // Add footer
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(128, 128, 128);
    pdf.text(
      `Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  // Save PDF
  pdf.save(`${metadata.title.replace(/[^a-z0-9]/gi, '_')}_Assessment.pdf`);
};
