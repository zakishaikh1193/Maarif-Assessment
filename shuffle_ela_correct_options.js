/**
 * Shuffle option order (A,B,C,D) per row and update correctAnswers so correct options are random (B,C / A,D / C,D etc).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

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

function escapeCSV(val) {
  if (val == null) return '';
  const s = String(val).trim();
  if (s.includes(',') || s.includes('"') || s.includes('\n')) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

const filePath = path.join(__dirname, 'question_import_english_multiple_select_120.csv');
let content = fs.readFileSync(filePath, 'utf8');
const lines = content.split(/\r?\n/);
const header = lines[0];
const out = [header];

for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  if (!line.trim()) {
    out.push(line);
    continue;
  }
  const cols = parseCSVLine(line);
  if (cols.length < 10) {
    out.push(line);
    continue;
  }
  // Subject,Grade,QuestionText,Description,questionType,optionA,optionB,optionC,optionD,correctAnswers,difficultyLevel,dokLevel,standard,contentFocus,Competencies
  // 0      1    2            3          4            5       6       7       8       9              10              11       12        13            14
  const optionA = cols[5].replace(/^"|"$/g, '').replace(/""/g, '"');
  const optionB = cols[6].replace(/^"|"$/g, '').replace(/""/g, '"');
  const optionC = cols[7].replace(/^"|"$/g, '').replace(/""/g, '"');
  const optionD = cols[8].replace(/^"|"$/g, '').replace(/""/g, '"');
  let correctStr = (cols[9] || '').replace(/^"|"$/g, '').trim();
  const oldOpts = [optionA, optionB, optionC, optionD];

  const correctIndices = [];
  const m = correctStr.match(/\[([A-D,]+)\]/i);
  if (m) {
    m[1].split(',').forEach(s => {
      const t = s.trim().toUpperCase();
      if (t === 'A') correctIndices.push(0);
      else if (t === 'B') correctIndices.push(1);
      else if (t === 'C') correctIndices.push(2);
      else if (t === 'D') correctIndices.push(3);
    });
  }

  const perm = shuffle([0, 1, 2, 3]);
  const newOpts = [oldOpts[perm[0]], oldOpts[perm[1]], oldOpts[perm[2]], oldOpts[perm[3]]];
  const newCorrectIndices = correctIndices.map(c => perm.indexOf(c)).sort((a, b) => a - b);
  const newCorrectLetters = newCorrectIndices.map(idx => 'ABCD'[idx]);
  const newCorrectStr = '[' + newCorrectLetters.join(',') + ']';

  cols[5] = escapeCSV(newOpts[0]);
  cols[6] = escapeCSV(newOpts[1]);
  cols[7] = escapeCSV(newOpts[2]);
  cols[8] = escapeCSV(newOpts[3]);
  cols[9] = '"' + newCorrectStr + '"';

  out.push(cols.join(','));
}

fs.writeFileSync(filePath, out.join('\n'), 'utf8');
console.log('Done. Shuffled options and correctAnswers for', out.length - 1, 'rows.');
