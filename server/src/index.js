const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging in development
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  }
  next();
});

// API Routes
app.use('/api', apiRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    appName: 'Campus Placement Online Examination System',
    timestamp: new Date().toISOString()
  });
});

// Serve frontend static build if available
const clientDistPath = path.join(__dirname, '..', '..', 'client', 'dist');
app.use(express.static(clientDistPath));

// Fallback for Single Page Application (works seamlessly in Express 4 & Express 5)
app.use((req, res) => {
  const indexPath = path.join(clientDistPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Campus Placement Exam Server</title>
          <style>
            body { font-family: system-ui, sans-serif; text-align: center; padding: 50px; background: #f8fafc; }
            .card { background: white; max-width: 600px; margin: 0 auto; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
            h1 { color: #1e3a8a; }
            code { background: #e2e8f0; padding: 3px 6px; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Backend Server is Running!</h1>
            <p>API is available at <code>/api</code></p>
            <p>To run the frontend in development mode, execute <code>cd client && npm run dev</code></p>
          </div>
        </body>
      </html>
    `);
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Placement Exam Portal running at http://localhost:${PORT}`);
  console.log(`📡 API Endpoints available under http://localhost:${PORT}/api`);
  console.log(`=======================================================`);
});
