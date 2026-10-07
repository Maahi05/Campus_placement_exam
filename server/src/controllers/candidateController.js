const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const { evaluateExamAccess } = require('../services/accessControllerService');
const { runOpenCVAnalysis } = require('../services/opencvProctorService');

const candidateController = {
  // Real-Time Access Controller Endpoint (ALLOW, WAIT, BLOCK)
  validateAccess: (req, res) => {
    try {
      const { examId } = req.params;
      const { rollNumber, email, sessionToken } = req.query;

      const rawIp = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || '127.0.0.1';
      let clientIp = rawIp.replace('::ffff:', '');
      if (clientIp === '::1') clientIp = '127.0.0.1';

      const assessment = evaluateExamAccess({
        examId,
        rollNumber,
        email,
        sessionToken,
        clientIp
      });

      res.json(assessment);
    } catch (err) {
      console.error('Access Controller Error:', err);
      res.status(500).json({ decision: 'BLOCK', reason: 'Internal error verifying access: ' + err.message });
    }
  },

  // Candidate Registration with Pre-Flight Access Validation
  registerCandidate: (req, res) => {
    try {
      const { examId } = req.params;
      const { fullName, rollNumber, email, phone, department, batch, accessCode, cameraVerified } = req.body;

      const rawIp = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || '127.0.0.1';
      let clientIp = rawIp.replace('::ffff:', '');
      if (clientIp === '::1') clientIp = '127.0.0.1';

      // 1. Evaluate access with Server Clock pipeline
      const accessCheck = evaluateExamAccess({
        examId,
        rollNumber,
        email,
        clientIp
      });

      if (accessCheck.decision !== 'ALLOW') {
        return res.status(403).json({
          error: accessCheck.reason,
          decision: accessCheck.decision,
          code: accessCheck.code
        });
      }

      const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(examId);

      // 2. Camera permission mandatory enforcement
      if (exam.camera_mandatory && !cameraVerified) {
        return res.status(400).json({
          error: 'Camera permission and pre-flight video verification are required before you can start this exam.',
          cameraRequired: true
        });
      }

      // 3. Access code validation
      if (exam.access_code && exam.access_code !== accessCode) {
        return res.status(401).json({ error: 'Invalid access code for this exam.' });
      }

      const cleanRollNumber = rollNumber.trim().toUpperCase();
      const cleanEmail = email.trim().toLowerCase();

      // Check if existing candidate is resuming their own session
      const existingCandidate = db.prepare(`
        SELECT * FROM candidates 
        WHERE exam_id = ? AND (roll_number = ? OR email = ?)
      `).get(examId, cleanRollNumber, cleanEmail);

      if (existingCandidate) {
        if (existingCandidate.status === 'submitted') {
          return res.status(400).json({
            error: 'You have already submitted this exam. Multiple submissions are not allowed.',
            submitted: true,
            candidateId: existingCandidate.id
          });
        }
        if (existingCandidate.status === 'disqualified') {
          return res.status(403).json({
            error: 'You were disqualified from this exam due to proctoring rule violations.',
            disqualified: true
          });
        }

        // Return existing active session
        return res.json({
          message: 'Resuming test session',
          candidateId: existingCandidate.id,
          sessionToken: existingCandidate.session_token,
          exam: {
            id: exam.id,
            title: exam.title,
            company_name: exam.company_name,
            duration_minutes: exam.duration_minutes,
            proctoring_enabled: Boolean(exam.proctoring_enabled),
            max_violations: exam.max_violations,
            cameraGracePeriodSeconds: exam.camera_grace_period_seconds || 20
          }
        });
      }

      // Create new candidate session
      const candidateId = uuidv4();
      const sessionToken = uuidv4();

      db.prepare(`
        INSERT INTO candidates (
          id, exam_id, full_name, roll_number, email, phone,
          department, batch, status, session_token, client_ip,
          one_time_token, link_used, last_heartbeat
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'registered', ?, ?, ?, 1, CURRENT_TIMESTAMP)
      `).run(
        candidateId,
        examId,
        fullName.trim(),
        cleanRollNumber,
        cleanEmail,
        phone || '',
        department || 'General',
        batch || '2026',
        sessionToken,
        clientIp,
        sessionToken
      );

      res.status(201).json({
        message: 'Registration successful',
        candidateId,
        sessionToken,
        exam: {
          id: exam.id,
          title: exam.title,
          company_name: exam.company_name,
          duration_minutes: exam.duration_minutes,
          proctoring_enabled: Boolean(exam.proctoring_enabled),
          max_violations: exam.max_violations,
          cameraGracePeriodSeconds: exam.camera_grace_period_seconds || 20
        }
      });
    } catch (err) {
      console.error('Candidate registration error:', err);
      res.status(500).json({ error: 'Failed to register candidate.' });
    }
  },

  // Start exam & return questions + coding challenges
  startExam: (req, res) => {
    try {
      const { candidateId } = req.params;
      const { sessionToken } = req.body;

      const candidate = db.prepare('SELECT * FROM candidates WHERE id = ?').get(candidateId);
      if (!candidate || candidate.session_token !== sessionToken) {
        return res.status(401).json({ error: 'Unauthorized session.' });
      }

      const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(candidate.exam_id);
      if (!exam || !exam.is_active) {
        return res.status(403).json({ error: 'This exam is inactive or ended.' });
      }

      if (candidate.status === 'submitted') {
        return res.status(400).json({ error: 'Exam has already been submitted.' });
      }

      if (candidate.status === 'disqualified') {
        return res.status(403).json({ error: 'Candidate has been disqualified.' });
      }

      let startedAt = candidate.started_at;
      if (!startedAt) {
        startedAt = new Date().toISOString();
        db.prepare(`
          UPDATE candidates SET status = 'in_progress', started_at = ?, last_heartbeat = CURRENT_TIMESTAMP WHERE id = ?
        `).run(startedAt, candidateId);
      }

      const startTime = new Date(startedAt).getTime();
      const now = Date.now();
      const elapsedSeconds = Math.floor((now - startTime) / 1000);
      const totalAllowedSeconds = exam.duration_minutes * 60;
      let remainingSeconds = totalAllowedSeconds - elapsedSeconds;

      if (remainingSeconds <= 0) {
        candidateController.autoSubmitExpiredCandidate(candidateId);
        return res.status(400).json({ error: 'Time limit expired. Your exam has been automatically submitted.', timeExpired: true });
      }

      // Fetch questions (without answers)
      const questions = db.prepare(`
        SELECT id, question_number, section, question_text,
               option_a, option_b, option_c, option_d, marks
        FROM questions
        WHERE exam_id = ?
        ORDER BY question_number ASC
      `).all(exam.id);

      // Fetch coding challenges
      const rawCoding = db.prepare(`
        SELECT id, question_number, title, description, difficulty,
               starter_code_py, starter_code_js, test_cases, marks
        FROM coding_questions
        WHERE exam_id = ?
        ORDER BY question_number ASC
      `).all(exam.id);

      const codingQuestions = rawCoding.map(cq => {
        let testCases = [];
        try { testCases = JSON.parse(cq.test_cases); } catch (e) {}

        const sampleTestCases = testCases
          .filter(tc => !tc.is_hidden)
          .map((tc, idx) => ({
            id: idx + 1,
            input: tc.input,
            expected_output: tc.expected_output
          }));

        return {
          id: cq.id,
          question_number: cq.question_number,
          title: cq.title,
          description: cq.description,
          difficulty: cq.difficulty,
          starter_code_py: cq.starter_code_py,
          starter_code_js: cq.starter_code_js,
          marks: cq.marks,
          sampleTestCases,
          totalTestCasesCount: testCases.length
        };
      });

      // Fetch saved MCQ answers
      const savedAnswers = db.prepare(`
        SELECT question_id, selected_option, status
        FROM candidate_answers
        WHERE candidate_id = ?
      `).all(candidateId);

      const answersMap = {};
      savedAnswers.forEach(ans => {
        answersMap[ans.question_id] = {
          selected_option: ans.selected_option,
          status: ans.status
        };
      });

      // Fetch saved coding submissions
      const savedCodingSubmissions = db.prepare(`
        SELECT coding_question_id, code, language, tests_passed, total_tests, score
        FROM candidate_code_submissions
        WHERE candidate_id = ?
      `).all(candidateId);

      const codingMap = {};
      savedCodingSubmissions.forEach(sub => {
        codingMap[sub.coding_question_id] = {
          code: sub.code,
          language: sub.language,
          tests_passed: sub.tests_passed,
          total_tests: sub.total_tests,
          score: sub.score
        };
      });

      res.json({
        candidate: {
          id: candidate.id,
          fullName: candidate.full_name,
          rollNumber: candidate.roll_number,
          email: candidate.email,
          violationCount: candidate.violation_count
        },
        exam: {
          id: exam.id,
          title: exam.title,
          companyName: exam.company_name,
          durationMinutes: exam.duration_minutes,
          totalQuestions: questions.length,
          totalCodingQuestions: codingQuestions.length,
          proctoringEnabled: Boolean(exam.proctoring_enabled),
          maxViolations: exam.max_violations,
          cameraGracePeriodSeconds: exam.camera_grace_period_seconds || 20,
          remainingSeconds
        },
        questions,
        codingQuestions,
        savedAnswers: answersMap,
        savedCodingSubmissions: codingMap
      });
    } catch (err) {
      console.error('Error starting exam:', err);
      res.status(500).json({ error: 'Failed to start exam session.' });
    }
  },

  // Real-time Heartbeat & Server-Clock Deadline Watchdog
  heartbeat: (req, res) => {
    try {
      const { candidateId } = req.params;
      const { sessionToken, cameraStatus } = req.body;

      const candidate = db.prepare('SELECT c.*, e.duration_minutes FROM candidates c JOIN exams e ON c.exam_id = e.id WHERE c.id = ?').get(candidateId);
      if (!candidate || candidate.session_token !== sessionToken) {
        return res.status(401).json({ error: 'Unauthorized session.' });
      }

      if (candidate.status === 'submitted') {
        return res.json({ submitted: true });
      }

      // Update heartbeat timestamp & camera status
      db.prepare(`
        UPDATE candidates 
        SET last_heartbeat = CURRENT_TIMESTAMP,
            camera_status = ?
        WHERE id = ?
      `).run(cameraStatus || 'active', candidateId);

      // Server-Side Hard Deadline Check
      if (candidate.started_at) {
        const startTime = new Date(candidate.started_at).getTime();
        const now = Date.now();
        const allowedMs = candidate.duration_minutes * 60 * 1000;
        const remainingSeconds = Math.max(0, Math.floor((startTime + allowedMs - now) / 1000));

        if (remainingSeconds <= 0) {
          // Time expired on server clock -> auto finalize
          const result = candidateController.finalizeSubmission(candidateId, false);
          return res.json({
            timeExpired: true,
            autoSubmitted: true,
            message: 'Server deadline reached. Exam automatically submitted.',
            result
          });
        }

        return res.json({
          ok: true,
          remainingSeconds,
          serverTime: new Date().toISOString()
        });
      }

      res.json({ ok: true, serverTime: new Date().toISOString() });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  // Save/Update individual answer
  saveAnswer: (req, res) => {
    try {
      const { candidateId } = req.params;
      const { sessionToken, questionId, selectedOption, status } = req.body;

      const candidate = db.prepare('SELECT id, status, session_token FROM candidates WHERE id = ?').get(candidateId);
      if (!candidate || candidate.session_token !== sessionToken) {
        return res.status(401).json({ error: 'Invalid session token' });
      }

      if (candidate.status !== 'in_progress') {
        return res.status(400).json({ error: 'Cannot save answer for inactive test session' });
      }

      const answerId = uuidv4();
      const currentStatus = status || (selectedOption ? 'answered' : 'unanswered');

      db.prepare(`
        INSERT INTO candidate_answers (id, candidate_id, question_id, selected_option, status, updated_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(candidate_id, question_id) DO UPDATE SET
          selected_option = excluded.selected_option,
          status = excluded.status,
          updated_at = CURRENT_TIMESTAMP
      `).run(answerId, candidateId, questionId, selectedOption || null, currentStatus);

      res.json({ success: true, questionId, selectedOption, status: currentStatus });
    } catch (err) {
      console.error('Error saving answer:', err);
      res.status(500).json({ error: 'Failed to save answer.' });
    }
  },

  // Log Proctoring Violation
  recordViolation: (req, res) => {
    try {
      const { candidateId } = req.params;
      const { sessionToken, violationType, details } = req.body;

      const candidate = db.prepare('SELECT c.*, e.max_violations, e.proctoring_enabled FROM candidates c JOIN exams e ON c.exam_id = e.id WHERE c.id = ?').get(candidateId);
      if (!candidate || candidate.session_token !== sessionToken) {
        return res.status(401).json({ error: 'Invalid session token' });
      }

      if (candidate.status !== 'in_progress') {
        return res.json({ success: true, message: 'Candidate not in progress' });
      }

      const violationId = uuidv4();
      const newViolationCount = (candidate.violation_count || 0) + 1;

      db.prepare(`
        INSERT INTO violations (id, candidate_id, exam_id, violation_type, details)
        VALUES (?, ?, ?, ?, ?)
      `).run(violationId, candidateId, candidate.exam_id, violationType || 'tab_switch', details || 'Proctoring violation detected');

      db.prepare(`
        UPDATE candidates SET violation_count = ? WHERE id = ?
      `).run(newViolationCount, candidateId);

      const isDisqualified = candidate.proctoring_enabled && newViolationCount >= candidate.max_violations;

      if (isDisqualified) {
        candidateController.finalizeSubmission(candidateId, true);
        return res.json({
          warning: 'Maximum violations reached. Your exam has been terminated.',
          violationCount: newViolationCount,
          maxViolations: candidate.max_violations,
          disqualified: true
        });
      }

      res.json({
        warning: `Violation recorded (${violationType}). Please stay inside the exam screen.`,
        violationCount: newViolationCount,
        maxViolations: candidate.max_violations,
        remainingWarnings: candidate.max_violations - newViolationCount,
        disqualified: false
      });
    } catch (err) {
      console.error('Error recording violation:', err);
      res.status(500).json({ error: 'Failed to record violation.' });
    }
  },

  // Log Camera Snapshot Evidence (Face absent, multiple faces, covered lens)
  logSnapshot: (req, res) => {
    try {
      const { candidateId } = req.params;
      const { sessionToken, snapshotBase64, eventType } = req.body;

      const candidate = db.prepare('SELECT * FROM candidates WHERE id = ?').get(candidateId);
      if (!candidate || candidate.session_token !== sessionToken) {
        return res.status(401).json({ error: 'Unauthorized session' });
      }

      const snapId = uuidv4();
      db.prepare(`
        INSERT INTO camera_snapshots (id, candidate_id, exam_id, snapshot_base64, event_type)
        VALUES (?, ?, ?, ?, ?)
      `).run(snapId, candidateId, candidate.exam_id, snapshotBase64 || '', eventType || 'routine_audit');

      // Also record as violation if security breach
      if (['no_face', 'multiple_faces', 'covered_camera', 'phone_detected', 'looking_away'].includes(eventType)) {
        db.prepare(`
          INSERT INTO violations (id, candidate_id, exam_id, violation_type, details)
          VALUES (?, ?, ?, ?, ?)
        `).run(uuidv4(), candidateId, candidate.exam_id, eventType, `Camera watchdog: ${eventType.replace('_', ' ')} detected.`);

        db.prepare('UPDATE candidates SET violation_count = violation_count + 1 WHERE id = ?').run(candidateId);
      }

      // Asynchronous Server-side OpenCV Verification
      if (snapshotBase64) {
        runOpenCVAnalysis(snapshotBase64).then(cvRes => {
          if (cvRes && cvRes.phone_detected) {
            db.prepare(`
              INSERT INTO violations (id, candidate_id, exam_id, violation_type, details)
              VALUES (?, ?, ?, ?, ?)
            `).run(uuidv4(), candidateId, candidate.exam_id, 'phone_detected', `OpenCV Server Vision: Mobile phone detected with ${cvRes.phone_confidence}% confidence.`);
            db.prepare('UPDATE candidates SET violation_count = violation_count + 1 WHERE id = ?').run(candidateId);
          }
        }).catch(() => {});
      }

      res.json({ success: true, snapId });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  // Camera Grace Period Expiry (Terminates exam if camera not restored)
  handleCameraDisconnectExpired: (req, res) => {
    try {
      const { candidateId } = req.params;
      const { sessionToken } = req.body;

      const candidate = db.prepare('SELECT * FROM candidates WHERE id = ?').get(candidateId);
      if (!candidate || candidate.session_token !== sessionToken) {
        return res.status(401).json({ error: 'Unauthorized session' });
      }

      // Record violation
      db.prepare(`
        INSERT INTO violations (id, candidate_id, exam_id, violation_type, details)
        VALUES (?, ?, ?, ?, ?)
      `).run(uuidv4(), candidateId, candidate.exam_id, 'camera_unplugged_timeout', 'Camera remained disconnected beyond allowable grace period.');

      // Finalize submission with disqualification/termination
      const result = candidateController.finalizeSubmission(candidateId, true);
      res.json({
        terminated: true,
        message: 'Exam terminated due to camera disconnection beyond grace period.',
        result
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  submitExam: (req, res) => {
    try {
      const { candidateId } = req.params;
      const { sessionToken } = req.body;

      const candidate = db.prepare('SELECT * FROM candidates WHERE id = ?').get(candidateId);
      if (!candidate || candidate.session_token !== sessionToken) {
        return res.status(401).json({ error: 'Invalid session token.' });
      }

      if (candidate.status === 'submitted') {
        return res.json({ message: 'Exam was already submitted.', candidateId });
      }

      const result = candidateController.finalizeSubmission(candidateId, false);
      res.json({
        message: 'Exam submitted successfully.',
        ...result
      });
    } catch (err) {
      console.error('Error submitting exam:', err);
      res.status(500).json({ error: 'Failed to submit exam.' });
    }
  },

  autoSubmitExpiredCandidate: (candidateId) => {
    try {
      return candidateController.finalizeSubmission(candidateId, false);
    } catch (e) {
      console.error('Auto submit error:', e);
    }
  },

  finalizeSubmission: (candidateId, isDisqualified = false) => {
    const candidate = db.prepare('SELECT * FROM candidates WHERE id = ?').get(candidateId);
    if (!candidate) return null;

    const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(candidate.exam_id);
    const questions = db.prepare('SELECT * FROM questions WHERE exam_id = ?').all(candidate.exam_id);
    const codingQuestions = db.prepare('SELECT * FROM coding_questions WHERE exam_id = ?').all(candidate.exam_id);
    const answers = db.prepare('SELECT * FROM candidate_answers WHERE candidate_id = ?').all(candidateId);
    const codingSubmissions = db.prepare('SELECT * FROM candidate_code_submissions WHERE candidate_id = ?').all(candidateId);

    const answersMap = {};
    answers.forEach(a => {
      answersMap[a.question_id] = a.selected_option;
    });

    let totalScore = 0;
    let totalMaxMarks = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let unattemptedCount = 0;

    const updateAnswerStmt = db.prepare(`
      UPDATE candidate_answers 
      SET is_correct = ?, marks_obtained = ? 
      WHERE candidate_id = ? AND question_id = ?
    `);

    // Grade MCQs
    questions.forEach(q => {
      const qMarks = parseFloat(q.marks) || 1.0;
      totalMaxMarks += qMarks;
      const selected = answersMap[q.id];

      if (!selected) {
        unattemptedCount++;
      } else if (selected.toUpperCase() === q.correct_option.toUpperCase()) {
        correctCount++;
        totalScore += qMarks;
        updateAnswerStmt.run(1, qMarks, candidateId, q.id);
      } else {
        wrongCount++;
        const negativePenalty = (parseFloat(exam.negative_marking) || 0) * qMarks;
        totalScore -= negativePenalty;
        updateAnswerStmt.run(0, -negativePenalty, candidateId, q.id);
      }
    });

    // Grade Coding questions
    let codingScore = 0;
    codingQuestions.forEach(cq => {
      const cqMarks = parseFloat(cq.marks) || 10.0;
      totalMaxMarks += cqMarks;
      const submission = codingSubmissions.find(s => s.coding_question_id === cq.id);
      if (submission) {
        codingScore += (submission.score || 0);
      }
    });

    totalScore += codingScore;
    if (totalScore < 0) totalScore = 0;

    const percentage = totalMaxMarks > 0 ? (totalScore / totalMaxMarks) * 100 : 0;
    const passed = percentage >= (exam.pass_percentage || 50) ? 1 : 0;
    const finalStatus = isDisqualified ? 'disqualified' : 'submitted';

    db.prepare(`
      UPDATE candidates SET
        status = ?,
        link_used = 1,
        submitted_at = CURRENT_TIMESTAMP,
        score = ?,
        total_marks = ?,
        percentage = ?,
        passed = ?
      WHERE id = ?
    `).run(finalStatus, parseFloat(totalScore.toFixed(2)), totalMaxMarks, parseFloat(percentage.toFixed(2)), passed, candidateId);

    return {
      candidateId,
      status: finalStatus,
      score: parseFloat(totalScore.toFixed(2)),
      totalMarks: totalMaxMarks,
      percentage: Number(percentage.toFixed(2)),
      passed: Boolean(passed),
      correctCount,
      wrongCount,
      unattemptedCount,
      codingScore,
      showResult: Boolean(exam.show_result_immediately)
    };
  },

  getResult: (req, res) => {
    try {
      const { candidateId } = req.params;
      const candidate = db.prepare(`
        SELECT c.*, e.title as exam_title, e.company_name, e.show_result_immediately, e.pass_percentage
        FROM candidates c
        JOIN exams e ON c.exam_id = e.id
        WHERE c.id = ?
      `).get(candidateId);

      if (!candidate) {
        return res.status(404).json({ error: 'Candidate record not found.' });
      }

      const rankData = db.prepare(`
        SELECT COUNT(*) + 1 as rank
        FROM candidates
        WHERE exam_id = ? AND status = 'submitted' AND score > ?
      `).get(candidate.exam_id, candidate.score);

      const totalCandidates = db.prepare(`
        SELECT COUNT(*) as total FROM candidates WHERE exam_id = ? AND status = 'submitted'
      `).get(candidate.exam_id).total;

      res.json({
        candidate: {
          fullName: candidate.full_name,
          rollNumber: candidate.roll_number,
          email: candidate.email,
          department: candidate.department,
          batch: candidate.batch,
          status: candidate.status,
          score: candidate.score,
          totalMarks: candidate.total_marks,
          percentage: candidate.percentage,
          passed: Boolean(candidate.passed),
          submittedAt: candidate.submitted_at,
          violationCount: candidate.violation_count,
          rank: rankData ? rankData.rank : 1,
          totalSubmissions: totalCandidates
        },
        exam: {
          title: candidate.exam_title,
          companyName: candidate.company_name,
          passPercentage: candidate.pass_percentage,
          showResultImmediately: Boolean(candidate.show_result_immediately)
        }
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch result.' });
    }
  }
};

module.exports = candidateController;
