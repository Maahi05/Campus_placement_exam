const db = require('../config/db');

/**
 * Access Controller Service
 * Authoritative Server-Clock validation engine for exam entry and session security.
 */
function evaluateExamAccess({ examId, rollNumber = null, email = null, sessionToken = null, clientIp = null }) {
  const serverNow = new Date();
  const serverTimeMs = serverNow.getTime();

  // 1. Check if exam exists
  const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(examId);
  if (!exam) {
    return {
      decision: 'BLOCK',
      code: 'EXAM_NOT_FOUND',
      reason: 'The exam link is invalid or has expired.',
      serverTime: serverNow.toISOString()
    };
  }

  // 2. Check if placement coordinator deactivated the exam
  if (!exam.is_active) {
    return {
      decision: 'BLOCK',
      code: 'EXAM_DEACTIVATED',
      reason: 'This exam has been deactivated or paused by the placement coordinator.',
      serverTime: serverNow.toISOString()
    };
  }

  // 3. Server-Clock Start Time Check
  if (exam.start_time) {
    const startTimeMs = new Date(exam.start_time).getTime();
    if (serverTimeMs < startTimeMs) {
      const waitSeconds = Math.ceil((startTimeMs - serverTimeMs) / 1000);
      return {
        decision: 'WAIT',
        code: 'EXAM_NOT_STARTED',
        reason: `The exam has not started yet. Starts on ${new Date(exam.start_time).toLocaleTimeString()} (${new Date(exam.start_time).toLocaleDateString()}).`,
        serverTime: serverNow.toISOString(),
        startsAt: exam.start_time,
        countdownSeconds: waitSeconds
      };
    }
  }

  // 4. Server-Clock End Time Check
  if (exam.end_time) {
    const endTimeMs = new Date(exam.end_time).getTime();
    if (serverTimeMs > endTimeMs) {
      return {
        decision: 'BLOCK',
        code: 'EXAM_ENDED',
        reason: `The exam window has concluded. Submissions closed at ${new Date(exam.end_time).toLocaleTimeString()}.`,
        serverTime: serverNow.toISOString(),
        endedAt: exam.end_time
      };
    }
  }

  // 5. Entry Interval Schedule Check (if defined)
  if (exam.entry_interval_start && exam.entry_interval_end) {
    const intervalStartMs = new Date(exam.entry_interval_start).getTime();
    const intervalEndMs = new Date(exam.entry_interval_end).getTime();

    if (serverTimeMs < intervalStartMs) {
      const waitSeconds = Math.ceil((intervalStartMs - serverTimeMs) / 1000);
      return {
        decision: 'WAIT',
        code: 'ENTRY_INTERVAL_NOT_OPEN',
        reason: `Exam entry interval is not open yet. Access opens at ${new Date(exam.entry_interval_start).toLocaleTimeString()}.`,
        serverTime: serverNow.toISOString(),
        countdownSeconds: waitSeconds
      };
    } else if (serverTimeMs > intervalEndMs) {
      return {
        decision: 'BLOCK',
        code: 'ENTRY_INTERVAL_EXPIRED',
        reason: 'The entry interval for this test batch has closed. New candidate entry is blocked.',
        serverTime: serverNow.toISOString()
      };
    }
  }

  // 6. IP Whitelist check (if restricted to lab)
  if (exam.ip_restriction_enabled && clientIp) {
    let cleanIp = clientIp.replace('::ffff:', '');
    if (cleanIp === '::1') cleanIp = '127.0.0.1';

    const allowed = (exam.allowed_ip_range || '').split(',').map(s => s.trim().toLowerCase());
    let ipMatched = false;

    for (const pat of allowed) {
      if (!pat) continue;
      if (pat === 'localhost' && (cleanIp === '127.0.0.1' || cleanIp === '::1')) {
        ipMatched = true;
        break;
      }
      if (pat.includes('*')) {
        const regexStr = '^' + pat.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$';
        if (new RegExp(regexStr).test(cleanIp)) {
          ipMatched = true;
          break;
        }
      } else if (cleanIp === pat) {
        ipMatched = true;
        break;
      }
    }

    if (!ipMatched) {
      return {
        decision: 'BLOCK',
        code: 'IP_NOT_AUTHORIZED',
        reason: `Access Denied: This exam is restricted to the College Computer Lab network. Your current IP (${cleanIp}) is not within the authorized range (${exam.allowed_ip_range}).`,
        serverTime: serverNow.toISOString(),
        clientIp: cleanIp
      };
    }
  }

  // 7. Candidate-specific checks (if candidate identifier is passed)
  if (rollNumber || email) {
    const cleanRoll = rollNumber ? rollNumber.trim().toUpperCase() : '';
    const cleanEmail = email ? email.trim().toLowerCase() : '';

    const candidate = db.prepare(`
      SELECT * FROM candidates 
      WHERE exam_id = ? AND (roll_number = ? OR email = ?)
    `).get(examId, cleanRoll, cleanEmail);

    if (candidate) {
      // 7a. One-Time Link Check: Already Submitted
      if (candidate.status === 'submitted' || candidate.link_used === 1) {
        return {
          decision: 'BLOCK',
          code: 'LINK_ALREADY_USED',
          reason: 'This exam link has already been used and submitted. Repeat attempts are strictly prohibited.',
          serverTime: serverNow.toISOString(),
          candidateId: candidate.id
        };
      }

      // 7b. Disqualified
      if (candidate.status === 'disqualified') {
        return {
          decision: 'BLOCK',
          code: 'CANDIDATE_DISQUALIFIED',
          reason: 'Candidate access has been revoked due to proctoring policy violations.',
          serverTime: serverNow.toISOString()
        };
      }

      // 7c. Session Restriction: Prevent concurrent login on multiple devices
      if (candidate.status === 'in_progress') {
        const isSameSession = sessionToken && candidate.session_token === sessionToken;
        
        if (!isSameSession && candidate.last_heartbeat) {
          const lastPingMs = new Date(candidate.last_heartbeat).getTime();
          const secondsSincePing = Math.floor((serverTimeMs - lastPingMs) / 1000);

          // If active ping within the last 40 seconds on another browser/device
          if (secondsSincePing < 40) {
            return {
              decision: 'BLOCK',
              code: 'DUPLICATE_SESSION_ACTIVE',
              reason: 'Another active exam session is currently running on a different device or browser tab. Simultaneous sessions are rejected.',
              serverTime: serverNow.toISOString()
            };
          }
        }
      }
    }
  }

  // All checks satisfied!
  return {
    decision: 'ALLOW',
    code: 'ACCESS_GRANTED',
    reason: 'Exam link and candidate credentials verified successfully.',
    serverTime: serverNow.toISOString(),
    exam: {
      id: exam.id,
      title: exam.title,
      companyName: exam.company_name,
      durationMinutes: exam.duration_minutes,
      cameraMandatory: Boolean(exam.camera_mandatory),
      cameraGracePeriodSeconds: exam.camera_grace_period_seconds || 20,
      requiresAccessCode: Boolean(exam.access_code),
      proctoringEnabled: Boolean(exam.proctoring_enabled)
    }
  };
}

module.exports = {
  evaluateExamAccess
};
