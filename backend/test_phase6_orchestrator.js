const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const BASE_URL = 'http://localhost:5000/api';

const connectDB = require('./src/config/db');

async function runPhase6Tests() {
  await connectDB();
  console.log('================================================================');
  console.log('🚀 RUNNING PREPAGENT AI PHASE 6 COMPREHENSIVE TEST SUITE');
  console.log('   (Agent Orchestrator + Preparation Context + Auto-Handoff)');
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
    // SETUP: Register Users A and B
    // -------------------------------------------------------------
    console.log('--- SETUP: Register Test Users ---');
    const userAEmail = `phase6_userA_${Date.now()}@example.com`;
    const regA = await axios.post(`${BASE_URL}/auth/register`, {
      name: 'Alice Candidate',
      email: userAEmail,
      password: 'password123',
      confirmPassword: 'password123',
    });
    const tokenA = regA.data.token;
    const userAId = regA.data.user?._id || regA.data.user?.id;
    const authHeaderA = { headers: { Authorization: `Bearer ${tokenA}` } };
    assert(tokenA && userAId, `User A registered (${userAEmail})`);

    const userBEmail = `phase6_userB_${Date.now()}@example.com`;
    const regB = await axios.post(`${BASE_URL}/auth/register`, {
      name: 'Bob Candidate',
      email: userBEmail,
      password: 'password123',
      confirmPassword: 'password123',
    });
    const tokenB = regB.data.token;
    const userBId = regB.data.user?._id || regB.data.user?.id;
    const authHeaderB = { headers: { Authorization: `Bearer ${tokenB}` } };
    assert(tokenB && userBId, `User B registered (${userBEmail})`);

    // Prepare resume file
    const testResumePath = path.join(__dirname, 'test_resume_p6.txt');
    const resumeContent = `ALICE CANDIDATE
Bengaluru, Karnataka | alice@example.com | +91 9988776655
LinkedIn: linkedin.com/in/alice-candidate | GitHub: github.com/alice-candidate

SUMMARY
Detail-oriented QA Automation Engineer with expertise in Java, Selenium, API testing, and SQL.

EDUCATION
B.E. in Information Science | VTU | 2020 - 2024 | CGPA: 8.5/10

TECHNICAL SKILLS
- Languages: Java, Python, SQL, JavaScript
- Automation Tools: Selenium WebDriver, TestNG, Postman, RestAssured
- Frameworks & CI/CD: Git, Jenkins, Maven, Agile / Scrum

EXPERIENCE
QA Automation Intern | GlobalTech Systems | Jan 2024 - Jun 2024
- Authored and maintained 100+ automated regression test scripts using Java and Selenium WebDriver.
- Executed REST API tests using Postman, verifying JSON response schemas and HTTP status codes.
- Identified and reported 30+ defects in JIRA.

PROJECTS
E-Commerce Automated Test Suite
- Built Page Object Model automation suite in Java and TestNG.
`;
    fs.writeFileSync(testResumePath, resumeContent, 'utf8');

    const jobDescriptionA = `Role: QA Automation Engineer
Company: Microsoft
Location: Bengaluru, Karnataka
Experience: Entry Level / 0-2 Years

Job Description:
We are looking for a passionate QA Automation Engineer to design, develop, and maintain automated tests for cloud applications.
Responsibilities:
- Build automation frameworks using Java, Selenium, and TestNG.
- Conduct automated REST API testing using Postman or RestAssured.
- Collaborate with agile engineering teams to ensure high code quality and test coverage.
- Report, track, and verify software defects using JIRA and Azure DevOps.

Requirements:
- Strong proficiency in Java or Python.
- Hands-on experience with Selenium WebDriver and Postman.
- Solid understanding of STLC, test planning, and defect lifecycle.
- Familiarity with SQL and relational databases.
`;

    // -------------------------------------------------------------
    // TEST 1: New Preparation Initialization State
    // -------------------------------------------------------------
    console.log('\n--- TEST 1: New Preparation Initialization State ---');
    const formA = new FormData();
    formA.append('resume', fs.createReadStream(testResumePath), {
      filename: 'Alice_Resume.pdf',
      contentType: 'application/pdf',
    });
    formA.append('targetRole', 'QA Automation Engineer');
    formA.append('company', 'Microsoft');
    formA.append('jobDescription', jobDescriptionA);
    formA.append('experienceLevel', 'Fresher');

    const prepResA = await axios.post(`${BASE_URL}/preparations`, formA, {
      headers: { ...authHeaderA.headers, ...formA.getHeaders() },
    });
    const sessionAId = prepResA.data.session?._id || prepResA.data._id;
    assert(sessionAId, `Preparation session created (ID: ${sessionAId})`);

    const statusRes1 = await axios.get(`${BASE_URL}/preparations/${sessionAId}/orchestrator/status`, authHeaderA);
    const state1 = statusRes1.data;
    assert(state1.success === true, 'Orchestration status returned success: true');
    assert(state1.nextAction === 'RUN_RESUME_ANALYSIS', `nextAction is RUN_RESUME_ANALYSIS (got: ${state1.nextAction})`);
    assert(state1.currentStage === 'resume_analysis', `currentStage is resume_analysis (got: ${state1.currentStage})`);
    assert(state1.progress === 10, `Initial progress is 10% (got: ${state1.progress}%)`);
    assert(state1.agents.resumeAnalysis === 'pending', `resumeAnalysis agent status is pending (got: ${state1.agents.resumeAnalysis})`);
    assert(state1.context && state1.context.session, 'PreparationContext partitions built correctly');

    // -------------------------------------------------------------
    // TEST 2: Run Next Agent -> Resume Analysis
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: Run Next Agent -> Resume Analysis ---');
    const runRes2 = await axios.post(`${BASE_URL}/preparations/${sessionAId}/orchestrator/run`, {}, authHeaderA);
    assert(runRes2.data.success === true, 'Run next agent succeeded');
    assert(runRes2.data.executedAgent === 'Resume Analysis Agent', `Executed agent is Resume Analysis Agent (got: ${runRes2.data.executedAgent})`);
    assert(runRes2.data.nextAction === 'RUN_COMPANY_ROLE_ANALYSIS', `nextAction transitioned to RUN_COMPANY_ROLE_ANALYSIS (got: ${runRes2.data.nextAction})`);
    assert(runRes2.data.currentStage === 'company_role_analysis', `currentStage is company_role_analysis (got: ${runRes2.data.currentStage})`);
    assert(runRes2.data.progress === 30, `Progress progressed to 30% (got: ${runRes2.data.progress}%)`);
    assert(runRes2.data.agents.resumeAnalysis === 'completed', 'Resume Analysis marked completed');

    // -------------------------------------------------------------
    // TEST 3: Run Next Agent -> Company & Role Analysis
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: Run Next Agent -> Company & Role Analysis ---');
    const runRes3 = await axios.post(`${BASE_URL}/preparations/${sessionAId}/orchestrator/run`, {}, authHeaderA);
    assert(runRes3.data.success === true, 'Run next agent succeeded');
    assert(runRes3.data.executedAgent === 'Company & Role Analysis Agent', `Executed agent is Company & Role Analysis Agent (got: ${runRes3.data.executedAgent})`);
    assert(runRes3.data.nextAction === 'RUN_SKILL_GAP_ANALYSIS', `nextAction transitioned to RUN_SKILL_GAP_ANALYSIS (got: ${runRes3.data.nextAction})`);
    assert(runRes3.data.currentStage === 'skill_gap_analysis', `currentStage is skill_gap_analysis (got: ${runRes3.data.currentStage})`);
    assert(runRes3.data.progress === 50, `Progress progressed to 50% (got: ${runRes3.data.progress}%)`);
    assert(runRes3.data.agents.companyRoleAnalysis === 'completed', 'Company & Role Analysis marked completed');

    // -------------------------------------------------------------
    // TEST 4: Run Next Agent -> Skill Gap Analysis
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: Run Next Agent -> Skill Gap Analysis ---');
    const runRes4 = await axios.post(`${BASE_URL}/preparations/${sessionAId}/orchestrator/run`, {}, authHeaderA);
    assert(runRes4.data.success === true, 'Run next agent succeeded');
    assert(runRes4.data.executedAgent === 'Skill Gap Analysis Agent', `Executed agent is Skill Gap Analysis Agent (got: ${runRes4.data.executedAgent})`);
    assert(runRes4.data.nextAction === 'RUN_RESUME_TAILORING', `nextAction transitioned to RUN_RESUME_TAILORING (got: ${runRes4.data.nextAction})`);
    assert(runRes4.data.currentStage === 'resume_tailoring', `currentStage is resume_tailoring (got: ${runRes4.data.currentStage})`);
    assert(runRes4.data.progress >= 70, `Progress progressed to >= 70% (got: ${runRes4.data.progress}%)`);
    assert(runRes4.data.agents.skillGap === 'completed', 'Skill Gap Analysis marked completed');

    // -------------------------------------------------------------
    // TEST 5: Run Next Agent -> Resume Tailoring & Readiness Twin
    // -------------------------------------------------------------
    console.log('\n--- TEST 5: Run Next Agent -> Resume Tailoring & Readiness Twin ---');
    const runRes5 = await axios.post(`${BASE_URL}/preparations/${sessionAId}/orchestrator/run`, {}, authHeaderA);
    assert(runRes5.data.success === true, 'Run next agent succeeded');
    assert(runRes5.data.executedAgent === 'Resume Tailoring Agent', `Executed agent is Resume Tailoring Agent (got: ${runRes5.data.executedAgent})`);
    assert(runRes5.data.agents.resumeTailoring === 'completed', 'Resume Tailoring marked completed');

    // Run next agent (Phase 7: AI Job Readiness Twin)
    const runRes5b = await axios.post(`${BASE_URL}/preparations/${sessionAId}/orchestrator/run`, {}, authHeaderA);
    assert(runRes5b.data.success === true, 'Run Phase 7 twin succeeded');
    assert(runRes5b.data.nextAction === 'READY_FOR_INTERVIEW_PLANNING', `nextAction reached READY_FOR_INTERVIEW_PLANNING (got: ${runRes5b.data.nextAction})`);
    assert(runRes5b.data.progress === 100, `Progress reached 100% (got: ${runRes5b.data.progress}%)`);

    // Check rerun prevention (idempotency)
    const runRes5Again = await axios.post(`${BASE_URL}/preparations/${sessionAId}/orchestrator/run`, {}, authHeaderA);
    assert(runRes5Again.data.alreadyCompleted === true, 'Re-run prevented when pipeline is already complete (alreadyCompleted: true)');

    // -------------------------------------------------------------
    // TEST 6: Change Detection - Job Description Change Invalidation
    // -------------------------------------------------------------
    console.log('\n--- TEST 6: Change Detection - Job Description Change Invalidation ---');
    const updateRes6 = await axios.put(
      `${BASE_URL}/preparations/${sessionAId}`,
      {
        company: 'Microsoft Cloud Services',
        jobDescription: jobDescriptionA + '\n- Additional requirement: Docker, Kubernetes, and Microservices.',
      },
      authHeaderA
    );
    assert(updateRes6.status === 200, 'Preparation session updated with modified company & JD');

    const statusRes6 = await axios.get(`${BASE_URL}/preparations/${sessionAId}/orchestrator/status`, authHeaderA);
    const state6 = statusRes6.data;
    assert(state6.agents.resumeAnalysis === 'completed', 'Resume Analysis remains COMPLETED (unaffected by JD change)');
    assert(state6.agents.companyRoleAnalysis === 'stale', 'Company Role Analysis marked STALE');
    assert(state6.agents.skillGap === 'stale', 'Skill Gap Analysis marked STALE');
    assert(state6.agents.resumeTailoring === 'stale', 'Resume Tailoring marked STALE');
    assert(state6.nextAction === 'RUN_COMPANY_ROLE_ANALYSIS', `nextAction updated to RUN_COMPANY_ROLE_ANALYSIS (got: ${state6.nextAction})`);

    // -------------------------------------------------------------
    // TEST 7: Change Detection - Resume Change Invalidation
    // -------------------------------------------------------------
    console.log('\n--- TEST 7: Change Detection - Resume Change Invalidation ---');
    // Call agentOrchestrator handleSessionChange directly or via mock
    const agentOrchestrator = require('./src/services/orchestrator/AgentOrchestrator');
    const state7 = await agentOrchestrator.handleSessionChange(sessionAId, userAId, ['resume']);
    assert(state7.agents.resumeAnalysis === 'stale', 'Resume Analysis marked STALE on resume change');
    assert(state7.agents.skillGap === 'stale', 'Skill Gap Analysis marked STALE on resume change');
    assert(state7.agents.resumeTailoring === 'stale', 'Resume Tailoring marked STALE on resume change');
    assert(state7.nextAction === 'RUN_RESUME_ANALYSIS', `nextAction updated to RUN_RESUME_ANALYSIS (got: ${state7.nextAction})`);

    // -------------------------------------------------------------
    // TEST 8: Failure Handling & Retry Action
    // -------------------------------------------------------------
    console.log('\n--- TEST 8: Failure Handling & Retry Action ---');
    const PreparationSession = require('./src/models/PreparationSession');
    const sessionDoc = await PreparationSession.findById(sessionAId);
    sessionDoc.resumeAnalysis.status = 'failed';
    sessionDoc.resumeAnalysis.error = 'Simulated OCR extraction timeout';
    await sessionDoc.save();

    const statusRes8 = await axios.get(`${BASE_URL}/preparations/${sessionAId}/orchestrator/status`, authHeaderA);
    assert(statusRes8.data.nextAction === 'RETRY_RESUME_ANALYSIS', `Failure state maps nextAction to RETRY_RESUME_ANALYSIS (got: ${statusRes8.data.nextAction})`);

    // Retry via /orchestrator/retry
    const retryRes8 = await axios.post(
      `${BASE_URL}/preparations/${sessionAId}/orchestrator/retry`,
      { agentKey: 'resume_analysis' },
      authHeaderA
    );
    assert(retryRes8.data.success === true, 'Retry action successfully triggered and re-executed agent');
    assert(retryRes8.data.agents.resumeAnalysis === 'completed', 'Resume Analysis transitioned to completed after retry');

    // -------------------------------------------------------------
    // TEST 9: Missing Resume Check (WAITING_FOR_USER)
    // -------------------------------------------------------------
    console.log('\n--- TEST 9: Missing Resume Check (WAITING_FOR_USER) ---');
    const agentRegistry = require('./src/services/orchestrator/AgentRegistry');
    const prereqCheck = agentRegistry.get('resume_analysis').checkPrerequisites({});
    assert(prereqCheck.satisfied === false && prereqCheck.waitingForUser === true, 'Registry correctly flags missing resume as unsatisfied prerequisite');

    // Simulate missing resume in DB
    await PreparationSession.findByIdAndUpdate(sessionAId, {
      $unset: { resumeId: 1, resumeSnapshot: 1 },
    });
    const statusRes9 = await axios.get(`${BASE_URL}/preparations/${sessionAId}/orchestrator/status`, authHeaderA);
    assert(statusRes9.data.nextAction === 'WAITING_FOR_USER', `Missing resume maps to WAITING_FOR_USER (got: ${statusRes9.data.nextAction})`);

    const runRes9 = await axios.post(`${BASE_URL}/preparations/${sessionAId}/orchestrator/run`, {}, authHeaderA);
    assert(runRes9.data.waitingForUser === true, 'Running agent with missing resume returns waitingForUser: true');

    // Restore resume snapshot for sessionA
    await PreparationSession.findByIdAndUpdate(sessionAId, {
      resumeId: sessionDoc.resumeId,
      resumeSnapshot: sessionDoc.resumeSnapshot,
    });

    // -------------------------------------------------------------
    // TEST 10: Missing Job Description Check (Company Role Blocked)
    // -------------------------------------------------------------
    console.log('\n--- TEST 10: Missing Job Description Check (Company Role Blocked) ---');
    await PreparationSession.findByIdAndUpdate(sessionAId, {
      jobDescription: 'Too short',
      'companyRoleAnalysis.status': 'not_started',
    });

    const statusRes10 = await axios.get(`${BASE_URL}/preparations/${sessionAId}/orchestrator/status`, authHeaderA);
    assert(statusRes10.data.nextAction === 'WAITING_FOR_USER', `Short JD maps to WAITING_FOR_USER before company analysis (got: ${statusRes10.data.nextAction})`);

    // Restore job description
    await PreparationSession.findByIdAndUpdate(sessionAId, {
      jobDescription: jobDescriptionA,
      'companyRoleAnalysis.status': 'completed',
    });

    // -------------------------------------------------------------
    // TEST 11: Strict User Isolation & Authorization (403 Forbidden)
    // -------------------------------------------------------------
    console.log('\n--- TEST 11: Strict Multi-Session Isolation & Authorization ---');
    let forbiddenCaughtStatus = false;
    let forbiddenCaughtRun = false;

    try {
      await axios.get(`${BASE_URL}/preparations/${sessionAId}/orchestrator/status`, authHeaderB);
    } catch (err) {
      if (err.response && err.response.status === 403) {
        forbiddenCaughtStatus = true;
      }
    }
    assert(forbiddenCaughtStatus, 'User B blocked from accessing User A orchestrator status (403 Forbidden)');

    try {
      await axios.post(`${BASE_URL}/preparations/${sessionAId}/orchestrator/run`, {}, authHeaderB);
    } catch (err) {
      if (err.response && err.response.status === 403) {
        forbiddenCaughtRun = true;
      }
    }
    assert(forbiddenCaughtRun, 'User B blocked from running User A orchestrated agents (403 Forbidden)');

    // -------------------------------------------------------------
    // TEST 12: Automated Pipeline Run (Auto-Orchestration Chain)
    // -------------------------------------------------------------
    console.log('\n--- TEST 12: Automated Pipeline Run (Auto-Orchestration Chain) ---');
    const formB = new FormData();
    formB.append('resume', fs.createReadStream(testResumePath), {
      filename: 'Bob_Resume.pdf',
      contentType: 'application/pdf',
    });
    formB.append('targetRole', 'QA Automation Engineer');
    formB.append('company', 'Amazon Web Services');
    formB.append('jobDescription', jobDescriptionA);
    formB.append('experienceLevel', 'Fresher');

    const prepResB = await axios.post(`${BASE_URL}/preparations`, formB, {
      headers: { ...authHeaderB.headers, ...formB.getHeaders() },
    });
    const sessionBId = prepResB.data.session?._id || prepResB.data._id;
    assert(sessionBId, `Preparation session created for User B (ID: ${sessionBId})`);

    // Trigger auto flow on fresh session
    const autoRes12 = await axios.post(
      `${BASE_URL}/preparations/${sessionBId}/orchestrator/auto`,
      {},
      authHeaderB
    );
    assert(autoRes12.data.success === true, 'Auto-orchestration completed successfully');
    assert(
      Array.isArray(autoRes12.data.executedAgents) && autoRes12.data.executedAgents.length >= 3,
      `Auto pipeline executed ${autoRes12.data.executedAgents?.length} agents: ${autoRes12.data.executedAgents?.join(' -> ')}`
    );
    assert(
      autoRes12.data.state?.nextAction === 'READY_FOR_INTERVIEW_PLANNING',
      `Auto pipeline terminated at READY_FOR_INTERVIEW_PLANNING (got: ${autoRes12.data.state?.nextAction})`
    );
    assert(autoRes12.data.state?.progress === 100, `Auto pipeline achieved 100% preparation progress (got: ${autoRes12.data.state?.progress}%)`);

    // Clean up temporary test file
    try {
      if (fs.existsSync(testResumePath)) fs.unlinkSync(testResumePath);
    } catch (e) {}

    // -------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------
    console.log('\n================================================================');
    console.log(`📊 PHASE 6 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================\n');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error) {
    console.error('\n❌ UNHANDLED TEST ERROR:', error.response?.data || error.message);
    process.exit(1);
  }
}

runPhase6Tests();
