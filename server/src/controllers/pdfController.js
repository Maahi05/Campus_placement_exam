const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { parsePdfQuestionPaper } = require('../services/pdfParserService');

// Multer storage configuration
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_'));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are supported.'));
    }
  }
});

const pdfController = {
  uploadMiddleware: upload.single('pdfFile'),

  parseUploadedPdf: async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No PDF file uploaded.' });
      }

      const filePath = req.file.path;
      const result = await parsePdfQuestionPaper(filePath);

      // Clean up uploaded temporary PDF or keep for archival
      res.json({
        message: 'PDF parsed successfully',
        fileName: req.file.originalname,
        detectedTitle: result.title,
        pageCount: result.pageCount,
        sections: result.sections,
        totalParsed: result.questions.length,
        questions: result.questions
      });
    } catch (err) {
      console.error('PDF parsing error:', err);
      res.status(500).json({ error: 'Failed to parse PDF question paper: ' + err.message });
    }
  }
};

module.exports = pdfController;
