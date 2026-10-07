const express = require('express');
const os = require('os');
const router = express.Router();

const examController = require('../controllers/examController');
const candidateController = require('../controllers/candidateController');
const pdfController = require('../controllers/pdfController');
const adminController = require('../controllers/adminController');
const codingController = require('../controllers/codingController');

// Network Auto-Detection helper for Host machine
router.get('/network-info', (req, res) => {
  try {
    const interfaces = os.networkInterfaces();
    const addresses = [];
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          addresses.push({ interface: name, ip: iface.address });
        }
      }
    }
    const primary = addresses.length > 0 ? addresses[0].ip : '127.0.0.1';
    const subnet = primary.includes('.') ? primary.split('.').slice(0, 3).join('.') + '.*' : '192.168.*';
    res.json({ primaryIp: primary, suggestedSubnet: subnet, addresses });
  } catch (err) {
    res.json({ primaryIp: '127.0.0.1', suggestedSubnet: '192.168.*', addresses: [] });
  }
});

// 1. PDF Parser routes
router.post('/pdf/parse', pdfController.uploadMiddleware, pdfController.parseUploadedPdf);

// 2. Exam management routes (Admin)
router.post('/exams', examController.createExam);
router.get('/exams', examController.getAllExams);
router.get('/exams/:examId/admin', examController.getExamAdmin);
router.patch('/exams/:examId/toggle', examController.toggleExamStatus);
router.delete('/exams/:examId', examController.deleteExam);

// 3. Real-Time Access Controller Validation (ALLOW, WAIT, BLOCK)
router.get('/exams/:examId/validate-access', candidateController.validateAccess);

// 4. Candidate exam routes
router.get('/exams/:examId/candidate', examController.getExamForCandidate);
router.post('/exams/:examId/register', candidateController.registerCandidate);
router.post('/candidates/:candidateId/start', candidateController.startExam);
router.post('/candidates/:candidateId/heartbeat', candidateController.heartbeat);
router.post('/candidates/:candidateId/answer', candidateController.saveAnswer);
router.post('/candidates/:candidateId/violation', candidateController.recordViolation);
router.post('/candidates/:candidateId/snapshot', candidateController.logSnapshot);
router.post('/candidates/:candidateId/camera-disconnect-expired', candidateController.handleCameraDisconnectExpired);
router.post('/candidates/:candidateId/submit', candidateController.submitExam);
router.get('/candidates/:candidateId/result', candidateController.getResult);

// 5. Coding Sandbox Assessment routes (Feature 4)
router.post('/code/run', codingController.runSampleCode);
router.post('/code/submit', codingController.submitCodeSolution);
router.get('/exams/:examId/coding-questions', codingController.getCodingQuestionsForExam);

// 6. Admin analytics & reports
router.get('/analytics/:examId', adminController.getExamAnalytics);
// 7. OpenCV AI Proctoring Diagnostics & Server Analysis
const { runOpenCVAnalysis } = require('../services/opencvProctorService');
router.post('/proctor/opencv-analyze', async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 required.' });
    }
    const analysis = await runOpenCVAnalysis(imageBase64);
    res.json(analysis);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
