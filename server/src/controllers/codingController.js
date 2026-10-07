const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const { runAgainstTestCases, executeSingleRun } = require('../services/codeExecutionService');

const codingController = {
  // Run code against sample test cases (immediate test runner)
  runSampleCode: async (req, res) => {
    try {
      const { code, language, questionId, customInput } = req.body;

      if (!code || !language) {
        return res.status(400).json({ error: 'Code and language are required.' });
      }

      if (customInput !== undefined && !questionId) {
        // Run with custom standard input
        const singleResult = await executeSingleRun(language, code, customInput);
        return res.json({
          singleRun: true,
          ...singleResult
        });
      }

      let testCases = [];
      if (questionId) {
        const question = db.prepare('SELECT test_cases FROM coding_questions WHERE id = ?').get(questionId);
        if (question && question.test_cases) {
          const parsed = JSON.parse(question.test_cases);
          // Only run against PUBLIC (non-hidden) test cases during trial runs
          testCases = parsed.filter(tc => !tc.is_hidden);
        }
      }

      if (testCases.length === 0) {
        testCases = [{ input: '', expected_output: '', is_hidden: false }];
      }

      const report = await runAgainstTestCases(language, code, testCases);
      res.json(report);
    } catch (err) {
      console.error('Code run error:', err);
      res.status(500).json({ error: 'Execution failed: ' + err.message });
    }
  },

  // Submit coding solution (evaluates against hidden test cases & awards marks)
  submitCodeSolution: async (req, res) => {
    try {
      const { candidateId, sessionToken, questionId, code, language } = req.body;

      const candidate = db.prepare('SELECT * FROM candidates WHERE id = ?').get(candidateId);
      if (!candidate || candidate.session_token !== sessionToken) {
        return res.status(401).json({ error: 'Unauthorized test session' });
      }

      if (candidate.status !== 'in_progress') {
        return res.status(400).json({ error: 'Test is not active' });
      }

      const question = db.prepare('SELECT * FROM coding_questions WHERE id = ?').get(questionId);
      if (!question) {
        return res.status(404).json({ error: 'Coding question not found' });
      }

      const allTestCases = JSON.parse(question.test_cases || '[]');
      const report = await runAgainstTestCases(language, code, allTestCases);

      const maxMarks = parseFloat(question.marks) || 10.0;
      const score = allTestCases.length > 0
        ? parseFloat(((report.passedCount / allTestCases.length) * maxMarks).toFixed(2))
        : 0;

      const subId = uuidv4();
      db.prepare(`
        INSERT INTO candidate_code_submissions (
          id, candidate_id, coding_question_id, code, language,
          tests_passed, total_tests, score, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(candidate_id, coding_question_id) DO UPDATE SET
          code = excluded.code,
          language = excluded.language,
          tests_passed = excluded.tests_passed,
          total_tests = excluded.total_tests,
          score = excluded.score,
          updated_at = CURRENT_TIMESTAMP
      `).run(subId, candidateId, questionId, code, language, report.passedCount, allTestCases.length, score);

      res.json({
        success: true,
        testsPassed: report.passedCount,
        totalTests: allTestCases.length,
        allPassed: report.allPassed,
        score,
        maxMarks,
        results: report.results
      });
    } catch (err) {
      console.error('Code submission error:', err);
      res.status(500).json({ error: 'Submission failed: ' + err.message });
    }
  },

  // Fetch coding questions for candidate (hides hidden test case inputs/outputs)
  getCodingQuestionsForExam: (req, res) => {
    try {
      const { examId } = req.params;
      const questions = db.prepare(`
        SELECT id, question_number, title, description, difficulty,
               starter_code_py, starter_code_js, test_cases, marks
        FROM coding_questions
        WHERE exam_id = ?
        ORDER BY question_number ASC
      `).all(examId);

      const safeQuestions = questions.map(q => {
        let testCases = [];
        try {
          testCases = JSON.parse(q.test_cases);
        } catch (e) {}

        // Strip hidden test case details
        const sampleTestCases = testCases
          .filter(tc => !tc.is_hidden)
          .map((tc, idx) => ({
            id: idx + 1,
            input: tc.input,
            expected_output: tc.expected_output
          }));

        return {
          id: q.id,
          question_number: q.question_number,
          title: q.title,
          description: q.description,
          difficulty: q.difficulty,
          starter_code_py: q.starter_code_py || '# Write your Python code here\n',
          starter_code_js: q.starter_code_js || '// Write your JavaScript code here\n',
          marks: q.marks,
          sampleTestCases,
          totalTestCasesCount: testCases.length
        };
      });

      res.json(safeQuestions);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
};

module.exports = codingController;
