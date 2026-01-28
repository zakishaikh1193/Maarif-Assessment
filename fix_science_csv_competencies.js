/**
 * Fix Science (or any) question CSV: change Competencies from space-separated
 * to comma-separated inside quotes so the backend can resolve each code.
 *
 * Usage: node fix_science_csv_competencies.js <path-to-your-science.csv>
 * Output: writes <path-to-your-science.csv>_fixed.csv
 *
 * Also fix Row 7: if the question "Students tested signals..." has empty
 * optionA–optionD, add placeholder options (edit the script or the output file).
 */

const fs = require('fs');
const path = require('path');

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
      current += c;
    } else if (inQuotes) {
      current += c;
    } else if (c === ',') {
      result.push(current);
      current = '';
    } else {
      current += c;
    }
  }
  result.push(current);
  return result;
}

function escapeCSVField(val) {
  if (val == null) return '""';
  const s = String(val).trim();
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s ? `"${s}"` : '""';
}

function fixCompetenciesValue(val) {
  if (!val || typeof val !== 'string') return val;
  const trimmed = val.trim().replace(/^"|"$/g, '');
  if (!trimmed) return val;
  // Already comma-separated (and possibly quoted) – leave as-is but ensure format
  if (trimmed.includes(',')) {
    const codes = trimmed.split(',').map(c => c.trim()).filter(Boolean);
    return codes.join(', ');
  }
  // Space-separated codes (e.g. "NGSS.SEP.1 NGSS.DCI.PS4 NGSS.CCC.5")
  const codes = trimmed.split(/\s+/).map(c => c.trim()).filter(Boolean);
  if (codes.length <= 1) return val;
  return codes.join(', ');
}

function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error('Usage: node fix_science_csv_competencies.js <path-to-science.csv>');
    process.exit(1);
  }
  const absolutePath = path.resolve(inputPath);
  if (!fs.existsSync(absolutePath)) {
    console.error('File not found:', absolutePath);
    process.exit(1);
  }

  const content = fs.readFileSync(absolutePath, 'utf8');
  const lines = content.split(/\r?\n/);
  if (lines.length < 2) {
    console.error('CSV has no data rows');
    process.exit(1);
  }

  const headerLine = lines[0];
  const header = parseCSVLine(headerLine).map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());
  const compIndex = header.findIndex(h => h === 'competencies' || h === 'competencycodes');
  if (compIndex < 0) {
    console.error('No "Competencies" column found. Headers:', header.join(', '));
    process.exit(1);
  }

  const outLines = [headerLine];
  let fixedCount = 0;
  let row7MissingOptions = false;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) {
      outLines.push(line);
      continue;
    }
    const fields = parseCSVLine(line);
    if (fields.length <= compIndex) {
      outLines.push(line);
      continue;
    }

    const oldVal = fields[compIndex].replace(/^"|"$/g, '').trim();
    const newVal = fixCompetenciesValue(oldVal);
    if (newVal !== oldVal) {
      fields[compIndex] = newVal.includes(',') ? `"${newVal}"` : newVal;
      fixedCount++;
    } else if (oldVal && !oldVal.includes(',') && oldVal.includes(' ')) {
      const joined = oldVal.split(/\s+/).map(c => c.trim()).filter(Boolean).join(', ');
      if (joined !== oldVal) {
        fields[compIndex] = `"${joined}"`;
        fixedCount++;
      }
    }

    // Row 7 (1-based) = index 7: check for "Students tested signals" with empty options
    if (i === 6) {
      const questionText = (fields[2] || '').replace(/^"|"$/g, '');
      const optA = (fields[5] || '').trim();
      const optB = (fields[6] || '').trim();
      const optC = (fields[7] || '').trim();
      const optD = (fields[8] || '').trim();
      if (questionText.includes('Students tested signals') && (!optA || !optB || !optC || !optD)) {
        row7MissingOptions = true;
        // Add placeholder options so the row imports; user can edit later
        if (!optA) fields[5] = 'Flashlight';
        if (!optB) fields[6] = 'Clap';
        if (!optC) fields[7] = 'Whistle';
        if (!optD) fields[8] = 'All same';
      }
    }

    outLines.push(fields.map((f) => {
      let v = f.replace(/^"|"$/g, '').replace(/""/g, '"');
      if (v.includes(',') || v.includes('"') || v.includes('\n')) return `"${v.replace(/"/g, '""')}"`;
      return v;
    }).join(','));
  }

  const outPath = absolutePath.replace(/\.csv$/i, '_fixed.csv');
  fs.writeFileSync(outPath, outLines.join('\n'), 'utf8');
  console.log('Wrote:', outPath);
  console.log('Competencies cells fixed (space -> comma-separated):', fixedCount);
  if (row7MissingOptions) {
    console.log('Row 7: Added placeholder options for "Students tested signals...". Edit the file to set correct optionA–optionD if needed.');
  }
}

main();
