const db = require('../config/db');

const adminController = {
  // Get comprehensive exam analytics
  getExamAnalytics: (req, res) => {
    try {
      const { examId } = req.params;

      const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(examId);
      if (!exam) return res.status(404).json({ error: 'Exam not found' });

      const totalCandidates = db.prepare('SELECT COUNT(*) as count FROM candidates WHERE exam_id = ?').get(examId).count;
      const completedCandidates = db.prepare("SELECT COUNT(*) as count FROM candidates WHERE exam_id = ? AND status = 'submitted'").get(examId).count;
      const inProgressCandidates = db.prepare("SELECT COUNT(*) as count FROM candidates WHERE exam_id = ? AND status = 'in_progress'").get(examId).count;
      const disqualifiedCandidates = db.prepare("SELECT COUNT(*) as count FROM candidates WHERE exam_id = ? AND status = 'disqualified'").get(examId).count;

      const scoreStats = db.prepare(`
        SELECT 
          AVG(score) as avg_score,
          MAX(score) as max_score,
          MIN(score) as min_score,
          SUM(passed) as passed_count
        FROM candidates 
        WHERE exam_id = ? AND status = 'submitted'
      `).get(examId);

      const topPerformers = db.prepare(`
        SELECT id, full_name, roll_number, email, department, score, total_marks, percentage, violation_count
        FROM candidates
        WHERE exam_id = ? AND status = 'submitted'
        ORDER BY score DESC, submitted_at ASC
        LIMIT 10
      `).all(examId);

      const recentViolations = db.prepare(`
        SELECT v.*, c.full_name, c.roll_number
        FROM violations v
        JOIN candidates c ON v.candidate_id = c.id
        WHERE v.exam_id = ?
        ORDER BY v.timestamp DESC
        LIMIT 20
      `).all(examId);

      res.json({
        exam,
        stats: {
          totalCandidates,
          completedCandidates,
          inProgressCandidates,
          disqualifiedCandidates,
          avgScore: scoreStats && scoreStats.avg_score ? parseFloat(scoreStats.avg_score.toFixed(2)) : 0,
          maxScore: scoreStats ? scoreStats.max_score || 0 : 0,
          minScore: scoreStats ? scoreStats.min_score || 0 : 0,
          passedCount: scoreStats ? scoreStats.passed_count || 0 : 0,
          passPercentage: completedCandidates > 0 ? parseFloat(((scoreStats.passed_count / completedCandidates) * 100).toFixed(1)) : 0
        },
        topPerformers,
        recentViolations
      });
    } catch (err) {
      console.error('Analytics error:', err);
      res.status(500).json({ error: 'Failed to fetch exam analytics.' });
    }
  },

  // Get list of all candidates for an exam with filter and sorting
  getCandidatesList: (req, res) => {
    try {
      const { examId } = req.params;
      const candidates = db.prepare(`
        SELECT 
          id, full_name, roll_number, email, phone, department, batch,
          status, started_at, submitted_at, score, total_marks, percentage,
          passed, violation_count
        FROM candidates
        WHERE exam_id = ?
        ORDER BY score DESC, submitted_at ASC
      `).all(examId);

      res.json(candidates);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  // Export candidate results to CSV
  exportResultsCsv: (req, res) => {
    try {
      const { examId } = req.params;
      const exam = db.prepare('SELECT title, company_name FROM exams WHERE id = ?').get(examId);
      if (!exam) return res.status(404).json({ error: 'Exam not found' });

      const candidates = db.prepare(`
        SELECT 
          roll_number, full_name, email, phone, department, batch,
          status, score, total_marks, percentage, passed, violation_count,
          started_at, submitted_at
        FROM candidates
        WHERE exam_id = ?
        ORDER BY score DESC, submitted_at ASC
      `).all(examId);

      // Create CSV content
      const headers = [
        'Rank',
        'Roll Number',
        'Full Name',
        'Email',
        'Department',
        'Batch',
        'Status',
        'Score Obtained',
        'Total Marks',
        'Percentage (%)',
        'Result',
        'Violations',
        'Test Started At',
        'Test Submitted At'
      ];

      const csvRows = [headers.join(',')];

      candidates.forEach((c, index) => {
        const row = [
          c.status === 'submitted' ? index + 1 : 'N/A',
          `"${(c.roll_number || '').replace(/"/g, '""')}"`,
          `"${(c.full_name || '').replace(/"/g, '""')}"`,
          `"${(c.email || '').replace(/"/g, '""')}"`,
          `"${(c.department || '').replace(/"/g, '""')}"`,
          `"${(c.batch || '').replace(/"/g, '""')}"`,
          c.status,
          c.score !== null ? c.score : 0,
          c.total_marks !== null ? c.total_marks : 0,
          c.percentage !== null ? c.percentage : 0,
          c.status === 'submitted' ? (c.passed ? 'PASSED' : 'FAILED') : c.status.toUpperCase(),
          c.violation_count || 0,
          `"${c.started_at || ''}"`,
          `"${c.submitted_at || ''}"`
        ];
        csvRows.push(row.join(','));
      });

      const csvString = csvRows.join('\r\n');
      const safeExamName = (exam.title || 'Exam').replace(/[^a-zA-Z0-9_-]/g, '_');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${safeExamName}_Results.csv"`);
      res.status(200).send(csvString);
    } catch (err) {
      console.error('CSV export error:', err);
      res.status(500).json({ error: 'Failed to export CSV.' });
    }
  }
};

module.exports = adminController;
