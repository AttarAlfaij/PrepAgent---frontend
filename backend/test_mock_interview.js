const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const BASE_URL = 'http://localhost:5000/api';
const connectDB = require('./src/config/db');

async function runMockInterviewTests() {
  await connectDB();
  console.log('================================================================');
  console.log('🎯 RUNNING PREPAGENT AI PHASE 8: MOCK INTERVIEW TEST SUITE');
  console.log('   (Adaptive Questioning, Real-time Analysis, Integrity, Orchestration)');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------
    // TEST 1: User Registration & Session Isolation Setup
    // -------------------------------------------------------------
    console.log('--- TEST 1: User Registration & Session Isolation Setup ---');
    const userAEmail = `interview_userA_${Date.now()}@example.com`;
    const regA = await axios.post(`${BASE_URL}/auth/register`, {
      name: 'Alice QA Candidate',
      email: userAEmail,
      password: 'password123',
      confirmPassword: 'password123',
    });
    const tokenA = regA.data.token;
    const userAId = regA.data.user?._id || regA.data.user?.id;
    const authHeaderA = { headers: { Authorization: `Bearer ${tokenA}` } };
    assert(tokenA && userAId, `User A registered (${userAEmail})`);

    const userBEmail = `interview_userB_${Date.now()}@example.com`;
    const regB = await axios.post(`${BASE_URL}/auth/register`, {
      name: 'Bob Candidate',
      email: userBEmail,
      password: 'password123',
      confirmPassword: 'password123',
    });
    const tokenB = regB.data.token;
    const authHeaderB = { headers: { Authorization: `Bearer ${tokenB}` } };
    assert(tokenB, `User B registered (${userBEmail})`);

    // -------------------------------------------------------------
    // TEST 2: Preparation Session Creation
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: Preparation Session Creation (Nvidia - QA / Test Engineer) ---');
    const resumePath = path.join(__dirname, 'test_interview_resume.txt');
    const resumeText = `
VIDYA HATTURE
San Jose, CA | vidya@example.com | +1-555-0199

PROFESSIONAL SUMMARY
QA Automation Engineer with 3+ years experience testing GPU compute software, Python automation frameworks, and REST APIs.

TECHNICAL SKILLS
- Languages: Python, JavaScript, SQL, C++ (Basic)
- Automation Tools: PyTest, Selenium WebDriver, Postman, Docker
- Databases: PostgreSQL, MongoDB

EXPERIENCE
Software QA Engineer | DeepTech Labs (2022 - Present)
- Designed and maintained automated regression suites in PyTest, executing 400+ automated test cases nightly.
- Performed API testing and validation with Postman, ensuring zero critical regressions across 12 releases.

PROJECTS
Automated GPU Test Harness
- Built scalable test automation harnesses in Python for testing multi-threaded asynchronous tasks.
`;
    fs.writeFileSync(resumePath, resumeText);

    const form = new FormData();
    form.append('resume', fs.createReadStream(resumePath), {
      filename: 'Vidya_Resume.pdf',
      contentType: 'application/pdf',
    });
    form.append('company', 'Nvidia');
    form.append('targetRole', 'QA / Test Engineer');
    form.append('experienceLevel', 'Intermediate');
    form.append(
      'jobDescription',
      `Nvidia is looking for a QA / Test Engineer to validate CUDA runtime libraries, GPU compute drivers, and deep learning framework integration.
Requirements:
- Strong proficiency in Python, Linux, and automated test frameworks (PyTest).
- Experience with API testing, performance profiling, and test automation design.
- Familiarity with CUDA, C++, Docker, and CI/CD pipelines.`
    );

    const createRes = await axios.post(`${BASE_URL}/preparations`, form, {
      headers: {
        ...authHeaderA.headers,
        ...form.getHeaders(),
      },
    });

    const sessionId = createRes.data.session?._id;
    assert(sessionId, `Preparation session created (ID: ${sessionId})`);

    try { fs.unlinkSync(resumePath); } catch (_) {}

    // -------------------------------------------------------------
    // TEST 3: Preliminary Agents Execution (Phases 3 to 7)
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: Executing Preliminary Agents ---');
    await axios.post(`${BASE_URL}/preparations/${sessionId}/resume-analysis`, {}, authHeaderA);
    await axios.post(`${BASE_URL}/preparations/${sessionId}/company-role-analysis`, {}, authHeaderA);
    await axios.post(`${BASE_URL}/preparations/${sessionId}/skill-gap`, {}, authHeaderA);
    await axios.post(`${BASE_URL}/preparations/${sessionId}/tailored-resume`, {}, authHeaderA);
    await axios.post(`${BASE_URL}/preparations/${sessionId}/preparation-plan`, {}, authHeaderA);
    const twinRes = await axios.post(`${BASE_URL}/preparations/${sessionId}/readiness-twin/recalculate`, {}, authHeaderA);
    assert(twinRes.data.success, 'AI Job Readiness Twin generated as prerequisite');

    // -------------------------------------------------------------
    // TEST 4: Get Mock Interview Initial Setup State
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: GET /api/preparations/:sessionId/mock-interview ---');
    const setupStateRes = await axios.get(`${BASE_URL}/preparations/${sessionId}/mock-interview`, authHeaderA);
    assert(setupStateRes.status === 200 && setupStateRes.data.success, 'GET mock-interview returned 200 OK');
    assert(setupStateRes.data.company === 'Nvidia', `Dynamic company verified: ${setupStateRes.data.company}`);
    assert(setupStateRes.data.targetRole === 'QA / Test Engineer', `Dynamic role verified: ${setupStateRes.data.targetRole}`);
    assert(Array.isArray(setupStateRes.data.rounds) && setupStateRes.data.rounds.length === 4, '4 interview rounds defined');

    // -------------------------------------------------------------
    // TEST 5: Start Mock Interview (POST /mock-interview/start)
    // -------------------------------------------------------------
    console.log('\n--- TEST 5: Start Mock Interview ---');
    const startRes = await axios.post(`${BASE_URL}/preparations/${sessionId}/mock-interview/start`, {}, authHeaderA);
    assert(startRes.status === 200 && startRes.data.success, 'Mock interview started successfully');

    const mockSession = startRes.data.mockInterviewSession;
    assert(mockSession.status === 'active', 'Interview session status is "active"');
    assert(mockSession.currentRound === 1, `Starts at Round 1 (${mockSession.currentRoundTitle})`);
    assert(mockSession.questionNumber === 1, 'Current question number is 1');

    const q1 = mockSession.currentQuestion;
    assert(q1 && q1.question && q1.question.length > 15, `Question 1 generated: "${q1.question.slice(0, 50)}..."`);
    assert(q1.category === 'Technical', `Question 1 category is "${q1.category}"`);
    assert(q1.hint && q1.hint.length > 5, `Question 1 includes hint: "${q1.hint}"`);

    // -------------------------------------------------------------
    // TEST 6: Submit Candidate Answer & Adaptive Question 2
    // -------------------------------------------------------------
    console.log('\n--- TEST 6: Submit Answer 1 & Adaptive Question Generation ---');
    const ans1Text = `Black-box testing focuses on testing software without knowing internal code implementation, verifying inputs and outputs against functional requirements. White-box testing examines internal code structure, control flow, and branch coverage. At Nvidia, I would use black-box testing for end-to-end API and driver interface validation, and white-box testing for low-level memory bounds and unit test coverage.`;

    const answer1Res = await axios.post(
      `${BASE_URL}/preparations/${sessionId}/mock-interview/answer`,
      {
        answer: ans1Text,
        transcript: ans1Text,
        durationSeconds: 42,
      },
      authHeaderA
    );

    assert(answer1Res.status === 200 && answer1Res.data.success, 'Answer 1 processed successfully');
    assert(!answer1Res.data.isComplete, 'Interview continues to next question');

    const analysis1 = answer1Res.data.answerAnalysis;
    assert(typeof analysis1.relevance === 'number' && analysis1.relevance >= 60, `Answer 1 relevance: ${analysis1.relevance}%`);
    assert(typeof analysis1.technicalAccuracy === 'number' && analysis1.technicalAccuracy >= 60, `Answer 1 technical accuracy: ${analysis1.technicalAccuracy}%`);
    assert(analysis1.quality === 'Strong' || analysis1.quality === 'Partial', `Answer quality classified: ${analysis1.quality}`);
    assert(Array.isArray(analysis1.strengths) && analysis1.strengths.length > 0, 'Answer strengths identified');

    const q2 = answer1Res.data.nextQuestion;
    assert(q2 && q2.question && q2.question !== q1.question, `Adaptive Question 2 generated: "${q2.question.slice(0, 50)}..."`);
    assert(answer1Res.data.questionNumber === 2, `Question counter incremented to 2 (got: ${answer1Res.data.questionNumber})`);

    // -------------------------------------------------------------
    // TEST 7: Submit Answer 2 & Adaptive Progression
    // -------------------------------------------------------------
    console.log('\n--- TEST 7: Submit Answer 2 ---');
    const ans2Text = `To identify memory leaks in Python and C++ test harnesses, I utilize memory profilers like Valgrind or tracemalloc. In PyTest test suites, we monitor memory deltas across test fixture lifecycles and ensure all GPU handles and file descriptors are cleanly deallocated in teardown hooks.`;

    const answer2Res = await axios.post(
      `${BASE_URL}/preparations/${sessionId}/mock-interview/answer`,
      {
        answer: ans2Text,
        transcript: ans2Text,
        durationSeconds: 38,
      },
      authHeaderA
    );

    assert(answer2Res.status === 200 && answer2Res.data.success, 'Answer 2 processed successfully');
    assert(answer2Res.data.questionNumber === 3, 'Question counter incremented to 3');

    // -------------------------------------------------------------
    // TEST 8: Interview Integrity Signals & Warning Progression
    // -------------------------------------------------------------
    console.log('\n--- TEST 8: Interview Integrity Signals & Warning Levels ---');
    // Signal 1 (Low)
    const sig1Res = await axios.post(
      `${BASE_URL}/preparations/${sessionId}/mock-interview/integrity-signal`,
      { type: 'tab_blur', severity: 'low', description: 'Tab visibility changed.' },
      authHeaderA
    );
    assert(sig1Res.data.success, 'Signal 1 logged');
    assert(sig1Res.data.warningLevel === 1, `Signal 1 triggered Warning Level 1 (got: ${sig1Res.data.warningLevel})`);
    assert(sig1Res.data.warningMessage.includes('keep your face visible'), 'Non-accusatory warning message returned');

    // Signal 2 & 3 (Medium)
    await axios.post(
      `${BASE_URL}/preparations/${sessionId}/mock-interview/integrity-signal`,
      { type: 'no_face_detected', severity: 'medium', description: 'Face not detected for 5s.' },
      authHeaderA
    );
    const sig3Res = await axios.post(
      `${BASE_URL}/preparations/${sessionId}/mock-interview/integrity-signal`,
      { type: 'fullscreen_exit', severity: 'medium', description: 'Exited fullscreen.' },
      authHeaderA
    );
    assert(sig3Res.data.warningLevel === 2, `Signals 2-3 triggered Warning Level 2 (got: ${sig3Res.data.warningLevel})`);

    // Verify interview did NOT terminate
    const checkStateRes = await axios.get(`${BASE_URL}/preparations/${sessionId}/mock-interview`, authHeaderA);
    assert(checkStateRes.data.interviewState.status === 'active', 'Interview remains active after integrity signals');

    // -------------------------------------------------------------
    // TEST 9: Security & User Isolation
    // -------------------------------------------------------------
    console.log('\n--- TEST 9: Multi-tenant Security Isolation ---');
    try {
      await axios.get(`${BASE_URL}/preparations/${sessionId}/mock-interview`, authHeaderB);
      assert(false, 'User B should be blocked from User A interview session');
    } catch (err) {
      assert(err.response?.status === 404 || err.response?.status === 403, 'User B blocked with 403/404');
    }

    try {
      await axios.post(
        `${BASE_URL}/preparations/${sessionId}/mock-interview/answer`,
        { answer: 'Unauthorized answer' },
        authHeaderB
      );
      assert(false, 'User B should be blocked from answering User A interview');
    } catch (err) {
      assert(err.response?.status === 404 || err.response?.status === 403, 'User B mutation blocked with 403/404');
    }

    // -------------------------------------------------------------
    // TEST 10: End Interview & Verify Completion Summary
    // -------------------------------------------------------------
    console.log('\n--- TEST 10: End Mock Interview & Verify Completion Summary ---');
    const endRes = await axios.post(`${BASE_URL}/preparations/${sessionId}/mock-interview/end`, {}, authHeaderA);
    assert(endRes.status === 200 && endRes.data.success, 'Interview ended successfully');
    assert(endRes.data.isComplete, 'Result confirms isComplete: true');

    const snap = endRes.data.performanceSnapshot;
    assert(typeof snap.overallPerformance === 'number' && snap.overallPerformance >= 50, `Overall performance calculated dynamically: ${snap.overallPerformance}%`);
    assert(snap.questionsAnswered === 2, `Questions answered recorded: ${snap.questionsAnswered}`);
    assert(snap.badgeText && snap.summary, `Performance badge: "${snap.badgeText}"`);
    assert(snap.integritySignalsCount >= 3, `Integrity signals count recorded: ${snap.integritySignalsCount}`);

    // -------------------------------------------------------------
    // -------------------------------------------------------------
    // TEST 11: Orchestrator Integration
    // -------------------------------------------------------------
    console.log('\n--- TEST 11: Central Orchestrator Integration ---');
    const orchRes = await axios.get(`${BASE_URL}/preparations/${sessionId}/orchestrator/status`, authHeaderA);
    assert(orchRes.data.success, 'Orchestration status retrieved');
    assert(orchRes.data.agents.mockInterview === 'completed', `mockInterview agent status is "completed" (got: ${orchRes.data.agents.mockInterview})`);
    assert(orchRes.data.nextAction === 'READY_FOR_EVALUATION', `nextAction is READY_FOR_EVALUATION (got: ${orchRes.data.nextAction})`);

    // -------------------------------------------------------------
    // TEST 12: Multi-Role Adaptation Verification (Section 48)
    // -------------------------------------------------------------
    console.log('\n--- TEST 12: Multi-Role Adaptation Verification (Full Stack, Data Analyst, Custom Role) ---');
    fs.writeFileSync(resumePath, resumeText);

    // 12a. Full Stack Developer at Stripe
    const fsForm = new FormData();
    fsForm.append('resume', fs.createReadStream(resumePath), { filename: 'FS_Resume.pdf', contentType: 'application/pdf' });
    fsForm.append('company', 'Stripe');
    fsForm.append('targetRole', 'Full Stack Developer');
    fsForm.append('experienceLevel', 'Experienced');
    fsForm.append('jobDescription', 'Looking for Full Stack Developer experienced in React, Node.js, REST APIs, and microservices.');

    const fsPrepRes = await axios.post(`${BASE_URL}/preparations`, fsForm, {
      headers: { ...authHeaderA.headers, ...fsForm.getHeaders() },
    });
    const fsSessionId = fsPrepRes.data.session?._id || fsPrepRes.data.preparationSession?._id;
    const fsStartRes = await axios.post(`${BASE_URL}/preparations/${fsSessionId}/mock-interview/start`, {}, authHeaderA);
    assert(fsStartRes.data.success, 'Full Stack Developer mock interview started');
    assert(fsStartRes.data.mockInterviewSession.currentQuestion.question.length > 20, 'Full Stack specific question generated');
    const fsGetRes = await axios.get(`${BASE_URL}/preparations/${fsSessionId}/mock-interview`, authHeaderA);
    assert(fsGetRes.data.targetRole === 'Full Stack Developer', `Dynamic role matches Full Stack Developer (got: ${fsGetRes.data.targetRole})`);
    assert(fsGetRes.data.company === 'Stripe', `Dynamic company matches Stripe (got: ${fsGetRes.data.company})`);

    // 12b. Data Analyst at Snowflake
    const daForm = new FormData();
    daForm.append('resume', fs.createReadStream(resumePath), { filename: 'DA_Resume.pdf', contentType: 'application/pdf' });
    daForm.append('company', 'Snowflake');
    daForm.append('targetRole', 'Data Analyst');
    daForm.append('experienceLevel', 'Intermediate');
    daForm.append('jobDescription', 'Requires strong SQL querying, ETL pipelines, data warehousing, and business metrics visualization.');

    const daPrepRes = await axios.post(`${BASE_URL}/preparations`, daForm, {
      headers: { ...authHeaderA.headers, ...daForm.getHeaders() },
    });
    const daSessionId = daPrepRes.data.session?._id || daPrepRes.data.preparationSession?._id;
    const daStartRes = await axios.post(`${BASE_URL}/preparations/${daSessionId}/mock-interview/start`, {}, authHeaderA);
    assert(daStartRes.data.success, 'Data Analyst mock interview started');
    assert(daStartRes.data.mockInterviewSession.currentQuestion.question.length > 20, 'Data Analyst specific question generated');
    const daGetRes = await axios.get(`${BASE_URL}/preparations/${daSessionId}/mock-interview`, authHeaderA);
    assert(daGetRes.data.targetRole === 'Data Analyst', `Dynamic role matches Data Analyst (got: ${daGetRes.data.targetRole})`);
    assert(daGetRes.data.company === 'Snowflake', `Dynamic company matches Snowflake (got: ${daGetRes.data.company})`);

    // 12c. Custom Role: DevOps & Cloud Architect at Netflix
    const crForm = new FormData();
    crForm.append('resume', fs.createReadStream(resumePath), { filename: 'CR_Resume.pdf', contentType: 'application/pdf' });
    crForm.append('company', 'Netflix');
    crForm.append('targetRole', 'Other / Custom Role');
    crForm.append('customRole', 'DevOps & Cloud Architect');
    crForm.append('experienceLevel', 'Experienced');
    crForm.append('jobDescription', 'Kubernetes cluster management, multi-region AWS architectures, infrastructure-as-code with Terraform.');

    const crPrepRes = await axios.post(`${BASE_URL}/preparations`, crForm, {
      headers: { ...authHeaderA.headers, ...crForm.getHeaders() },
    });
    const crSessionId = crPrepRes.data.session?._id || crPrepRes.data.preparationSession?._id;
    const crStartRes = await axios.post(`${BASE_URL}/preparations/${crSessionId}/mock-interview/start`, {}, authHeaderA);
    assert(crStartRes.data.success, 'Custom Role mock interview started');
    assert(crStartRes.data.mockInterviewSession.currentQuestion.question.length > 20, 'Custom Role specific question generated');
    const crGetRes = await axios.get(`${BASE_URL}/preparations/${crSessionId}/mock-interview`, authHeaderA);
    assert(crGetRes.data.targetRole === 'DevOps & Cloud Architect', `Dynamic custom role matches (got: ${crGetRes.data.targetRole})`);
    assert(crGetRes.data.company === 'Netflix', `Dynamic company matches Netflix (got: ${crGetRes.data.company})`);

    try { fs.unlinkSync(resumePath); } catch (_) {}

  } catch (error) {
    console.error('UNEXPECTED TEST FAILURE:', error.response?.data || error.message);
    failed++;
  } finally {
    console.log('\n================================================================');
    console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================');
    await mongoose.disconnect();
    process.exit(failed > 0 ? 1 : 0);
  }
}

runMockInterviewTests();
