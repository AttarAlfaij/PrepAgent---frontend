const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5000/api';

async function runPhase4Tests() {
  console.log('====================================================');
  console.log('🚀 RUNNING PREPAGENT AI PHASE 4 TEST SUITE');
  console.log('   (Company & Role Analysis Agent & Requirement Map)');
  console.log('====================================================\n');

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
    // --- TEST 1: User Setup & Preparation Creation with Real Job Description ---
    console.log('--- TEST 1: User Setup & Preparation Creation ---');
    const userEmail = `phase4_user_${Date.now()}@example.com`;
    const regRes = await axios.post(`${BASE_URL}/auth/register`, {
      name: 'Vidya Hatture',
      email: userEmail,
      password: 'password123',
      confirmPassword: 'password123',
    });
    const token = regRes.data.token;
    const authHeader = { headers: { Authorization: `Bearer ${token}` } };
    assert(regRes.status === 201 && token, 'User registered successfully');

    // Create realistic resume file for session
    const testResumePath = path.join(__dirname, 'test_resume_p4.txt');
    fs.writeFileSync(
      testResumePath,
      'VIDYA HATTURE\nSoftware Engineer\nEmail: vidya@example.com\nEDUCATION: B.E. Computer Science'
    );

    // Realistic NVIDIA QA / Test Engineer Job Description matching reference mockup
    const nvidiaJd = `
Role: QA / Test Engineer
Company: NVIDIA
Location: Pune, Maharashtra
Job Type: Full Time
Experience Level: Fresher / Entry Level (0-2 years)

Role Overview:
The QA / Test Engineer role at NVIDIA focuses on ensuring the quality, reliability, and performance of software and hardware products. The role involves designing and executing test cases, automating tests, identifying defects, and collaborating with development teams to deliver high-quality products.

Key Responsibilities:
• Design and develop test cases, test plans, and automated test scripts
• Execute manual and automated tests across multiple platforms
• Identify, document, and track software defects and regressions
• Collaborate with cross-functional development teams to resolve issues
• Ensure product quality, performance, reliability, and compliance
• Maintain detailed testing documentation and defect reports
• Participate in Agile sprint planning and daily standup meetings

Requirements & Technical Skills:
• Strong knowledge of Software Testing Life Cycle (STLC) and QA methodologies
• Hands-on experience with Test Automation using Selenium, Appium, or Cypress
• Proficiency in programming languages: Java, Python, and SQL for database validation
• Experience with API Testing using Postman and RestAssured
• Familiarity with defect tracking and project management tools: JIRA, Confluence
• Knowledge of version control (Git) and CI/CD pipelines (Jenkins)
• Strong problem-solving, analytical thinking, and attention to detail
• Excellent written and verbal communication skills

Education & Experience:
• Bachelor's degree in Computer Science, Information Technology, Electronics, or related engineering field
• Strong fundamentals in software engineering and testing concepts
• 0-2 years of experience (Fresher / Entry Level)
• ISTQB or relevant testing certification is a plus
`;

    const form = new FormData();
    form.append('resume', fs.createReadStream(testResumePath), {
      filename: 'Vidya_Hatture_Resume.pdf',
      contentType: 'application/pdf',
    });
    form.append('targetRole', 'QA / Test Engineer');
    form.append('company', 'NVIDIA');
    form.append('jobDescription', nvidiaJd);
    form.append('experienceLevel', 'Fresher');

    const prepRes = await axios.post(`${BASE_URL}/preparations`, form, {
      headers: {
        ...authHeader.headers,
        ...form.getHeaders(),
      },
    });

    const sessionId = prepRes.data.session._id;
    assert(prepRes.status === 201 && sessionId, 'Preparation session created with Job Description');

    // Clean up temporary resume file
    if (fs.existsSync(testResumePath)) fs.unlinkSync(testResumePath);

    // --- TEST 2: Initial Phase 4 State ---
    console.log('\n--- TEST 2: Initial Company & Role Analysis State ---');
    const initRes = await axios.get(
      `${BASE_URL}/preparations/${sessionId}/company-role-analysis`,
      authHeader
    );
    assert(initRes.status === 200, 'Fetched initial company & role analysis state');
    assert(
      initRes.data.companyRoleAnalysis?.status === 'not_started' || !initRes.data.companyRoleAnalysis,
      'Initial status is not_started'
    );
    assert(!initRes.data.roleAnalysis?.roleSummary, 'Role analysis is initially unpopulated');

    // --- TEST 3: Trigger Company & Role Analysis Agent (POST) ---
    console.log('\n--- TEST 3: Trigger Company & Role Analysis Agent (POST) ---');
    const analyzeRes = await axios.post(
      `${BASE_URL}/preparations/${sessionId}/company-role-analysis`,
      {},
      authHeader
    );
    assert(analyzeRes.status === 200, 'Agent executed successfully');
    assert(analyzeRes.data.success === true, 'Success response flag is true');
    assert(
      analyzeRes.data.companyRoleAnalysis?.status === 'completed',
      'Agent status transitioned to "completed"'
    );
    assert(analyzeRes.data.progress >= 40, 'Preparation progress milestone updated (>= 40%)');

    // --- TEST 4: Structured Output Validation ---
    console.log('\n--- TEST 4: Structured Output Validation ---');
    const analysis = analyzeRes.data;

    // Company Analysis
    assert(analysis.companyAnalysis && typeof analysis.companyAnalysis === 'object', 'Company analysis object exists');
    assert(analysis.companyAnalysis.companyName === 'NVIDIA', 'Company name is correctly captured as NVIDIA');
    assert(analysis.companyAnalysis.industry && analysis.companyAnalysis.domain, 'Industry and domain are extracted');
    assert(analysis.companyAnalysis.companyContext.length > 20, 'Company context is present and factual');

    // Role Analysis
    assert(analysis.roleAnalysis && typeof analysis.roleAnalysis === 'object', 'Role analysis object exists');
    assert(analysis.roleAnalysis.roleTitle === 'QA / Test Engineer', 'Role title is QA / Test Engineer');
    assert(analysis.roleAnalysis.roleSummary && analysis.roleAnalysis.roleSummary.length > 30, 'Role summary is extracted');
    assert(Array.isArray(analysis.roleAnalysis.primaryResponsibilities), 'Primary responsibilities is an array');
    assert(analysis.roleAnalysis.primaryResponsibilities.length >= 3, `Primary responsibilities extracted (${analysis.roleAnalysis.primaryResponsibilities.length} found)`);
    assert(Array.isArray(analysis.roleAnalysis.keyHighlights), 'Key highlights is an array');
    assert(analysis.roleAnalysis.keyHighlights.length >= 3, 'Key highlights contains >= 3 items');

    // Requirements
    assert(analysis.requirements && typeof analysis.requirements === 'object', 'Requirements object exists');
    assert(Array.isArray(analysis.requirements.technicalSkills), 'Technical skills is an array');
    assert(analysis.requirements.technicalSkills.length >= 4, `Technical skills extracted (${analysis.requirements.technicalSkills.length} found)`);
    assert(Array.isArray(analysis.requirements.tools), 'Tools is an array');
    assert(analysis.requirements.tools.length >= 3, `Tools extracted (${analysis.requirements.tools.length} found)`);
    assert(Array.isArray(analysis.requirements.education), 'Education requirements is an array');
    assert(analysis.requirements.education.length >= 1, 'Education requirements extracted');
    assert(Array.isArray(analysis.requirements.experience), 'Experience requirements is an array');
    assert(analysis.requirements.experience.length >= 1, 'Experience requirements extracted');
    assert(Array.isArray(analysis.requirements.softSkills), 'Soft skills is an array');
    assert(analysis.requirements.softSkills.length >= 3, 'Soft skills extracted');

    // Interview Relevant Areas
    assert(Array.isArray(analysis.interviewRelevantAreas), 'Interview relevant areas is an array');
    assert(analysis.interviewRelevantAreas.length >= 3, `Interview relevant areas extracted (${analysis.interviewRelevantAreas.length} found)`);

    // --- TEST 5: AI Job Requirement Map Verification ---
    console.log('\n--- TEST 5: AI Job Requirement Map Verification ---');
    const reqMap = analysis.jobRequirementMap;
    assert(reqMap && typeof reqMap === 'object', 'Job Requirement Map exists');
    assert(Array.isArray(reqMap.nodes) && reqMap.nodes.length >= 5, `Map contains nodes (${reqMap.nodes.length} nodes)`);
    assert(Array.isArray(reqMap.relationships) && reqMap.relationships.length >= 4, `Map contains relationships (${reqMap.relationships.length} edges)`);

    const rootNode = reqMap.nodes.find((n) => n.id === 'root_role');
    assert(rootNode && rootNode.label.includes('QA / Test Engineer'), 'Root role node exists in Requirement Map');

    const catTech = reqMap.nodes.find((n) => n.id === 'cat_tech');
    const catResp = reqMap.nodes.find((n) => n.id === 'cat_resp');
    const catTools = reqMap.nodes.find((n) => n.id === 'cat_tools');
    const catSoft = reqMap.nodes.find((n) => n.id === 'cat_soft');
    assert(catTech && catResp && catTools && catSoft, 'All 4 category branches exist (Tech, Resp, Tools, Soft Skills)');

    const hasRootConnections = reqMap.relationships.some((r) => r.source === 'root_role');
    assert(hasRootConnections, 'Root node connects to category branches');

    // --- TEST 6: Caching Behavior ---
    console.log('\n--- TEST 6: Caching Behavior ---');
    const cachedRes = await axios.post(
      `${BASE_URL}/preparations/${sessionId}/company-role-analysis`,
      {},
      authHeader
    );
    assert(cachedRes.status === 200, 'Cached request succeeded');
    assert(cachedRes.data.alreadyAnalyzed === true, 'Returned cached result without re-executing agent');

    // --- TEST 7: Explicit Re-Analysis with force: true ---
    console.log('\n--- TEST 7: Explicit Re-Analysis with force: true ---');
    const forceRes = await axios.post(
      `${BASE_URL}/preparations/${sessionId}/company-role-analysis?force=true`,
      {},
      authHeader
    );
    assert(forceRes.status === 200, 'Re-analysis with force succeeded');
    assert(forceRes.data.alreadyAnalyzed === false, 'Re-executed agent and updated session');

    // --- TEST 8: Multi-Tenant Security & Session Isolation ---
    console.log('\n--- TEST 8: Multi-Tenant Security & Session Isolation ---');
    const user2Res = await axios.post(`${BASE_URL}/auth/register`, {
      name: 'Unauthorized User',
      email: `unauthorized_${Date.now()}@example.com`,
      password: 'password123',
      confirmPassword: 'password123',
    });
    const user2Auth = { headers: { Authorization: `Bearer ${user2Res.data.token}` } };

    try {
      await axios.get(`${BASE_URL}/preparations/${sessionId}/company-role-analysis`, user2Auth);
      assert(false, 'Unauthorized GET should fail');
    } catch (err) {
      assert(err.response?.status === 403, 'Unauthorized GET returns 403 Access Denied');
    }

    try {
      await axios.post(`${BASE_URL}/preparations/${sessionId}/company-role-analysis`, {}, user2Auth);
      assert(false, 'Unauthorized POST should fail');
    } catch (err) {
      assert(err.response?.status === 403, 'Unauthorized POST returns 403 Access Denied');
    }

    // --- TEST 9: Strict Scope Boundaries (No Skill Gap / No Fake Data) ---
    console.log('\n--- TEST 9: Strict Scope Boundaries (No Skill Gap / Fake Data) ---');
    assert(!analysis.skillGap?.matchingSkills?.length, 'No candidate vs JD matching generated');
    assert(!analysis.skillGap?.missingSkills?.length, 'No missing skills generated');
    assert(!analysis.matchScore, 'No fake match score generated');
    assert(!analysis.interviewQuestions, 'No interview questions generated');
    assert(!analysis.mockInterview, 'No mock interview data generated');

    // --- TEST 10: Phase 3 Integrity Check ---
    console.log('\n--- TEST 10: Phase 3 Integrity Check ---');
    const resumeAnalysisRes = await axios.get(
      `${BASE_URL}/preparations/${sessionId}/resume-analysis`,
      authHeader
    );
    assert(resumeAnalysisRes.status === 200, 'Phase 3 resume analysis endpoint remains accessible and intact');

    console.log('\n====================================================');
    console.log(`🏁 PHASE 4 TEST SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('Fatal error during Phase 4 test execution:', error.message);
    if (error.response?.data) console.error('Response data:', error.response.data);
    process.exit(1);
  }
}

runPhase4Tests();
