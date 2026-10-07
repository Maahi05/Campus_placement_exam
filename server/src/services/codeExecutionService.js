const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

const TEMP_CODE_DIR = path.join(os.tmpdir(), 'placement_code_sandbox');
if (!fs.existsSync(TEMP_CODE_DIR)) {
  fs.mkdirSync(TEMP_CODE_DIR, { recursive: true });
}

/**
 * Executes a piece of code with standard input and measures time.
 */
function executeSingleRun(language, code, stdin = '', timeoutMs = 3000) {
  return new Promise((resolve) => {
    const fileId = uuidv4();
    const ext = language === 'python' ? 'py' : 'js';
    const tempFile = path.join(TEMP_CODE_DIR, `solution_${fileId}.${ext}`);

    fs.writeFileSync(tempFile, code, 'utf-8');

    const cmd = language === 'python' ? 'python' : 'node';
    const args = [tempFile];

    const startTime = Date.now();
    let stdout = '';
    let stderr = '';
    let isTimedOut = false;

    const child = spawn(cmd, args, {
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    const timer = setTimeout(() => {
      isTimedOut = true;
      try {
        child.kill('SIGKILL');
      } catch (e) {}
    }, timeoutMs);

    if (stdin) {
      child.stdin.write(stdin);
    }
    child.stdin.end();

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (exitCode) => {
      clearTimeout(timer);
      const executionTimeMs = Date.now() - startTime;

      // Clean up temp file
      try {
        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
      } catch (e) {}

      if (isTimedOut) {
        resolve({
          stdout: '',
          stderr: 'Time Limit Exceeded (Execution exceeded 3 seconds)',
          exitCode: -1,
          timedOut: true,
          executionTimeMs
        });
      } else {
        resolve({
          stdout,
          stderr,
          exitCode,
          timedOut: false,
          executionTimeMs
        });
      }
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      try {
        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
      } catch (e) {}
      resolve({
        stdout: '',
        stderr: 'Execution Error: ' + err.message,
        exitCode: 1,
        timedOut: false,
        executionTimeMs: Date.now() - startTime
      });
    });
  });
}

/**
 * Runs code against multiple test cases and produces a structured grading report.
 */
async function runAgainstTestCases(language, code, testCases = []) {
  const results = [];
  let passedCount = 0;

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    const input = tc.input !== undefined ? String(tc.input) : '';
    const expected = (tc.expected_output !== undefined ? String(tc.expected_output) : '').trim().replace(/\r\n/g, '\n');

    const execResult = await executeSingleRun(language, code, input);
    const actual = execResult.stdout.trim().replace(/\r\n/g, '\n');

    const passed = !execResult.timedOut && execResult.exitCode === 0 && actual === expected;
    if (passed) passedCount++;

    results.push({
      testCaseIndex: i + 1,
      input: tc.is_hidden ? '[Hidden Test Case]' : input,
      expected: tc.is_hidden ? '[Hidden]' : expected,
      actual: tc.is_hidden ? (passed ? '[Passed]' : '[Failed]') : actual,
      passed,
      is_hidden: Boolean(tc.is_hidden),
      stderr: execResult.stderr,
      timedOut: execResult.timedOut,
      executionTimeMs: execResult.executionTimeMs
    });
  }

  return {
    totalTests: testCases.length,
    passedCount,
    allPassed: passedCount === testCases.length,
    results
  };
}

module.exports = {
  executeSingleRun,
  runAgainstTestCases
};
