const mockInterviewAgent = require('./src/services/agents/mockInterviewAgent.js');
const isValidInterviewQuestion = mockInterviewAgent.isValidInterviewQuestion.bind(mockInterviewAgent);
const getSafeCompleteFallback = mockInterviewAgent.getSafeCompleteFallback.bind(mockInterviewAgent);

console.log('Testing Question Validator and Fallback Generator...');

let failed = 0;
let passed = 0;

function assert(condition, name) {
  if (condition) {
    console.log(`  ✓ PASS: ${name}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${name}`);
    failed++;
  }
}

// 1. Incomplete / Short Questions that MUST BE REJECTED
const badQuestions = [
  'Explain REST API',
  'Tell me Node.js',
  'What is SQL?',
  'Explain Docker.',
  'What is polymorphism?',
  'Describe agile methodology',
  'Tell me about CI/CD',
  'How does Redis work?',
  'What is Kubernetes?',
  '1. Explain REST API and microservices',
  'What is your experience?'
];

badQuestions.forEach(q => {
  assert(!isValidInterviewQuestion(q), `Correctly rejected bad/short/incomplete question: "${q}"`);
});

// 2. Complete / Rich Questions that MUST BE ACCEPTED
const goodQuestions = [
  'Can you explain what a REST API is and describe how you have used REST APIs in one of your projects?',
  'Can you explain why you chose Node.js for your project and how you handled API requests using Node.js and Express?',
  'Can you explain the role of SQL in database management and describe an example where you wrote a complex query?',
  'How do you approach automated testing in your CI/CD pipeline when deploying code to production environments?',
  'Could you walk me through a challenging bug you encountered in a recent project and how you diagnosed and resolved it?'
];

goodQuestions.forEach(q => {
  assert(isValidInterviewQuestion(q), `Correctly accepted complete question: "${q.substring(0, 45)}..."`);
});

// 3. Duplicate rejection
const history = [
  'Can you explain what a REST API is and describe how you have used REST APIs in one of your projects?'
];
assert(!isValidInterviewQuestion(history[0], history), 'Correctly rejected duplicate question in history');

// 4. Test safe fallbacks across roles and rounds
const roles = [
  'QA / Test Engineer',
  'Full Stack Developer',
  'Data Analyst',
  'DevOps & Cloud Engineer',
  'Product Manager'
];

roles.forEach(role => {
  for (let round = 1; round <= 4; round++) {
    const fallbackObj = getSafeCompleteFallback({
      targetRole: role,
      company: 'Acme Corp',
      role: role,
      roundNumber: round,
      questionIndex: 1
    });
    const questionText = fallbackObj.question;
    const valid = isValidInterviewQuestion(questionText);
    const wordCount = questionText.trim().split(/\s+/).length;
    assert(valid && wordCount >= 12, `Fallback for ${role} (Round ${round}) is valid & complete (${wordCount} words): "${questionText.substring(0, 40)}..."`);
  }
});

console.log(`\n================================================================`);
console.log(`VALIDATOR TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log(`================================================================`);
if (failed > 0) process.exit(1);
