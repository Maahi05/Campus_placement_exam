const db = require('./config/db');
const { v4: uuidv4 } = require('uuid');

const examId = 'PLACEMENT-DEMO';

// Remove old demo data if exists
db.prepare('DELETE FROM candidate_code_submissions WHERE candidate_id IN (SELECT id FROM candidates WHERE exam_id = ?)').run(examId);
db.prepare('DELETE FROM candidate_answers WHERE candidate_id IN (SELECT id FROM candidates WHERE exam_id = ?)').run(examId);
db.prepare('DELETE FROM violations WHERE candidate_id IN (SELECT id FROM candidates WHERE exam_id = ?)').run(examId);
db.prepare('DELETE FROM camera_snapshots WHERE candidate_id IN (SELECT id FROM candidates WHERE exam_id = ?)').run(examId);
db.prepare('DELETE FROM candidates WHERE exam_id = ?').run(examId);
db.prepare('DELETE FROM coding_questions WHERE exam_id = ?').run(examId);
db.prepare('DELETE FROM questions WHERE exam_id = ?').run(examId);
db.prepare('DELETE FROM exams WHERE id = ?').run(examId);

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

insertExam.run(
  examId,
  'Campus Placement Drive - Aptitude & Technical Coding 2026',
  'Comprehensive placement test featuring Aptitude MCQs, Core CS concepts, and in-browser coding sandbox with hidden test suites.',
  'TCS Digital Drive 2026',
  45, // 45 minutes
  25.0, // total marks
  60.0, // 60% pass
  0.25, // negative marking
  '1. Continuous camera feed is strictly mandatory.\n2. Do not switch tabs or minimize fullscreen.\n3. Coding problems are auto-graded against hidden test cases.\n4. Server clock enforces exam deadlines.',
  null, // access code
  1, // proctoring enabled
  3, // max violations
  1, // show scorecard
  0, // IP restriction disabled by default for testing
  '',
  null, // start_time open
  null, // end_time open
  null,
  null,
  1, // camera mandatory
  20, // 20s camera grace period
  1 // one-time link enforced
);

// 5 MCQs
const mcqs = [
  {
    num: 1,
    sec: 'QUANTITATIVE APTITUDE',
    text: 'A train 240 m long passes a pole in 24 seconds. How long will it take to pass a platform 650 m long?',
    a: '65 seconds',
    b: '89 seconds',
    c: '100 seconds',
    d: '150 seconds',
    ans: 'B',
    marks: 1.0,
    exp: 'Speed = 240/24 = 10 m/s. Total distance = 240 + 650 = 890 m. Time = 890/10 = 89 s.'
  },
  {
    num: 2,
    sec: 'LOGICAL REASONING',
    text: 'Look at this series: 2, 1, (1/2), (1/4), ... What number should come next?',
    a: '(1/3)',
    b: '(1/8)',
    c: '(2/8)',
    d: '(1/16)',
    ans: 'B',
    marks: 1.0,
    exp: 'Each term is divided by 2.'
  },
  {
    num: 3,
    sec: 'DATA STRUCTURES',
    text: 'What is the worst-case time complexity of searching for an element in an unbalanced Binary Search Tree (BST)?',
    a: 'O(1)',
    b: 'O(log N)',
    c: 'O(N)',
    d: 'O(N log N)',
    ans: 'C',
    marks: 1.0,
    exp: 'Skewed binary tree degenerates into a linked list giving O(N).'
  },
  {
    num: 4,
    sec: 'ALGORITHMS',
    text: 'Which data structure is primarily used to implement Breadth-First Search (BFS) graph traversal?',
    a: 'Stack',
    b: 'Priority Queue',
    c: 'FIFO Queue',
    d: 'Hash Map',
    ans: 'C',
    marks: 1.0,
    exp: 'BFS discovers nodes in layers using a FIFO queue.'
  },
  {
    num: 5,
    sec: 'DATABASE SYSTEMS',
    text: 'Which ACID property guarantees that once a transaction is committed, changes survive even in system power crashes?',
    a: 'Atomicity',
    b: 'Consistency',
    c: 'Isolation',
    d: 'Durability',
    ans: 'D',
    marks: 1.0,
    exp: 'Durability ensures write-ahead logs and committed states persist.'
  }
];

const insertQ = db.prepare(`
  INSERT INTO questions (
    id, exam_id, question_number, section, question_text,
    option_a, option_b, option_c, option_d, correct_option, marks, explanation
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

for (const q of mcqs) {
  insertQ.run(
    uuidv4(), examId, q.num, q.sec, q.text,
    q.a, q.b, q.c, q.d, q.ans, q.marks, q.exp
  );
}

// 2 Coding Challenges with 7 hidden test cases each
const codingChallenges = [
  {
    num: 1,
    title: 'Palindrome String Checker',
    desc: 'Write a program that reads a string from standard input and prints "true" if the string is a palindrome (ignoring letter case), otherwise prints "false".\n\nInput Format:\nA single line string.\n\nOutput Format:\n"true" or "false".',
    diff: 'Easy',
    starterPy: `import sys\n\ndef check_palindrome(s):\n    cleaned = s.strip().lower()\n    return cleaned == cleaned[::-1]\n\nline = sys.stdin.read().strip()\nif check_palindrome(line):\n    print('true')\nelse:\n    print('false')\n`,
    starterJs: `const fs = require('fs');\nconst input = fs.readFileSync(0, 'utf-8').trim().toLowerCase();\nconst reversed = input.split('').reverse().join('');\nconsole.log(input === reversed ? 'true' : 'false');\n`,
    marks: 10.0,
    testCases: [
      { input: 'racecar', expected_output: 'true', is_hidden: false },
      { input: 'hello', expected_output: 'false', is_hidden: false },
      // 7 Hidden Cases
      { input: 'Madam', expected_output: 'true', is_hidden: true },
      { input: 'placement', expected_output: 'false', is_hidden: true },
      { input: '12321', expected_output: 'true', is_hidden: true },
      { input: 'a', expected_output: 'true', is_hidden: true },
      { input: 'deified', expected_output: 'true', is_hidden: true },
      { input: 'noon', expected_output: 'true', is_hidden: true },
      { input: 'abcdcba1', expected_output: 'false', is_hidden: true }
    ]
  },
  {
    num: 2,
    title: 'Sum of Array Elements',
    desc: 'Given a sequence of space-separated integers on standard input, calculate and print their total sum.\n\nInput Format:\nSpace-separated numbers.\n\nOutput Format:\nA single integer representing the sum.',
    diff: 'Easy',
    starterPy: `import sys\n\nnums = [int(x) for x in sys.stdin.read().split() if x]\nprint(sum(nums))\n`,
    starterJs: `const fs = require('fs');\nconst nums = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/).map(Number);\nconsole.log(nums.reduce((a, b) => a + b, 0));\n`,
    marks: 10.0,
    testCases: [
      { input: '1 2 3 4 5', expected_output: '15', is_hidden: false },
      { input: '10 -5 20', expected_output: '25', is_hidden: false },
      // 7 Hidden Cases
      { input: '100 200 300 400', expected_output: '1000', is_hidden: true },
      { input: '-10 -20 -30', expected_output: '-60', is_hidden: true },
      { input: '0 0 0 0', expected_output: '0', is_hidden: true },
      { input: '42', expected_output: '42', is_hidden: true },
      { input: '5 -5 10 -10 15 -15', expected_output: '0', is_hidden: true },
      { input: '999999 1', expected_output: '1000000', is_hidden: true },
      { input: '-50 100 -25', expected_output: '25', is_hidden: true }
    ]
  }
];

const insertCQ = db.prepare(`
  INSERT INTO coding_questions (
    id, exam_id, question_number, title, description,
    difficulty, starter_code_py, starter_code_js, test_cases, marks
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

for (const cq of codingChallenges) {
  insertCQ.run(
    uuidv4(), examId, cq.num, cq.title, cq.desc,
    cq.diff, cq.starterPy, cq.starterJs, JSON.stringify(cq.testCases), cq.marks
  );
}

console.log('✅ Demo Exam seeded successfully with ID:', examId);
