import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';

export interface ExtractedBillData {
  invoiceNumber: string;
  vendorName: string;
  gstinPan: string;
  invoiceDate: string;
  projectId: string;
  totalAmount: number | '';
  documentType: string;
  rawTextSnippet: string;
  method: string;
  missingFields: string[];
}

/**
 * Extract raw text from an uploaded PDF, Image, or Text file
 */
export async function extractTextFromDocument(file: File): Promise<{ text: string; method: string }> {
  const fileName = file.name.toLowerCase();

  // 1. Text-based files
  if (file.type.startsWith('text/') || fileName.endsWith('.txt') || fileName.endsWith('.csv') || fileName.endsWith('.json')) {
    try {
      const text = await file.text();
      return { text, method: 'Direct Text Read' };
    } catch {
      // Fall through
    }
  }

  // 2. PDF Documents
  if (file.type === 'application/pdf' || fileName.endsWith('.pdf')) {
    try {
      const arrayBuffer = await file.arrayBuffer();

      // Attempt extraction using pdfjs-dist
      try {
        const loadingTask = pdfjsLib.getDocument({
          data: new Uint8Array(arrayBuffer),
          useSystemFonts: true,
        });
        const pdf = await loadingTask.promise;
        const pageTexts: string[] = [];

        for (let i = 1; i <= Math.min(pdf.numPages, 10); i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const strings = content.items
            .map((item) => ('str' in item ? (item as { str: string }).str : ''))
            .filter(Boolean);
          pageTexts.push(strings.join(' '));
        }

        const fullPdfText = pageTexts.join('\n').trim();
        if (fullPdfText.length > 20) {
          return { text: fullPdfText, method: 'PDF Text Extraction (PDF.js)' };
        }
      } catch (pdfJsErr) {
        console.warn('PDF.js text parsing encountered an issue, trying raw stream scanning:', pdfJsErr);
      }

      // Fallback: Extract plain text strings from the raw PDF binary
      const uint8 = new Uint8Array(arrayBuffer);
      const rawString = new TextDecoder('latin1').decode(uint8);
      
      // Look for PDF text objects: (string) Tj or [(string) 20 (string)] TJ
      const textMatches: string[] = [];
      const tjRegex = /\(([^)]+)\)\s*Tj/g;
      let match: RegExpExecArray | null;
      while ((match = tjRegex.exec(rawString)) !== null) {
        textMatches.push(match[1]);
      }

      const tjArrayRegex = /\[(.*?)\]\s*TJ/g;
      while ((match = tjArrayRegex.exec(rawString)) !== null) {
        const inner = match[1];
        const innerMatches = inner.match(/\(([^)]+)\)/g);
        if (innerMatches) {
          textMatches.push(innerMatches.map(m => m.slice(1, -1)).join(' '));
        }
      }

      if (textMatches.length > 0) {
        return { text: textMatches.join(' '), method: 'PDF Binary Stream Scanner' };
      }

      // If text stream is empty, check for readable plain text words in the file
      const readableWords = rawString.match(/[A-Za-z0-9_\-\/.,:₹ ]{4,}/g) || [];
      if (readableWords.length > 5) {
        return { text: readableWords.join(' '), method: 'Raw Stream Scanner' };
      }
    } catch (err) {
      console.warn('PDF extraction failed:', err);
    }
  }

  // 3. Image Files (PNG, JPG, JPEG, WEBP, etc.)
  if (file.type.startsWith('image/') || /\.(png|jpe?g|webp|bmp|gif)$/i.test(fileName)) {
    try {
      // Race Tesseract against a 9-second timeout to prevent UI hanging
      const ocrPromise = Tesseract.recognize(file, 'eng');
      const timeoutPromise = new Promise<{ data: { text: string } }>((_, reject) =>
        setTimeout(() => reject(new Error('OCR Timeout')), 9000)
      );

      const result = await Promise.race([ocrPromise, timeoutPromise]);
      const ocrText = result.data.text.trim();
      if (ocrText.length > 10) {
        return { text: ocrText, method: 'Tesseract OCR Engine' };
      }
    } catch (ocrErr) {
      console.warn('Tesseract OCR could not complete, evaluating document attributes:', ocrErr);
    }
  }

  // Fallback: If no text was recognized from image or unsupported format, return empty
  return { text: '', method: 'Document Inspector' };
}

/**
 * Intelligently parse the 6 required invoice values from extracted text
 */
export function parseInvoiceFields(rawText: string, fileName = ''): ExtractedBillData {
  const cleanText = rawText.replace(/\r/g, '\n');

  // --- 1. Invoice Number ---
  let invoiceNumber = '';
  const invRegexes = [
    /(?:invoice|bill|inv|voucher)[\s#.:\-_/]*(?:no|number|#|code)?[\s:.-]*([A-Z0-9\/-]{3,30})/i,
    /\b(INV[-/][A-Z0-9\/-]{3,20})\b/i,
    /\b(BILL[-/][A-Z0-9\/-]{3,20})\b/i,
    /\b(VCH[-/][A-Z0-9\/-]{3,20})\b/i
  ];
  for (const reg of invRegexes) {
    const m = cleanText.match(reg);
    if (m && m[1]) {
      invoiceNumber = m[1].trim().replace(/^[#:\s]+|[.,\s]+$/g, '');
      break;
    }
  }

  // Fallback to fileName for invoice number if not in text
  if (!invoiceNumber && fileName) {
    const fnMatch = fileName.match(/(?:INV|BILL)[-_][A-Z0-9\-_]+/i);
    if (fnMatch) {
      invoiceNumber = fnMatch[0].replace(/_/g, '/').toUpperCase();
    }
  }

  // --- 2. Vendor Name ---
  let vendorName = '';
  const vendorRegexes = [
    /(?:vendor|contractor|seller|supplier|executing\s*agency|agency|billed\s*by|m\/s\.?|firm|company)[\s:.-]*([A-Za-z0-9&.,' -]{3,60}?)(?=\n|gst|pan|date|inv|total|amt|project|$)/i,
    /(?:from|issued\s*by)[\s:.-]*([A-Za-z0-9&.,' -]{3,60}?)(?=\n|gst|pan|date|inv|$)/i,
    /\b([A-Za-z0-9&.,' -]{3,50}\s+(?:Solutions|Infra|Technologies|Constructions|Enterprises|Pvt\s*Ltd|Limited|Works|Services))\b/i,
  ];
  for (const reg of vendorRegexes) {
    const m = cleanText.match(reg);
    if (m && m[1] && m[1].trim().length >= 3) {
      vendorName = m[1].trim().replace(/^[:\s\-]+|[,\s\-]+$/g, '');
      break;
    }
  }

  // --- 3. GSTIN / PAN ---
  let gstinPan = '';
  // Check standard GSTIN first (15 alphanumeric characters)
  const standardGstinMatch = cleanText.match(/\b([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})\b/i);
  if (standardGstinMatch) {
    gstinPan = standardGstinMatch[1].toUpperCase().replace(/[^A-Z0-9]/g, '');
  } else {
    // Check standard PAN (10 alphanumeric characters)
    const panMatch = cleanText.match(/\b([A-Z]{5}[0-9]{4}[A-Z]{1})\b/i);
    if (panMatch) {
      gstinPan = panMatch[1].toUpperCase().replace(/[^A-Z0-9]/g, '');
    } else {
      // Check labeled GSTIN/PAN (including invalid or fake formats)
      const labeledGstMatch = cleanText.match(/(?:gstin|gst\s*no|gst|pan\s*no|pan)[\s:.-]*([A-Z0-9\-_]{4,22})/i);
      if (labeledGstMatch && labeledGstMatch[1]) {
        gstinPan = labeledGstMatch[1].trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      }
    }
  }

  // --- 4. Invoice Date ---
  let invoiceDate = '';
  const dateRegexes = [
    /(?:date|invoice\s*date|bill\s*date|dated)[\s:.-]*([0-9]{4}[-/][0-9]{1,2}[-/][0-9]{1,2})/i,
    /(?:date|invoice\s*date|bill\s*date|dated)[\s:.-]*([0-9]{1,2}[-/][0-9]{1,2}[-/][0-9]{2,4})/i,
    /\b([0-9]{4}-[0-9]{2}-[0-9]{2})\b/,
    /\b([0-9]{1,2}[-/][0-9]{1,2}[-/][0-9]{4})\b/
  ];
  for (const reg of dateRegexes) {
    const m = cleanText.match(reg);
    if (m && m[1]) {
      const rawDate = m[1].trim();
      // Normalize to YYYY-MM-DD if possible
      if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
        invoiceDate = rawDate;
      } else if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(rawDate)) {
        const parts = rawDate.split(/[-/]/);
        if (parts.length === 3) {
          if (parts[0].length === 4) {
            invoiceDate = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
          } else {
            // DD-MM-YYYY
            invoiceDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
          }
        }
      } else {
        invoiceDate = rawDate;
      }
      break;
    }
  }

  // --- 5. Project ID ---
  let projectId = '';
  const projRegexes = [
    /\b(MPLAD[0-9]{3,4})\b/i,
    /(?:project\s*(?:id|code|ref|number|no)?|work\s*(?:id|code|no)?)[\s#:.-]*([A-Z0-9_\-]{3,20})/i,
    /\b(MPLADS?-[A-Z0-9_-]+)\b/i
  ];
  for (const reg of projRegexes) {
    const m = cleanText.match(reg);
    if (m && m[1]) {
      projectId = m[1].trim().toUpperCase();
      break;
    }
  }

  // --- 6. Total Amount ---
  let totalAmount: number | '' = '';
  const amtRegexes = [
    /(?:total\s*amount|grand\s*total|invoice\s*amount|net\s*amount|total\s*value|claim\s*amount|total)[\s:.-]*(?:₹|rs\.?|inr)?\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?|[0-9]{3,10})/i,
    /(?:₹|rs\.?|inr)\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?|[0-9]{4,10})/i
  ];
  for (const reg of amtRegexes) {
    const m = cleanText.match(reg);
    if (m && m[1]) {
      const cleanNum = m[1].replace(/,/g, '');
      const parsed = parseFloat(cleanNum);
      if (!isNaN(parsed) && parsed > 0) {
        totalAmount = Math.round(parsed);
        break;
      }
    }
  }

  // Work / Document Type
  let documentType = 'Voucher Claim';
  if (/culvert|bitumen|road/i.test(cleanText)) {
    documentType = 'Road & Culvert Civil Voucher';
  } else if (/masonry|building|school|hall/i.test(cleanText)) {
    documentType = 'Building & Masonry Milestone Claim';
  } else if (/water|tank|pipeline|borewell/i.test(cleanText)) {
    documentType = 'Water Utilities Stage Voucher';
  } else if (/lighting|electrical|street/i.test(cleanText)) {
    documentType = 'Electrical & Lighting Material Voucher';
  } else if (/material|cement|steel|sand/i.test(cleanText)) {
    documentType = 'Material Procurement Voucher';
  }

  // Missing fields tracking
  const missingFields: string[] = [];
  if (!invoiceNumber) missingFields.push('Invoice Number');
  if (!vendorName) missingFields.push('Vendor Name');
  if (!gstinPan) missingFields.push('GSTIN/PAN');
  if (!invoiceDate) missingFields.push('Invoice Date');
  if (!projectId) missingFields.push('Project ID');
  if (totalAmount === '' || totalAmount === 0) missingFields.push('Total Amount');

  return {
    invoiceNumber,
    vendorName,
    gstinPan,
    invoiceDate,
    projectId,
    totalAmount,
    documentType,
    rawTextSnippet: cleanText.slice(0, 300),
    method: '',
    missingFields,
  };
}

/**
 * Generate a downloadable test PDF voucher for testing (Consistent or Inconsistent)
 */
export function generateTestBillPDF(
  type: 'consistent' | 'technova' | 'inconsistent_vendor' | 'inconsistent_project' | 'inconsistent_budget' | 'duplicate_inv',
  customValues?: Partial<ExtractedBillData>
): Blob {
  let inv = 'INV/VEL/2024/991';
  let vendor = 'Vellore Engineering Services';
  let gstin = '33BBBPB9876C1Z9';
  let date = '2024-05-18';
  let projId = 'MPLAD002';
  let amount = '450000';
  let note = 'Certified Progress Voucher for MPLADS Road Works';

  if (type === 'technova') {
    inv = 'INV-2026-001';
    vendor = 'TechNova Solutions';
    gstin = '29ABCDE1234F1Z5';
    date = '2026-09-25';
    projId = 'MPLAD001';
    amount = '111392';
    note = 'Valid and internally consistent voucher for TechNova Solutions';
  } else if (type === 'inconsistent_vendor') {
    inv = 'INV/MIS/2024/888';
    vendor = 'Kongu Infra Developments';
    gstin = '33AABCK9911P1Z3';
    date = '2024-05-20';
    projId = 'MPLAD001';
    amount = '8500000';
    note = 'Intentional Inconsistent Test Bill: Vendor Mismatch and Budget Exceeded';
  } else if (type === 'inconsistent_project') {
    inv = 'INV/ERR/2024/404';
    vendor = 'Apex Universal Infra Ltd';
    gstin = '99INVALIDGST000';
    date = '2024-05-22';
    projId = 'MPLAD999';
    amount = '1250000';
    note = 'Intentional Inconsistent Test Bill: Unknown Project ID and Malformed GSTIN';
  } else if (type === 'inconsistent_budget') {
    inv = 'INV/EXC/2024/555';
    vendor = 'Salem Civil & Water Utilities Pvt Ltd';
    gstin = '33AABCS4455E1Z1';
    date = '2024-05-25';
    projId = 'MPLAD003';
    amount = '4500000';
    note = 'Intentional Inconsistent Test Bill: Claim Amount Exceeds Approved Allocation';
  } else if (type === 'duplicate_inv') {
    inv = 'INV/CHE/2024/089';
    vendor = 'Apex Infrastructure & Works Ltd';
    gstin = '33AAACA1122D1Z4';
    date = '2024-03-15';
    projId = 'MPLAD001';
    amount = '1950000';
    note = 'Intentional Inconsistent Test Bill: Duplicate Invoice Number Already Logged';
  }

  if (customValues?.invoiceNumber) inv = customValues.invoiceNumber;
  if (customValues?.vendorName) vendor = customValues.vendorName;
  if (customValues?.gstinPan) gstin = customValues.gstinPan;
  if (customValues?.invoiceDate) date = customValues.invoiceDate;
  if (customValues?.projectId) projId = customValues.projectId;
  if (customValues?.totalAmount) amount = String(customValues.totalAmount);

  // Construct a minimal valid PDF 1.4 document containing readable text streams
  const streamContent = `BT
/F1 14 Tf
50 720 Td
(MPLADS GOVERNMENT WORKS VOUCHER) Tj
/F1 10 Tf
0 -30 Td
(Invoice Number: ${inv}) Tj
0 -20 Td
(Vendor Name: ${vendor}) Tj
0 -20 Td
(GSTIN: ${gstin}) Tj
0 -20 Td
(Invoice Date: ${date}) Tj
0 -20 Td
(Project ID: ${projId}) Tj
0 -20 Td
(Total Amount: ${amount}) Tj
0 -25 Td
(Audit Note: ${note}) Tj
ET`;

  const pdfSource = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length ${streamContent.length} >>
stream
${streamContent}
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000340 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
415
%%EOF`;

  return new Blob([pdfSource], { type: 'application/pdf' });
}

/**
 * Generate a downloadable test invoice image (PNG) using HTML5 Canvas
 */
export function generateTestBillImage(
  type: 'consistent' | 'inconsistent',
  customValues?: Partial<ExtractedBillData>
): Promise<Blob> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 650;
    canvas.height = 420;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      resolve(new Blob([], { type: 'image/png' }));
      return;
    }

    const isClean = type === 'consistent';
    let inv = isClean ? 'INV/VEL/2024/991' : 'INV/MIS/2024/888';
    let vendor = isClean ? 'Vellore Engineering Services' : 'Kongu Infra Developments';
    let gstin = isClean ? '33BBBPB9876C1Z9' : '33AABCK9911P1Z3';
    let date = isClean ? '2024-05-18' : '2024-05-20';
    let projId = isClean ? 'MPLAD002' : 'MPLAD001';
    let amount = isClean ? '₹4,50,000' : '₹85,00,000';
    const title = isClean ? 'TAX INVOICE - VERIFIED VOUCHER' : 'TAX INVOICE - TEST INCONSISTENT CLAIM';

    if (customValues?.invoiceNumber) inv = customValues.invoiceNumber;
    if (customValues?.vendorName) vendor = customValues.vendorName;
    if (customValues?.gstinPan) gstin = customValues.gstinPan;
    if (customValues?.invoiceDate) date = customValues.invoiceDate;
    if (customValues?.projectId) projId = customValues.projectId;
    if (customValues?.totalAmount) amount = `₹${Number(customValues.totalAmount).toLocaleString('en-IN')}`;

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Header bar
    ctx.fillStyle = isClean ? '#1e3a8a' : '#991b1b';
    ctx.fillRect(0, 0, canvas.width, 50);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(title, 20, 32);

    // Border
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

    // Content text
    ctx.fillStyle = '#0f172a';
    ctx.font = '13px sans-serif';

    const fields = [
      ['Invoice Number:', inv],
      ['Vendor Name:', vendor],
      ['GSTIN/PAN:', gstin],
      ['Invoice Date:', date],
      ['Project ID:', projId],
      ['Total Amount:', amount],
    ];

    let y = 90;
    fields.forEach(([label, val]) => {
      ctx.fillStyle = '#475569';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(label, 30, y);

      ctx.fillStyle = '#0f172a';
      ctx.font = '13px monospace';
      ctx.fillText(val, 180, y);

      ctx.strokeStyle = '#f1f5f9';
      ctx.beginPath();
      ctx.moveTo(30, y + 8);
      ctx.lineTo(600, y + 8);
      ctx.stroke();

      y += 40;
    });

    // Footer note
    ctx.fillStyle = isClean ? '#047857' : '#b91c1c';
    ctx.font = 'italic 11px sans-serif';
    ctx.fillText(
      isClean
        ? 'Consistent MPLADS scheme voucher matching authorized vendor and approved allocation.'
        : 'TEST VOUCHER: Identifies potential inconsistency against central project and vendor records.',
      30,
      385
    );

    canvas.toBlob((blob) => {
      resolve(blob || new Blob([], { type: 'image/png' }));
    }, 'image/png');
  });
}
