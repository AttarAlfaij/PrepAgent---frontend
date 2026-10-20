const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5000/api';

async function runPhase3Tests() {
  console.log('====================================================');
  console.log('🚀 RUNNING PREPAGENT AI PHASE 3 TEST SUITE');
  console.log('   (Resume Analysis Agent & Understanding Map)');
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
    // 1. User 1 Registration
    console.log('--- TEST 1: User Setup & Preparation Creation ---');
    const userEmail = `agent_user_${Date.now()}@example.com`;
    const regRes = await axios.post(`${BASE_URL}/auth/register`, {
      name: 'Vidya Hatture',
      email: userEmail,
      password: 'password123',
      confirmPassword: 'password123',
    });
    const token = regRes.data.token;
    const authHeader = { headers: { Authorization: `Bearer ${token}` } };
    assert(regRes.status === 201 && token, 'User registered successfully');

    // Create realistic resume file containing explicit skills, education, and projects (LeaveEase, WanderWave)
    const testResumePath = path.join(__dirname, 'test_resume.txt');
    const resumeTextContent = `
VIDYA HATTURE
Software Engineer
Email: vidya.hatture@example.com | Phone: (555) 123-4567
LinkedIn: linkedin.com/in/vidyahatture | GitHub: github.com/vidyahatture

EDUCATION
Bachelor of Technology in Computer Science and Engineering
University Institute of Technology (2020 - 2024)
CGPA: 8.8 / 10.0

SKILLS
Programming Languages: JavaScript, TypeScript, Python, Java
Frameworks & Libraries: React, Node.js, Express, Tailwind CSS
Databases: MongoDB, PostgreSQL, Redis
Tools & Cloud: Git, Docker, AWS, Postman, VS Code

PROJECTS
LeaveEase - Automated Leave and Attendance Management System
- Developed full-stack web application using React, Node.js, Express, and MongoDB.
- Implemented JWT authentication, role-based access control, and automated leave balance deduction.
- Optimized database indexing to accelerate query latency by 40%.

WanderWave - Travel Exploration & Booking Platform
- Architected responsive web platform utilizing React, Tailwind CSS, Python, and MongoDB.
- Built RESTful endpoints to query destinations and manage travel itineraries.

EXPERIENCE
Software Engineer Intern | Tech Innovators (Jun 2023 - Dec 2023)
- Built scalable microservices and REST APIs using Node.js and Express.
- Collaborated with senior engineers on system design and unit test coverage.
`;
    fs.writeFileSync(testResumePath, resumeTextContent);

    // Create Preparation Session
    const form = new FormData();
    form.append('targetRole', 'Software Engineer');
    form.append('company', 'NVIDIA');
    form.append('experienceLevel', 'Fresher');
    form.append('jobDescription', 'NVIDIA seeks a talented Software Engineer with strong foundations in distributed systems, clean code, and modern full-stack architectures.');
    form.append('resume', fs.createReadStream(testResumePath), {
      filename: 'Vidya_Hatture_Resume.pdf',
      contentType: 'application/pdf',
    });

    const prepRes = await axios.post(`${BASE_URL}/preparations`, form, {
      headers: { ...authHeader.headers, ...form.getHeaders() },
    });

    assert(prepRes.status === 201 && prepRes.data.session._id, 'Preparation session created with resume');
    const sessionId = prepRes.data.session._id;

    // 2. Query initial resume analysis status (Should be not_started)
    console.log('\n--- TEST 2: Initial Resume Analysis State (Before Analysis) ---');
    const initAnalysisRes = await axios.get(`${BASE_URL}/preparations/${sessionId}/resume-analysis`, authHeader);
    assert(initAnalysisRes.status === 200, 'Fetched initial resume analysis state');
    assert(
      initAnalysisRes.data.resumeAnalysis?.status === 'not_started' || !initAnalysisRes.data.resumeAnalysis?.status,
      'Initial status is not_started'
    );
    assert(
      !initAnalysisRes.data.candidateProfile?.personalInfo?.name,
      'Candidate profile is initially unpopulated'
    );

    // 3. Trigger Resume Analysis Agent (POST)
    console.log('\n--- TEST 3: Trigger Resume Analysis Agent (POST) ---');
    const analyzeRes = await axios.post(
      `${BASE_URL}/preparations/${sessionId}/resume-analysis`,
      {},
      authHeader
    );

    assert(analyzeRes.status === 200, 'Agent executed successfully');
    assert(analyzeRes.data.success === true, 'Success response flag is true');
    assert(analyzeRes.data.resumeAnalysis?.status === 'completed', 'Agent status transitioned to "completed"');
    assert(analyzeRes.data.progress >= 20, 'Preparation progress updated (milestone completed)');

    // 4. Verify Candidate Profile Structure
    console.log('\n--- TEST 4: Candidate Profile Structure & Content ---');
    const profile = analyzeRes.data.candidateProfile;
    assert(Boolean(profile), 'Candidate profile object exists');
    assert(profile.personalInfo?.name.toLowerCase().includes('vidya'), 'Candidate name correctly extracted');
    assert(profile.personalInfo?.email.includes('@'), 'Candidate email correctly extracted');
    assert(Array.isArray(profile.education) && profile.education.length > 0, 'Education history extracted');
    assert(profile.education[0].degree.includes('Bachelor'), 'Degree correctly structured');

    // Skills verification
    assert(Array.isArray(profile.skills?.programmingLanguages), 'Programming languages is an array');
    assert(profile.skills.programmingLanguages.includes('JavaScript') || profile.skills.programmingLanguages.includes('Python'), 'Core skills extracted');
    assert(Array.isArray(profile.skills?.databases), 'Databases is an array');
    assert(profile.skills.databases.includes('MongoDB'), 'MongoDB extracted in databases');

    // Projects verification
    assert(Array.isArray(profile.projects) && profile.projects.length >= 2, 'Projects array contains extracted projects');
    const leaveEase = profile.projects.find((p) => p.name.toLowerCase().includes('leaveease'));
    assert(Boolean(leaveEase), 'LeaveEase project extracted');
    assert(Array.isArray(leaveEase?.technologies), 'Project technologies is an array');

    // 4B. Verify Dynamic ATS Score & Compatibility Breakdown
    console.log('\n--- TEST 4B: Dynamic ATS Score & Compatibility Breakdown ---');
    const atsScore = analyzeRes.data.atsScore ?? analyzeRes.data.resumeAnalysis?.atsScore;
    const atsBreakdown = analyzeRes.data.atsBreakdown ?? analyzeRes.data.resumeAnalysis?.atsBreakdown;
    assert(typeof atsScore === 'number' && atsScore >= 0 && atsScore <= 100, `ATS Score is a valid number: ${atsScore}%`);
    assert(Boolean(atsBreakdown), 'ATS Breakdown object exists');
    assert(['Excellent', 'Good', 'Needs Improvement', 'Poor'].includes(atsBreakdown?.status), `ATS Status is valid: ${atsBreakdown?.status}`);
    assert(Array.isArray(atsBreakdown?.breakdown) && atsBreakdown.breakdown.length === 8, `ATS Breakdown contains all 8 evaluated factors (count: ${atsBreakdown?.breakdown?.length})`);

    const contactFactor = atsBreakdown?.breakdown?.find((f) => f.category === 'Contact Info');
    assert(Boolean(contactFactor) && contactFactor.score > 0, 'Contact Info evaluated with score');
    const skillsFactor = atsBreakdown?.breakdown?.find((f) => f.category === 'Skills');
    assert(Boolean(skillsFactor) && skillsFactor.score > 0, 'Skills factor evaluated with score');
    const formattingFactor = atsBreakdown?.breakdown?.find((f) => f.category === 'Formatting');
    assert(Boolean(formattingFactor) && formattingFactor.score > 0, 'ATS Formatting evaluated with score');

    // Also verify GET /resume-analysis returns ATS Score
    const getRes = await axios.get(`${BASE_URL}/preparations/${sessionId}/resume-analysis`, authHeader);
    assert(typeof getRes.data.atsScore === 'number' && getRes.data.atsScore === atsScore, 'GET returns consistent ATS score');

    // 5. Verify AI Resume Understanding Map (Feature ⭐)
    console.log('\n--- TEST 5: AI Resume Understanding Map Verification ---');
    const map = analyzeRes.data.resumeUnderstandingMap;
    assert(Boolean(map), 'Resume Understanding Map exists');
    assert(Array.isArray(map.nodes) && map.nodes.length > 0, 'Map contains entity nodes');
    assert(Array.isArray(map.relationships) && map.relationships.length > 0, 'Map contains relationship edges');

    const candidateNode = map.nodes.find((n) => n.id === 'candidate');
    assert(Boolean(candidateNode), 'Center Candidate node exists in Understanding Map');

    // Verify explicit technology-to-project relationships
    const usedInRelationships = map.relationships.filter((r) => r.relationship === 'used_in');
    assert(usedInRelationships.length > 0, 'Explicit "used_in" relationships identified');

    const mongoRelationship = usedInRelationships.find((r) => r.source.toLowerCase().includes('mongo') || r.source.toLowerCase().includes('react'));
    assert(Boolean(mongoRelationship), 'Skill to Project connection mapped (e.g. MongoDB/React used in LeaveEase)');

    // 6. Test Caching (POST without force should return existing analysis without re-running)
    console.log('\n--- TEST 6: Caching Behavior (Avoid redundant AI runs) ---');
    const secondPostRes = await axios.post(
      `${BASE_URL}/preparations/${sessionId}/resume-analysis`,
      {},
      authHeader
    );
    assert(secondPostRes.status === 200, 'Second call succeeded');
    assert(secondPostRes.data.alreadyAnalyzed === true, 'Returned cached result without re-executing');

    // 7. Test Explicit Re-Analysis (POST with force: true)
    console.log('\n--- TEST 7: Explicit Re-Analysis with force: true ---');
    const forceRes = await axios.post(
      `${BASE_URL}/preparations/${sessionId}/resume-analysis?force=true`,
      {},
      authHeader
    );
    assert(forceRes.status === 200, 'Re-analysis with force succeeded');
    assert(!forceRes.data.alreadyAnalyzed, 'Re-analyzed and updated session context');

    // 8. Test Multi-Tenant Security & Isolation
    console.log('\n--- TEST 8: Multi-Tenant Security & Session Isolation ---');
    const user2Res = await axios.post(`${BASE_URL}/auth/register`, {
      name: 'Unauthorized User',
      email: `intruder_${Date.now()}@example.com`,
      password: 'password123',
    });
    const user2Auth = { headers: { Authorization: `Bearer ${user2Res.data.token}` } };

    try {
      await axios.get(`${BASE_URL}/preparations/${sessionId}/resume-analysis`, user2Auth);
      assert(false, 'User 2 should NOT be allowed to view User 1 resume analysis');
    } catch (e) {
      assert(e.response && (e.response.status === 403 || e.response.status === 404), 'Unauthorized GET returns 403 Access Denied');
    }

    try {
      await axios.post(`${BASE_URL}/preparations/${sessionId}/resume-analysis`, {}, user2Auth);
      assert(false, 'User 2 should NOT be allowed to run analysis on User 1 session');
    } catch (e) {
      assert(e.response && (e.response.status === 403 || e.response.status === 404), 'Unauthorized POST returns 403 Access Denied');
    }

    // 9. Negative Constraints Check (No Skill Gap or Fake Scores in Phase 3)
    console.log('\n--- TEST 9: Strict Scope Boundaries (No Skill Gap / Fake Data) ---');
    assert(!analyzeRes.data.skillGap?.matchingSkills?.length, 'No fake skill gap generated');
    assert(!analyzeRes.data.evaluationResults, 'No fake evaluation generated');
    assert(analyzeRes.data.progress === 20, 'Progress reflects honest stage milestone without fake match percentage');

    // Clean up temporary files
    if (fs.existsSync(testResumePath)) {
      fs.unlinkSync(testResumePath);
    }

    console.log('\n====================================================');
    console.log(`🏁 PHASE 3 TEST SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('\n❌ UNEXPECTED TEST ERROR:', err.message);
    if (err.response) {
      console.error('Response data:', err.response.data);
    }
    process.exit(1);
  }
}

runPhase3Tests();
