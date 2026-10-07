const fs = require('fs');

/**
 * Robust, state-machine based Question Paper parser.
 * Accurately extracts questions, options, answers, sections, and explanations.
 */
async function parsePdfQuestionPaper(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  let text = '';
  let pageCount = 1;

  try {
    const pdfModule = require('pdf-parse');
    if (typeof pdfModule === 'function') {
      // Classic pdf-parse v1
      const data = await pdfModule(fileBuffer);
      text = data.text || '';
      pageCount = data.numpages || 1;
    } else if (pdfModule && pdfModule.PDFParse) {
      // Modern pdf-parse v2+
      const uint8Array = new Uint8Array(fileBuffer);
      const parser = new pdfModule.PDFParse(uint8Array);
      await parser.load();
      const result = await parser.getText();
      text = result.text || (typeof result === 'string' ? result : '');
      pageCount = result.total || (result.pages ? result.pages.length : 1);
      await parser.destroy();
    } else {
      throw new Error('Unsupported pdf-parse module format');
    }
  } catch (err) {
    console.error('PDF parsing library error, falling back:', err.message);
    throw new Error('Unable to extract text from PDF: ' + err.message);
  }

  const parsed = extractQuestions(text);
  return {
    rawText: text,
    pageCount,
    title: parsed.title,
    sections: parsed.sections,
    questions: parsed.questions
  };
}

function extractQuestions(rawText) {
  const lines = rawText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);

  let detectedTitle = 'Campus Placement Assessment';
  for (let i = 0; i < Math.min(6, lines.length); i++) {
    const l = lines[i];
    if (l.length > 5 && !l.match(/^(page|duration|marks|confidential|confidentiality|test|time)/i)) {
      detectedTitle = l;
      break;
    }
  }

  // Extract answer key table if present at bottom
  const answerKeyMap = extractAnswerKeyMap(rawText);

  const questions = [];
  let currentQ = null;
  let currentSection = 'General Aptitude';
  let currentOptionKey = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect Section Header
    const sectionMatch = line.match(/^(?:SECTION|PART)\s*([A-Z0-9\s&:-]+)/i);
    if (sectionMatch && line.length < 60) {
      currentSection = line.trim();
      continue;
    }

    // Stop if reaching Answer Key Summary section
    if (line.match(/^ANSWER\s*KEY/i)) {
      if (currentQ) {
        questions.push(finalizeQuestion(currentQ, answerKeyMap));
        currentQ = null;
      }
      break;
    }

    // Check Question Start: "1. What is..." or "Q1. What is..." or "Question 1: What is..."
    const qMatch = line.match(/^(?:Q(?:uestion)?\.?\s*(\d+)[\.:\)]|(\d+)[\.:\)])\s*(.*)/i);
    if (qMatch) {
      if (currentQ) {
        questions.push(finalizeQuestion(currentQ, answerKeyMap));
      }

      const qNum = parseInt(qMatch[1] || qMatch[2], 10);
      const initialText = (qMatch[3] || '').trim();

      currentQ = {
        question_number: qNum,
        section: currentSection,
        question_text: initialText,
        option_a: '',
        option_b: '',
        option_c: '',
        option_d: '',
        correct_option: '',
        explanation: '',
        marks: 1.0
      };
      currentOptionKey = null;
      continue;
    }

    if (!currentQ) continue;

    // Check Answer line: "Answer: B" or "Ans: C" or "Correct: (A)"
    const ansMatch = line.match(/(?:^|\s)(?:Answer|Ans|Correct\s*(?:Option|Answer)?)\s*[:=\-]\s*[\(\[]?([A-Da-d])[\)\]]?/i);
    if (ansMatch) {
      currentQ.correct_option = ansMatch[1].toUpperCase();

      // Check if explanation is on the same line: "Answer: B | Explanation..."
      const expInline = line.match(/(?:Explanation|Solution|Exp)[:=\|\-]\s*(.*)/i);
      if (expInline) {
        currentQ.explanation = expInline[1].trim();
      }
      currentOptionKey = null;
      continue;
    }

    // Check Explanation line
    const expMatch = line.match(/^(?:Explanation|Solution)\s*[:=\-]\s*(.*)/i);
    if (expMatch) {
      currentQ.explanation = expMatch[1].trim();
      currentOptionKey = null;
      continue;
    }

    // Check Option lines: "(A) ...", "A. ...", "A) ...", "[A] ..."
    const multiOptMatches = [...line.matchAll(/[\(\[]?([A-Da-d])[\.\)\]]\s*([^(\[]+?)(?=(?:[\(\[]?[A-Da-d][\.\)\]])|$)/g)];
    if (multiOptMatches.length > 0) {
      for (const m of multiOptMatches) {
        const letter = m[1].toUpperCase();
        const text = m[2].trim();
        const key = `option_${letter.toLowerCase()}`;
        if (currentQ[key] !== undefined) {
          currentQ[key] = text;
        }
      }
      currentOptionKey = null;
      continue;
    }

    // Single option line e.g. "A. Option content"
    const singleOptMatch = line.match(/^[\(\[]?([A-Da-d])[\.\)\]]\s*(.*)/i);
    if (singleOptMatch) {
      const letter = singleOptMatch[1].toUpperCase();
      currentOptionKey = `option_${letter.toLowerCase()}`;
      currentQ[currentOptionKey] = singleOptMatch[2].trim();
      continue;
    }

    // Continuation line
    if (currentOptionKey) {
      currentQ[currentOptionKey] += ' ' + line.trim();
    } else if (!currentQ.option_a) {
      currentQ.question_text += (currentQ.question_text ? ' ' : '') + line.trim();
    }
  }

  if (currentQ) {
    questions.push(finalizeQuestion(currentQ, answerKeyMap));
  }

  const sections = [...new Set(questions.map(q => q.section))];

  return {
    title: detectedTitle,
    sections,
    questions
  };
}

function finalizeQuestion(q, answerKeyMap) {
  if (!q.correct_option && answerKeyMap[q.question_number]) {
    q.correct_option = answerKeyMap[q.question_number];
  }

  q.option_a = q.option_a || 'Option A';
  q.option_b = q.option_b || 'Option B';
  q.option_c = q.option_c || 'Option C';
  q.option_d = q.option_d || 'Option D';
  q.correct_option = (q.correct_option || 'A').toUpperCase();

  return q;
}

function extractAnswerKeyMap(text) {
  const map = {};
  const match = text.match(/(?:ANSWER\s*KEY|ANSWERS:?)([\s\S]*)$/i);
  if (!match) return map;

  const section = match[1];
  const itemRegex = /(\d+)\s*[:\.\)\-]\s*[\(\[]?([A-Da-d])[\)\]]?/g;
  let item;
  while ((item = itemRegex.exec(section)) !== null) {
    map[parseInt(item[1], 10)] = item[2].toUpperCase();
  }
  return map;
}

module.exports = {
  parsePdfQuestionPaper
};
