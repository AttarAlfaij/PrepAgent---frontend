const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const BASE_URL = 'http://localhost:5000/api';
const connectDB = require('./src/config/db');

async function runJobPreparationPlanTests() {
  await connectDB();
  console.log('================================================================');
  console.log('🎯 RUNNING PREPAGENT AI PHASE 6: JOB PREPARATION PLAN TEST SUITE');
  console.log('   (UI Alignment, Deterministic Engine, Dynamic Gaps, Progress Tracking)');
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
    const userAEmail = `plan_userA_${Date.now()}@example.com`;
    const regA = await axios.post(`${BASE_URL}/auth/register`, {
      name: 'Alice Engineer',
      email: userAEmail,
      password: 'password123',
      confirmPassword: 'password123',
    });
    const tokenA = regA.data.token;
    const userAId = regA.data.user?._id || regA.data.user?.id;
    const authHeaderA = { headers: { Authorization: `Bearer ${tokenA}` } };
    assert(tokenA && userAId, `User A registered (${userAEmail})`);

    const userBEmail = `plan_userB_${Date.now()}@example.com`;
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
    // TEST 2: Create Preparation Session with QA Test Resume & Nvidia JD
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: Preparation Session Creation (Nvidia - QA / Test Automation Engineer) ---');
    const resumePath = path.join(__dirname, 'test_plan_resume.txt');
    const resumeText = `
VIDYA HATTURE
Email: vidya@example.com | Phone: +1-555-0199 | Location: San Jose, CA
LinkedIn: linkedin.com/in/vidyahatture | GitHub: github.com/vidyahatture

PROFESSIONAL SUMMARY
Results-driven Quality Assurance Engineer with 3+ years experience in automated testing, Python test harnesses, and CI/CD pipelines. Skilled in designing scalable test frameworks, REST API validation with Postman/PyTest, and defect tracking.

TECHNICAL SKILLS
- Programming Languages: Python, JavaScript, Java (Basic), SQL
- Testing Frameworks: PyTest, Selenium WebDriver, Postman, Jest
- DevOps & Tools: Docker, Git, GitHub Actions, Jenkins, JIRA
- Databases: PostgreSQL, MongoDB

EXPERIENCE
Software QA Engineer | CloudTech Solutions (2022 - Present)
- Developed and maintained automated regression suites in Python using PyTest, reducing test execution cycles by 35%.
- Built automated API integration test pipelines in GitHub Actions ensuring 99.8% service uptime.
- Collaborated with software developers to triage and resolve 120+ high-severity bugs before production releases.

PROJECTS
E-Commerce Automated Test Suite
- Built an end-to-end automated testing framework using Python, Selenium, and PyTest for high-concurrency checkout workflows.
- Implemented automated visual regression testing and integrated nightly test runs with Slack reporting alerts.
Distributed Log Testing Harness
- Created mock microservices in Docker to simulate network latency, dropped packets, and server failovers under peak load.

EDUCATION
B.S. in Computer Science | State University (2018 - 2022)
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
      `Nvidia is looking for a QA / Test Engineer to validate cutting-edge GPU software, deep learning inference runtimes, and CUDA driver stacks.
Responsibilities:
- Build high-performance automated testing frameworks in Python and C++ for GPU compute stacks.
- Validate CUDA runtime libraries, GPU memory management, and latency profiling tools.
- Write robust test automation for TensorRT inference engines and deep learning frameworks (PyTorch, ONNX).
- Debug complex hardware/software interaction issues, memory leaks, and concurrency race conditions.
Requirements:
- Strong proficiency in Python and C/C++ debugging.
- Experience with automated test frameworks (PyTest) and Linux environments.
- Knowledge of GPU architectures, CUDA programming fundamentals, and performance profiling tools (Nsight).
- Experience with Docker, CI/CD pipelines, and high-performance distributed testing.`
    );

    const createRes = await axios.post(`${BASE_URL}/preparations`, form, {
      headers: {
        ...authHeaderA.headers,
        ...form.getHeaders(),
      },
    });

    const sessionId = createRes.data.session?._id;
    assert(sessionId, `Preparation session created for Nvidia (ID: ${sessionId})`);

    // Clean up temporary file
    try { fs.unlinkSync(resumePath); } catch (_) {}

    // -------------------------------------------------------------
    // TEST 3: Execute Preliminary Agents to establish realistic evidence
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: Executing Preliminary Agents (Phases 3, 4, 5) ---');
    const resumeRes = await axios.post(`${BASE_URL}/preparations/${sessionId}/resume-analysis`, {}, authHeaderA);
    assert(resumeRes.data.success, 'Resume Analysis completed');

    const companyRes = await axios.post(`${BASE_URL}/preparations/${sessionId}/company-role-analysis`, {}, authHeaderA);
    assert(companyRes.data.success, 'Company & Role Analysis completed');

    const skillGapRes = await axios.post(`${BASE_URL}/preparations/${sessionId}/skill-gap`, {}, authHeaderA);
    assert(skillGapRes.data.success, 'Skill Gap Analysis completed');
    const gaps = skillGapRes.data.skillGapAnalysis;
    assert(Array.isArray(gaps.missingSkills) && gaps.missingSkills.length > 0, `Detected missing skills: ${gaps.missingSkills.slice(0, 3).join(', ')}`);

    const tailoringRes = await axios.post(`${BASE_URL}/preparations/${sessionId}/tailored-resume`, {}, authHeaderA);
    assert(tailoringRes.data.success, 'Resume Tailoring completed');

    // -------------------------------------------------------------
    // TEST 4: Generate Job Preparation Plan (POST /:sessionId/preparation-plan)
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: Generate Job Preparation Plan ---');
    const planRes = await axios.post(`${BASE_URL}/preparations/${sessionId}/preparation-plan`, {}, authHeaderA);
    assert(planRes.status === 200 && planRes.data.success, 'Job Preparation Plan generated successfully');

    const plan = planRes.data.jobPreparationPlan;
    assert(plan && plan.status === 'completed', 'Plan status is "completed"');
    assert(typeof plan.readinessScore === 'number' && plan.readinessScore >= 45 && plan.readinessScore <= 100, `Readiness score computed deterministically (${plan.readinessScore}%)`);
    assert(plan.headline && plan.headline.length > 5, `Plan headline: "${plan.headline}"`);
    assert(plan.stagesCount === 6, `Stages count is 6 (${plan.stagesCount})`);
    assert(plan.estimatedWeeks === 6, `Estimated weeks is 6 (${plan.estimatedWeeks})`);

    // -------------------------------------------------------------
    // TEST 5: Verify Plan Data Structure Matches Reference Image
    // -------------------------------------------------------------
    console.log('\n--- TEST 5: Verify Plan Structure Matches Reference Image ---');
    // Priorities
    assert(Array.isArray(plan.priorities) && plan.priorities.length === 5, `Top 5 priorities returned (Count: ${plan.priorities.length})`);
    assert(plan.priorities[0].rank === 1 && plan.priorities[0].topic && plan.priorities[0].priority, `Priority #1: ${plan.priorities[0].topic} (${plan.priorities[0].priority})`);

    // Roadmap
    assert(Array.isArray(plan.roadmap) && plan.roadmap.length === 6, `Roadmap contains 6 connected stages (Count: ${plan.roadmap.length})`);
    assert(plan.roadmap[0].stageNumber === 1 && plan.roadmap[0].title && plan.roadmap[0].estimatedDuration, `Stage 1: "${plan.roadmap[0].title}" (${plan.roadmap[0].estimatedDuration})`);

    // Technical Preparation Table
    assert(Array.isArray(plan.technicalPreparation) && plan.technicalPreparation.length >= 5, `Technical Preparation table has rows (Count: ${plan.technicalPreparation.length})`);
    const firstTech = plan.technicalPreparation[0];
    assert(firstTech.topic && firstTech.category && firstTech.priority && firstTech.currentLevel && firstTech.targetLevel && firstTech.estimatedTime, `Tech table row schema complete: ${firstTech.topic} [${firstTech.category}] [${firstTech.priority}]`);

    // Skill Gap Preparation 2x2 Summary
    assert(plan.skillGapSummary && typeof plan.skillGapSummary.strongCount === 'number', `Skill gap summary contains counts (Strong: ${plan.skillGapSummary.strongCount}, Gaps: ${plan.skillGapSummary.missingCount})`);

    // Project Preparation Cards
    assert(Array.isArray(plan.projectPreparation) && plan.projectPreparation.length >= 2, `Project preparation cards returned (Count: ${plan.projectPreparation.length})`);
    assert(plan.projectPreparation[0].projectName && Array.isArray(plan.projectPreparation[0].preparationPoints) && plan.projectPreparation[0].preparationPoints.length >= 2, `Project 1: "${plan.projectPreparation[0].projectName}" has talking points`);

    // Resume Preparation Checklist
    assert(Array.isArray(plan.resumePreparation) && plan.resumePreparation.length >= 4, `Resume preparation checklist returned (Count: ${plan.resumePreparation.length})`);
    assert(plan.resumePreparation[0].id && plan.resumePreparation[0].text && plan.resumePreparation[0].completed === false, 'Resume checklist items start unchecked');

    // Behavioral Preparation Topics
    assert(Array.isArray(plan.behavioralPreparation) && plan.behavioralPreparation.length >= 4, `Behavioral preparation areas returned (Count: ${plan.behavioralPreparation.length})`);
    assert(plan.behavioralPreparation[0].topic && plan.behavioralPreparation[0].icon, `Behavioral topic 1: ${plan.behavioralPreparation[0].topic}`);

    // Schedule (6 Weeks, 7 Days each)
    assert(Array.isArray(plan.schedule) && plan.schedule.length === 6, `Schedule has 6 weeks (Count: ${plan.schedule.length})`);
    assert(plan.schedule[0].days.length === 7, `Week 1 has 7 daily tasks (Count: ${plan.schedule[0].days.length})`);
    assert(plan.schedule[0].days[0].day === 'Day 1' && plan.schedule[0].days[0].task, `Day 1 task: "${plan.schedule[0].days[0].task.slice(0, 45)}..."`);

    // Readiness Checklist
    assert(Array.isArray(plan.readinessChecklist) && plan.readinessChecklist.length === 6, `Readiness milestone checklist has 6 items (Count: ${plan.readinessChecklist.length})`);

    // -------------------------------------------------------------
    // TEST 6: GET Preparation Plan endpoint
    // -------------------------------------------------------------
    console.log('\n--- TEST 6: GET /api/preparations/:sessionId/preparation-plan ---');
    const getRes = await axios.get(`${BASE_URL}/preparations/${sessionId}/preparation-plan`, authHeaderA);
    assert(getRes.status === 200 && getRes.data.success, 'GET preparation plan returned 200 OK');
    assert(getRes.data.jobPreparationPlan.roadmap.length === 6, 'GET returned consistent roadmap stages');

    // -------------------------------------------------------------
    // TEST 7: Interactive Checklist Progress Updates (PUT /progress)
    // -------------------------------------------------------------
    console.log('\n--- TEST 7: Interactive Progress Updates & Dynamic Score Recalculation ---');
    const initialScore = plan.readinessScore;

    // Toggle day 1 of week 1
    const toggleScheduleRes = await axios.put(
      `${BASE_URL}/preparations/${sessionId}/preparation-plan/progress`,
      { type: 'schedule', weekNumber: 1, day: 'Day 1', completed: true },
      authHeaderA
    );
    assert(toggleScheduleRes.data.success, 'Schedule Day 1 marked as completed');
    assert(toggleScheduleRes.data.completedItems >= 1, `Completed items incremented (${toggleScheduleRes.data.completedItems})`);

    // Toggle resume prep item
    const resumeItemId = plan.resumePreparation[0].id;
    const toggleResumeRes = await axios.put(
      `${BASE_URL}/preparations/${sessionId}/preparation-plan/progress`,
      { type: 'resume', itemId: resumeItemId, completed: true },
      authHeaderA
    );
    assert(toggleResumeRes.data.success, 'Resume prep item marked as completed');

    // Toggle readiness checklist milestone
    const milestoneId = plan.readinessChecklist[0].id;
    const toggleMilestoneRes = await axios.put(
      `${BASE_URL}/preparations/${sessionId}/preparation-plan/progress`,
      { type: 'readiness', itemId: milestoneId, completed: true },
      authHeaderA
    );
    assert(toggleMilestoneRes.data.success, 'Readiness checklist milestone marked as completed');

    // Toggle technical preparation topic
    const techTopic = plan.technicalPreparation[0].topic;
    const toggleTechRes = await axios.put(
      `${BASE_URL}/preparations/${sessionId}/preparation-plan/progress`,
      { type: 'technical', topic: techTopic, completed: true },
      authHeaderA
    );
    assert(toggleTechRes.data.success, `Technical topic "${techTopic}" marked as completed`);
    assert(toggleTechRes.data.readinessScore >= initialScore, `Readiness score dynamically climbed from ${initialScore}% to ${toggleTechRes.data.readinessScore}%`);

    // Untoggle technical topic
    const untoggleTechRes = await axios.put(
      `${BASE_URL}/preparations/${sessionId}/preparation-plan/progress`,
      { type: 'technical', topic: techTopic, completed: false },
      authHeaderA
    );
    assert(untoggleTechRes.data.success, `Technical topic "${techTopic}" untoggled`);

    // -------------------------------------------------------------
    // TEST 8: Security & User Isolation
    // -------------------------------------------------------------
    console.log('\n--- TEST 8: Strict User Isolation (User B Accessing User A Plan) ---');
    try {
      await axios.get(`${BASE_URL}/preparations/${sessionId}/preparation-plan`, authHeaderB);
      assert(false, 'User B should have been blocked with 403');
    } catch (err) {
      assert(err.response?.status === 403, `User B blocked with 403 Forbidden: "${err.response?.data?.message}"`);
    }

    try {
      await axios.put(
        `${BASE_URL}/preparations/${sessionId}/preparation-plan/progress`,
        { type: 'schedule', weekNumber: 1, day: 'Day 1', completed: false },
        authHeaderB
      );
      assert(false, 'User B should have been blocked from modifying progress');
    } catch (err) {
      assert(err.response?.status === 404 || err.response?.status === 403, 'User B blocked from mutating plan progress');
    }

    // -------------------------------------------------------------
    // TEST 9: Orchestrator Integration & Status Progression
    // -------------------------------------------------------------
    console.log('\n--- TEST 9: Central Orchestrator Integration ---');
    const orchRes = await axios.get(`${BASE_URL}/preparations/${sessionId}/orchestrator/status`, authHeaderA);
    assert(orchRes.data.success, 'Orchestrator state retrieved');
    assert(orchRes.data.agents.jobPreparationPlan === 'completed', `jobPreparationPlan status in orchestrator is "completed" (got: ${orchRes.data.agents.jobPreparationPlan})`);
    assert(orchRes.data.nextAction === 'RUN_JOB_READINESS_TWIN' || orchRes.data.nextAction === 'READY_FOR_INTERVIEW_PLANNING', `Orchestrator nextAction points forward to Phase 7 Twin (got: ${orchRes.data.nextAction})`);

    // -------------------------------------------------------------
    // TEST 10: Plan Regeneration (POST /regenerate)
    // -------------------------------------------------------------
    console.log('\n--- TEST 10: Force Plan Regeneration ---');
    const regenRes = await axios.post(`${BASE_URL}/preparations/${sessionId}/preparation-plan/regenerate`, {}, authHeaderA);
    assert(regenRes.status === 200 && regenRes.data.success, 'Plan regenerated successfully');
    assert(regenRes.data.jobPreparationPlan.status === 'completed', 'Regenerated plan status is "completed"');

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

runJobPreparationPlanTests();
