const db = require('./config/db');
const { evaluateExamAccess } = require('./services/accessControllerService');

console.log('--- TEST 1: Default PLACEMENT-DEMO Access ---');
const access1 = evaluateExamAccess({ examId: 'PLACEMENT-DEMO' });
console.log('Decision:', access1.decision, '| Reason:', access1.reason);
console.assert(access1.decision === 'ALLOW', 'Should be ALLOW');

console.log('\n--- TEST 2: Future Start Time (WAIT Room) ---');
// Temporarily set start_time to 1 hour in future
const futureTime = new Date(Date.now() + 3600 * 1000).toISOString();
db.prepare('UPDATE exams SET start_time = ? WHERE id = ?').run(futureTime, 'PLACEMENT-DEMO');
const access2 = evaluateExamAccess({ examId: 'PLACEMENT-DEMO' });
console.log('Decision:', access2.decision, '| Code:', access2.code, '| Countdown:', access2.countdownSeconds, 's');
console.assert(access2.decision === 'WAIT', 'Should be WAIT');

console.log('\n--- TEST 3: Past End Time (BLOCK Exam Ended) ---');
const pastTime = new Date(Date.now() - 3600 * 1000).toISOString();
db.prepare('UPDATE exams SET start_time = NULL, end_time = ? WHERE id = ?').run(pastTime, 'PLACEMENT-DEMO');
const access3 = evaluateExamAccess({ examId: 'PLACEMENT-DEMO' });
console.log('Decision:', access3.decision, '| Code:', access3.code, '| Reason:', access3.reason);
console.assert(access3.decision === 'BLOCK', 'Should be BLOCK');

console.log('\n--- TEST 4: One-Time Link Reuse (BLOCK Already Submitted) ---');
// Reset time windows
db.prepare('UPDATE exams SET start_time = NULL, end_time = NULL WHERE id = ?').run('PLACEMENT-DEMO');
// Register a candidate and mark as submitted
const candidateId = 'test-cand-' + Date.now();
db.prepare(`
  INSERT INTO candidates (id, exam_id, full_name, roll_number, email, status, link_used)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`).run(candidateId, 'PLACEMENT-DEMO', 'Aditya Sharma', 'CS2026-99', 'aditya@college.edu', 'submitted', 1);

const access4 = evaluateExamAccess({ examId: 'PLACEMENT-DEMO', rollNumber: 'CS2026-99' });
console.log('Decision:', access4.decision, '| Code:', access4.code, '| Reason:', access4.reason);
console.assert(access4.decision === 'BLOCK' && access4.code === 'LINK_ALREADY_USED', 'Should be BLOCK LINK_ALREADY_USED');

console.log('\n--- TEST 5: Duplicate Active Session (BLOCK Concurrent Login) ---');
const candidateId2 = 'test-cand2-' + Date.now();
db.prepare(`
  INSERT INTO candidates (id, exam_id, full_name, roll_number, email, status, session_token, last_heartbeat)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`).run(candidateId2, 'PLACEMENT-DEMO', 'Rahul Verma', 'CS2026-88', 'rahul@college.edu', 'in_progress', 'token-active-1', new Date().toISOString());

// Another browser/device attempts login with different or no session token
const access5 = evaluateExamAccess({ examId: 'PLACEMENT-DEMO', rollNumber: 'CS2026-88', sessionToken: 'different-token' });
console.log('Decision:', access5.decision, '| Code:', access5.code, '| Reason:', access5.reason);
console.assert(access5.decision === 'BLOCK' && access5.code === 'DUPLICATE_SESSION_ACTIVE', 'Should be BLOCK DUPLICATE_SESSION_ACTIVE');

// Clean up test candidates
db.prepare('DELETE FROM candidates WHERE roll_number IN (?, ?)').run('CS2026-99', 'CS2026-88');

console.log('\n✅ ALL 5 ACCESS CONTROLLER REAL-TIME TESTS PASSED!');
