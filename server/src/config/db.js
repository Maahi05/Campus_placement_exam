const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'placement_exam.db');
const db = new Database(dbPath);

// Enable WAL mode for high performance and concurrency
db.pragma('journal_mode = WAL');

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS exams (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    company_name TEXT DEFAULT 'Campus Drive',
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    total_marks REAL DEFAULT 0,
    pass_percentage REAL DEFAULT 50.0,
    negative_marking REAL DEFAULT 0.0,
    instructions TEXT,
    access_code TEXT,
    proctoring_enabled INTEGER DEFAULT 1,
    max_violations INTEGER DEFAULT 3,
    is_active INTEGER DEFAULT 1,
    show_result_immediately INTEGER DEFAULT 1,
    ip_restriction_enabled INTEGER DEFAULT 0,
    allowed_ip_range TEXT DEFAULT '',
    start_time DATETIME,
    end_time DATETIME,
    entry_interval_start DATETIME,
    entry_interval_end DATETIME,
    camera_mandatory INTEGER DEFAULT 1,
    camera_grace_period_seconds INTEGER DEFAULT 20,
    one_time_link_enforced INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS questions (
    id TEXT PRIMARY KEY,
    exam_id TEXT NOT NULL,
    question_number INTEGER NOT NULL,
    section TEXT DEFAULT 'General',
    question_text TEXT NOT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    correct_option TEXT NOT NULL,
    marks REAL DEFAULT 1.0,
    explanation TEXT,
    FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS coding_questions (
    id TEXT PRIMARY KEY,
    exam_id TEXT NOT NULL,
    question_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    difficulty TEXT DEFAULT 'Medium',
    starter_code_py TEXT,
    starter_code_js TEXT,
    test_cases TEXT NOT NULL,
    marks REAL DEFAULT 10.0,
    FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS candidates (
    id TEXT PRIMARY KEY,
    exam_id TEXT NOT NULL,
    full_name TEXT NOT NULL,
    roll_number TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    department TEXT,
    batch TEXT,
    status TEXT DEFAULT 'registered',
    started_at DATETIME,
    submitted_at DATETIME,
    score REAL DEFAULT 0,
    total_marks REAL DEFAULT 0,
    percentage REAL DEFAULT 0,
    passed INTEGER DEFAULT 0,
    violation_count INTEGER DEFAULT 0,
    session_token TEXT,
    client_ip TEXT,
    one_time_token TEXT,
    link_used INTEGER DEFAULT 0,
    last_heartbeat DATETIME,
    camera_status TEXT DEFAULT 'active',
    FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS candidate_answers (
    id TEXT PRIMARY KEY,
    candidate_id TEXT NOT NULL,
    question_id TEXT NOT NULL,
    selected_option TEXT,
    is_correct INTEGER DEFAULT 0,
    marks_obtained REAL DEFAULT 0,
    status TEXT DEFAULT 'unanswered',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
    UNIQUE(candidate_id, question_id)
  );

  CREATE TABLE IF NOT EXISTS candidate_code_submissions (
    id TEXT PRIMARY KEY,
    candidate_id TEXT NOT NULL,
    coding_question_id TEXT NOT NULL,
    code TEXT NOT NULL,
    language TEXT NOT NULL,
    tests_passed INTEGER DEFAULT 0,
    total_tests INTEGER DEFAULT 0,
    score REAL DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
    FOREIGN KEY (coding_question_id) REFERENCES coding_questions(id) ON DELETE CASCADE,
    UNIQUE(candidate_id, coding_question_id)
  );

  CREATE TABLE IF NOT EXISTS violations (
    id TEXT PRIMARY KEY,
    candidate_id TEXT NOT NULL,
    exam_id TEXT NOT NULL,
    violation_type TEXT NOT NULL,
    details TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
    FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS camera_snapshots (
    id TEXT PRIMARY KEY,
    candidate_id TEXT NOT NULL,
    exam_id TEXT NOT NULL,
    snapshot_base64 TEXT NOT NULL,
    event_type TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
    FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
  );
`);

// Add new columns safely if upgrading existing database
const migrations = [
  `ALTER TABLE exams ADD COLUMN start_time DATETIME;`,
  `ALTER TABLE exams ADD COLUMN end_time DATETIME;`,
  `ALTER TABLE exams ADD COLUMN entry_interval_start DATETIME;`,
  `ALTER TABLE exams ADD COLUMN entry_interval_end DATETIME;`,
  `ALTER TABLE exams ADD COLUMN camera_mandatory INTEGER DEFAULT 1;`,
  `ALTER TABLE exams ADD COLUMN camera_grace_period_seconds INTEGER DEFAULT 20;`,
  `ALTER TABLE exams ADD COLUMN one_time_link_enforced INTEGER DEFAULT 1;`,
  `ALTER TABLE candidates ADD COLUMN one_time_token TEXT;`,
  `ALTER TABLE candidates ADD COLUMN link_used INTEGER DEFAULT 0;`,
  `ALTER TABLE candidates ADD COLUMN last_heartbeat DATETIME;`,
  `ALTER TABLE candidates ADD COLUMN camera_status TEXT DEFAULT 'active';`
];

for (const m of migrations) {
  try { db.exec(m); } catch (e) {}
}

module.exports = db;
