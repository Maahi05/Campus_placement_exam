const { spawn } = require('child_process');
const path = require('path');

const OPENCV_SCRIPT = path.join(__dirname, 'opencvProctor.py');

/**
 * Runs Python OpenCV image analysis on a base64 or raw image buffer.
 */
function runOpenCVAnalysis(imageBase64) {
  return new Promise((resolve, reject) => {
    try {
      const child = spawn('python', [OPENCV_SCRIPT], {
        windowsHide: true,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code !== 0) {
          console.warn('[OpenCV Proctor] Process exited with code:', code, stderr);
          return resolve({ success: false, error: stderr || 'OpenCV analysis failed' });
        }
        try {
          const parsed = JSON.parse(stdout.trim());
          resolve(parsed);
        } catch (e) {
          resolve({ success: false, error: 'Failed to parse OpenCV JSON response: ' + stdout });
        }
      });

      // Write image data to stdin
      child.stdin.write(imageBase64);
      child.stdin.end();
    } catch (err) {
      console.error('[OpenCV Proctor] Execution error:', err);
      resolve({ success: false, error: err.message });
    }
  });
}

module.exports = {
  runOpenCVAnalysis
};
