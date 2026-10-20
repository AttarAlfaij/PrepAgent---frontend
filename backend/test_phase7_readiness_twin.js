const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const BASE_URL = 'http://localhost:5000/api';
const connectDB = require('./src/config/db');

async function runPhase7Tests() {
  await connectDB();
  console.log('================================================================');
  console.log('🎯 RUNNING PREPAGENT AI PHASE 7 COMPREHENSIVE TEST SUITE');
  console.log('   (AI Job Readiness Twin: Deterministic Engine & Orchestration)');
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
    // TEST 1: Register Test Users A & B for Isolation
    // -------------------------------------------------------------
    console.log('--- TEST 1: User Registration & Session Isolation Setup ---');
    const userAEmail = `phase7_userA_${Date.now()}@example.com`;
    const regA = await axios.post(`${BASE_URL}/auth/register`, {
      name: 'Alice QA Tester',
      email: userAEmail,
      password: 'password123',
      confirmPassword: 'password123',
    });
    const tokenA = regA.data.token;
    const userAId = regA.data.user?._id || regA.data.user?.id;
    const authHeaderA = { headers: { Authorization: `Bearer ${tokenA}` } };
    assert(tokenA && userAId, `User A registered (${userAEmail})`);

    const userBEmail = `phase7_userB_${Date.now()}@example.com`;
    const regB = await axios.post(`${BASE_URL}/auth/register`, {
      name: 'Bob Unauthorized',
      email: userBEmail,
      password: 'password123',
      confirmPassword: 'password123',
    });
    const tokenB = regB.data.token;
    const authHeaderB = { headers: { Authorization: `Bearer ${tokenB}` } };
    assert(tokenB, `User B registered (${userBEmail})`);

    // -------------------------------------------------------------
    // TEST 2: Create Preparation Session with QA Test Resume & TechCorp JD
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: Preparation Session Creation (QA / Test Engineer - TechCorp) ---');
    const resumePath = path.join(__dirname, 'test_qa_resume.txt');
    const resumeText = `
VIDYA HATTURE
Email: vidya@gmail.com | Phone: +1-234-567-8900

PROFESSIONAL SUMMARY
Quality Assurance Engineer with hands-on experience in manual testing, SDLC, STLC, SQL, and Java basics. Proven ability to design comprehensive test cases and perform API testing with Postman.

TECHNICAL SKILLS
- Testing: Manual Testing, SDLC, STLC, Black Box Testing, Regression Testing, API Testing
- Tools: Postman, JIRA, Git
- Languages: Java (Basic), SQL
- Database: MySQL, PostgreSQL

PROFESSIONAL EXPERIENCE
QA Test Engineer Intern | TechCorp Inc.
- Executed functional, regression, and sanity test cases for LeaveEase employee portal.
- Conducted API testing using Postman to validate response schemas and HTTP status codes.
- Identified and reported 30+ defects in JIRA with detailed repro steps.

PROJECTS
LeaveEase - Employee Leave Management System
- Automated Test Suite built with Page Object Model in Java.
- Tested user authentication, leave requests, and manager approval flows.
- Validated database states using complex SQL join queries.
`;
    fs.writeFileSync(resumePath, resumeText.trim());

    const jdText = `
Role: QA / Test Engineer
Company: TechCorp
Experience Level: Fresher / Entry Level

Job Description:
We are seeking a QA / Test Engineer to join our quality assurance engineering team.
Key Responsibilities:
- Design and execute test plans, test cases, and test scenarios.
- Perform Manual Testing, API Testing (REST APIs), and Functional Testing.
- Identify bugs, log defect reports, and verify fixes.
- Knowledge of Java, SQL databases, and SDLC / STLC lifecycle.
- Exposure to Test Automation frameworks (Selenium WebDriver) is highly desirable.
- Preferred: Familiarity with CI/CD tools (Jenkins) and version control (Git).
`;

    const form = new FormData();
    form.append('company', 'TechCorp');
    form.append('targetRole', 'QA / Test Engineer');
    form.append('jobDescription', jdText);
    form.append('experienceLevel', 'Fresher');
    form.append('resume', fs.createReadStream(resumePath), {
      filename: 'Vidya_Resume.pdf',
      contentType: 'application/pdf',
    });

    const createRes = await axios.post(`${BASE_URL}/preparations`, form, {
      headers: {
        ...authHeaderA.headers,
        ...form.getHeaders(),
      },
    });

    const sessionId = createRes.data.session._id;
    assert(sessionId, `Session created for QA / Test Engineer at TechCorp (ID: ${sessionId})`);

    // -------------------------------------------------------------
    // TEST 3: Prerequisites Guard on Job Readiness Twin
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: Prerequisites Validation (Twin requires Phases 3, 4, 5) ---');
    try {
      await axios.post(`${BASE_URL}/preparations/${sessionId}/readiness-twin/recalculate`, {}, authHeaderA);
      assert(false, 'Should NOT allow recalculation before prerequisites are satisfied');
    } catch (err) {
      assert(
        err.response?.status === 400 && err.response?.data?.message.includes('Prerequisites missing'),
        `Properly rejected twin generation with 400 when prerequisites missing: "${err.response?.data?.message}"`
      );
    }

    // -------------------------------------------------------------
    // TEST 4: Auto-Orchestrate Pipeline through Phases 3 -> 5 -> 7
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: Automated Agent Orchestration to Twin ---');
    const autoRes = await axios.post(`${BASE_URL}/preparations/${sessionId}/orchestrator/auto`, {}, authHeaderA);
    assert(autoRes.data.success, 'Auto-orchestrator completed execution chain');
    console.log(`  Agents executed: ${autoRes.data.executedAgents?.join(' -> ')}`);

    // Verify status
    const statusRes = await axios.get(`${BASE_URL}/preparations/${sessionId}/orchestrator/status`, authHeaderA);
    const orch = statusRes.data;
    assert(orch.agents?.resumeAnalysis === 'completed', 'Phase 3 (Resume Analysis) completed');
    assert(orch.agents?.companyRoleAnalysis === 'completed', 'Phase 4 (Company & Role) completed');
    assert(orch.agents?.skillGap === 'completed', 'Phase 5 (Skill Gap) completed');
    assert(orch.agents?.resumeTailoring === 'completed', 'Phase 5 (Resume Tailoring) completed');
    assert(orch.agents?.jobReadinessTwin === 'completed', 'Phase 7 (Job Readiness Twin) completed');
    assert(orch.progress === 100, `Orchestration progress reached 100% (Actual: ${orch.progress}%)`);

    // -------------------------------------------------------------
    // TEST 5: Verify AI Job Readiness Twin Deterministic Engine Output
    // -------------------------------------------------------------
    console.log('\n--- TEST 5: Deterministic Readiness Score & Dimensions ---');
    const twinRes = await axios.get(`${BASE_URL}/preparations/${sessionId}/readiness-twin`, authHeaderA);
    assert(twinRes.data.success, 'Fetched Job Readiness Twin');
    const twin = twinRes.data.jobReadinessTwin;

    console.log(`  Overall Score: ${twin.overallScore}% (${twin.readinessStatus})`);
    console.log(`  Score Delta: +${twin.scoreDelta}%`);
    console.log(`  Technical Readiness: ${twin.dimensions?.technical?.score}% (${twin.dimensions?.technical?.status})`);
    console.log(`  Job Requirement: ${twin.dimensions?.jobRequirements?.score}% (${twin.dimensions?.jobRequirements?.status})`);
    console.log(`  Project Readiness: ${twin.dimensions?.projects?.score}% (${twin.dimensions?.projects?.status})`);

    // Overall Score calibration
    assert(twin.overallScore >= 70 && twin.overallScore <= 80, `Overall Score is deterministic in target range (~74%): actual ${twin.overallScore}%`);
    assert(twin.readinessStatus === 'Approaching Readiness', `Readiness status is 'Approaching Readiness': actual '${twin.readinessStatus}'`);

    // Dimension breakdown
    assert(twin.dimensions?.technical?.score >= 70, `Technical Readiness score is high (actual: ${twin.dimensions?.technical?.score}%)`);
    assert(twin.dimensions?.technical?.status === 'Good', `Technical status is 'Good'`);
    assert(twin.dimensions?.jobRequirements?.status === 'Developing', `Job Requirements status is 'Developing'`);
    assert(twin.dimensions?.projects?.score >= 80, `Project Readiness score is high (actual: ${twin.dimensions?.projects?.score}%)`);

    // Null future dimensions
    assert(twin.dimensions?.problemSolving?.score === null, 'Problem Solving score is null (no fake data)');
    assert(twin.dimensions?.problemSolving?.status === 'not_enough_evidence', 'Problem Solving status is not_enough_evidence');
    assert(twin.dimensions?.communication?.score === null, 'Communication score is null');
    assert(twin.dimensions?.communication?.status === 'not_enough_evidence', 'Communication status is not_enough_evidence');
    assert(twin.dimensions?.resumeDefense?.score === null, 'Resume Defense score is null');
    assert(twin.dimensions?.resumeDefense?.status === 'awaiting_interview_evidence', 'Resume Defense status is awaiting_interview_evidence');

    // -------------------------------------------------------------
    // TEST 6: Structured Strengths, Risks, Next Best Action, and Table
    // -------------------------------------------------------------
    console.log('\n--- TEST 6: Structured Cards Verification ---');
    assert(Array.isArray(twin.topStrengths) && twin.topStrengths.length >= 3, `Top Strengths returned ${twin.topStrengths?.length} verified items`);
    assert(twin.topStrengths[0]?.level === 'Strong', `First strength has level 'Strong'`);

    assert(Array.isArray(twin.topRisks) && twin.topRisks.length >= 3, `Top Risks returned ${twin.topRisks?.length} ranked items`);
    assert(twin.topRisks[0]?.severity === 'High', `Top Risk #1 has severity 'High' (${twin.topRisks[0]?.topic})`);
    assert(twin.topRisks.some((r) => r.severity === 'Medium'), `Top Risks includes Medium severity risks`);

    assert(twin.nextBestAction?.actionTitle?.includes('Practice'), `Next Best Action has actionTitle: "${twin.nextBestAction?.actionTitle}"`);
    assert(Array.isArray(twin.nextBestAction?.focusAreas) && twin.nextBestAction.focusAreas.length >= 3, 'Next Best Action has focus area checklist');
    assert(twin.nextBestAction?.estimatedTime, `Next Best Action has estimatedTime: "${twin.nextBestAction?.estimatedTime}"`);

    assert(Array.isArray(twin.skillWiseReadiness) && twin.skillWiseReadiness.length >= 4, `Skill-wise table has ${twin.skillWiseReadiness?.length} entries`);
    assert(Array.isArray(twin.nextSteps) && twin.nextSteps.length === 4, `Next Steps in Journey has 4 milestones`);
    assert(Array.isArray(twin.insights) && twin.insights.length >= 3, `Readiness Insights has ${twin.insights?.length} bullet points`);
    assert(Array.isArray(twin.readinessHistory) && twin.readinessHistory.length >= 4, `Readiness history trajectory seeded with 4 milestones`);

    // -------------------------------------------------------------
    // TEST 7: Recalculate Endpoint
    // -------------------------------------------------------------
    console.log('\n--- TEST 7: Manual Recalculation API ---');
    const recalcRes = await axios.post(`${BASE_URL}/preparations/${sessionId}/readiness-twin/recalculate`, {}, authHeaderA);
    assert(recalcRes.data.success, 'Recalculated Job Readiness Twin successfully');
    assert(recalcRes.data.jobReadinessTwin?.scoreVersion >= 2, `Score version incremented: ${recalcRes.data.jobReadinessTwin?.scoreVersion}`);

    // -------------------------------------------------------------
    // TEST 8: Strict User Isolation Guard
    // -------------------------------------------------------------
    console.log('\n--- TEST 8: Session Security & Isolation ---');
    try {
      await axios.get(`${BASE_URL}/preparations/${sessionId}/readiness-twin`, authHeaderB);
      assert(false, 'User B should NOT be able to view User A readiness twin');
    } catch (err) {
      assert(err.response?.status === 404 || err.response?.status === 403, `User B blocked with status ${err.response?.status}`);
    }

    try {
      await axios.post(`${BASE_URL}/preparations/${sessionId}/readiness-twin/recalculate`, {}, authHeaderB);
      assert(false, 'User B should NOT be able to recalculate User A readiness twin');
    } catch (err) {
      assert(err.response?.status === 404 || err.response?.status === 403, `User B blocked from recalculation with status ${err.response?.status}`);
    }

    // Clean up temporary resume
    if (fs.existsSync(resumePath)) {
      fs.unlinkSync(resumePath);
    }
  } catch (error) {
    console.error('\n❌ TEST RUNNER EXCEPTION:', error.response?.data || error.message);
    failed++;
  } finally {
    console.log('\n================================================================');
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================\n');
    await mongoose.connection.close();
    process.exit(failed > 0 ? 1 : 0);
  }
}

runPhase7Tests();
