const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

function generateExamSlug(companyName = 'EXAM') {
  const cleanPrefix = companyName.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'EXAM';
  const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `${cleanPrefix}-${randomSuffix}`;
}

const examController = {
  createExam: (req, res) => {
    try {
      const {
        title,
        description,
        company_name,
        duration_minutes,
        pass_percentage,
        negative_marking,
        instructions,
        access_code,
        proctoring_enabled,
        max_violations,
        show_result_immediately,
        ip_restriction_enabled,
        allowed_ip_range,
        start_time,
        end_time,
        entry_interval_start,
        entry_interval_end,
        camera_mandatory,
        camera_grace_period_seconds,
        one_time_link_enforced,
        questions,
        coding_questions
      } = req.body;

      if (!title || ((!questions || questions.length === 0) && (!coding_questions || coding_questions.length === 0))) {
        return res.status(400).json({ error: 'Title and at least one question (MCQ or Coding) are required.' });
      }

      const examId = generateExamSlug(company_name || 'EXAM');
      let totalMarks = 0;
      if (Array.isArray(questions)) {
        totalMarks += questions.reduce((sum, q) => sum + (parseFloat(q.marks) || 1.0), 0);
      }
      if (Array.isArray(coding_questions)) {
        totalMarks += coding_questions.reduce((sum, q) => sum + (parseFloat(q.marks) || 10.0), 0);
      }

      const insertExam = db.prepare(`
        INSERT INTO exams (
          id, title, description, company_name, duration_minutes,
          total_marks, pass_percentage, negative_marking, instructions,
          access_code, proctoring_enabled, max_violations, show_result_immediately,
          ip_restriction_enabled, allowed_ip_range,
          start_time, end_time, entry_interval_start, entry_interval_end,
          camera_mandatory, camera_grace_period_seconds, one_time_link_enforced
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const insertQuestion = db.prepare(`
        INSERT INTO questions (
          id, exam_id, question_number, section, question_text,
          option_a, option_b, option_c, option_d, correct_option,
          marks, explanation
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const insertCodingQuestion = db.prepare(`
        INSERT INTO coding_questions (
          id, exam_id, question_number, title, description,
          difficulty, starter_code_py, starter_code_js, test_cases, marks
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const createTransaction = db.transaction(() => {
        insertExam.run(
          examId,
          title,
          description || '',
          company_name || 'Campus Drive',
          parseInt(duration_minutes, 10) || 30,
          totalMarks,
          parseFloat(pass_percentage) || 50.0,
          parseFloat(negative_marking) || 0.0,
          instructions || 'Read all questions carefully. Do not switch tabs.',
          access_code ? access_code.trim() : null,
          proctoring_enabled === false ? 0 : 1,
          parseInt(max_violations, 10) || 3,
          show_result_immediately === false ? 0 : 1,
          ip_restriction_enabled ? 1 : 0,
          allowed_ip_range || '',
          start_time || null,
          end_time || null,
          entry_interval_start || null,
          entry_interval_end || null,
          camera_mandatory === false ? 0 : 1,
          parseInt(camera_grace_period_seconds, 10) || 20,
          one_time_link_enforced === false ? 0 : 1
        );

        if (Array.isArray(questions)) {
          questions.forEach((q, index) => {
            insertQuestion.run(
              uuidv4(),
              examId,
              q.question_number || (index + 1),
              q.section || 'General',
              q.question_text,
              q.option_a || 'Option A',
              q.option_b || 'Option B',
              q.option_c || 'Option C',
              q.option_d || 'Option D',
              (q.correct_option || 'A').toUpperCase(),
              parseFloat(q.marks) || 1.0,
              q.explanation || ''
            );
          });
        }

        if (Array.isArray(coding_questions)) {
          coding_questions.forEach((cq, index) => {
            insertCodingQuestion.run(
              uuidv4(),
              examId,
              cq.question_number || (index + 1),
              cq.title || `Coding Challenge ${index + 1}`,
              cq.description || '',
              cq.difficulty || 'Medium',
              cq.starter_code_py || 'def solve():\n    # Write Python code here\n    pass\n',
              cq.starter_code_js || 'function solve() {\n    // Write JavaScript code here\n}\n',
              JSON.stringify(cq.test_cases || []),
              parseFloat(cq.marks) || 10.0
            );
          });
        }
      });

      createTransaction();

      res.status(201).json({
        message: 'Exam created successfully',
        examId,
        link: `/exam/${examId}`
      });
    } catch (err) {
      console.error('Error creating exam:', err);
      res.status(500).json({ error: 'Failed to create exam: ' + err.message });
    }
  },

  getExamForCandidate: (req, res) => {
    try {
      const { examId } = req.params;
      const exam = db.prepare('SELECT id, title, description, company_name, duration_minutes, total_marks, pass_percentage, negative_marking, instructions, access_code, proctoring_enabled, max_violations, is_active, ip_restriction_enabled, allowed_ip_range FROM exams WHERE id = ?').get(examId);

      if (!exam) {
        return res.status(404).json({ error: 'Exam not found or link has expired.' });
      }

      if (!exam.is_active) {
        return res.status(403).json({ error: 'This exam has been closed by the placement coordinator.' });
      }

      const questionCount = db.prepare('SELECT COUNT(*) as count FROM questions WHERE exam_id = ?').get(examId).count;
      const codingQuestionCount = db.prepare('SELECT COUNT(*) as count FROM coding_questions WHERE exam_id = ?').get(examId).count;

      res.json({
        ...exam,
        requires_access_code: Boolean(exam.access_code),
        access_code: undefined,
        questionCount,
        codingQuestionCount,
        hasCodingQuestions: codingQuestionCount > 0
      });
    } catch (err) {
      console.error('Error fetching exam for candidate:', err);
      res.status(500).json({ error: 'Failed to retrieve exam.' });
    }
  },

  getExamAdmin: (req, res) => {
    try {
      const { examId } = req.params;
      const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(examId);

      if (!exam) {
        return res.status(404).json({ error: 'Exam not found.' });
      }

      const questions = db.prepare('SELECT * FROM questions WHERE exam_id = ? ORDER BY question_number ASC').all(examId);
      const codingQuestions = db.prepare('SELECT * FROM coding_questions WHERE exam_id = ? ORDER BY question_number ASC').all(examId);

      const candidateStats = db.prepare(`
        SELECT 
          COUNT(*) as total_candidates,
          SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) as submitted_count,
          SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_count,
          AVG(CASE WHEN status = 'submitted' THEN score ELSE NULL END) as average_score
        FROM candidates WHERE exam_id = ?
      `).get(examId);

      res.json({
        exam,
        questions,
        codingQuestions,
        stats: candidateStats
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to retrieve exam details.' });
    }
  },

  getAllExams: (req, res) => {
    try {
      const exams = db.prepare(`
        SELECT 
          e.*,
          (SELECT COUNT(*) FROM questions q WHERE q.exam_id = e.id) as question_count,
          (SELECT COUNT(*) FROM coding_questions cq WHERE cq.exam_id = e.id) as coding_question_count,
          (SELECT COUNT(*) FROM candidates c WHERE c.exam_id = e.id) as candidate_count,
          (SELECT COUNT(*) FROM candidates c WHERE c.exam_id = e.id AND c.status = 'submitted') as completed_count
        FROM exams e
        ORDER BY e.created_at DESC
      `).all();

      res.json(exams);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch exams.' });
    }
  },

  toggleExamStatus: (req, res) => {
    try {
      const { examId } = req.params;
      const exam = db.prepare('SELECT is_active FROM exams WHERE id = ?').get(examId);
      if (!exam) return res.status(404).json({ error: 'Exam not found' });

      const newStatus = exam.is_active ? 0 : 1;
      db.prepare('UPDATE exams SET is_active = ? WHERE id = ?').run(newStatus, examId);

      res.json({ message: 'Exam status updated', is_active: newStatus });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  deleteExam: (req, res) => {
    try {
      const { examId } = req.params;
      db.prepare('DELETE FROM exams WHERE id = ?').run(examId);
      res.json({ message: 'Exam deleted successfully.' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
};

module.exports = examController;
