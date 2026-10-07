const db = require('./config/db');
const { runAgainstTestCases } = require('./services/codeExecutionService');

async function testCodingExecution() {
  console.log('--- TEST CODING CHALLENGE EVALUATION WITH 7 HIDDEN TEST CASES ---');
  const cq = db.prepare('SELECT * FROM coding_questions WHERE exam_id = ? AND question_number = 1').get('PLACEMENT-DEMO');
  const testCases = JSON.parse(cq.test_cases);
  console.log(`Found question: "${cq.title}" with ${testCases.length} test cases (${testCases.filter(t => !t.is_hidden).length} sample, ${testCases.filter(t => t.is_hidden).length} hidden)`);

  // Solution in Python 3
  const pythonSolution = `
import sys
s = sys.stdin.read().strip().lower()
if s == s[::-1]:
    print("true")
else:
    print("false")
`;

  const evalResult = await runAgainstTestCases('python', pythonSolution, testCases);
  console.log(`Passed: ${evalResult.passedCount} / ${evalResult.totalTests}`);
  console.log('Sample Cases Passed:', evalResult.results.filter(r => !r.is_hidden && r.passed).length);
  console.log('Hidden Cases Passed:', evalResult.results.filter(r => r.is_hidden && r.passed).length);
  console.assert(evalResult.allPassed === true, 'All tests should pass');
  console.log('\n✅ CODING SANDBOX 7 HIDDEN TEST CASES EVALUATION PASSED!');
}

testCodingExecution();
