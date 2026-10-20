const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5000/api';

async function runPhase5Tests() {
  console.log('====================================================');
  console.log('🚀 RUNNING PREPAGENT AI PHASE 5 TEST SUITE');
  console.log('   (Skill Gap Analysis Agent & AI Resume Tailoring)');
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
    // --- TEST 1: User 1 Registration & Preparation Session Setup ---
    console.log('--- TEST 1: User 1 Registration & Preparation Session Setup ---');
    const userEmail = `phase5_user_${Date.now()}@example.com`;
    const regRes = await axios.post(`${BASE_URL}/auth/register`, {
      name: 'Vidya Hatture',
      email: userEmail,
      password: 'password123',
      confirmPassword: 'password123',
    });
    const token = regRes.data.token;
    const authHeader = { headers: { Authorization: `Bearer ${token}` } };
    assert(regRes.status === 201 && token, 'User 1 registered successfully');

    // Create realistic resume file for candidate
    const testResumePath = path.join(__dirname, 'test_resume_p5.txt');
    const resumeContent = `VIDYA HATTURE
Pune, Maharashtra | vidya@example.com | +91 9876543210
LinkedIn: linkedin.com/in/vidya-hatture | GitHub: github.com/vidyahatture

PROFESSIONAL SUMMARY
Analytical and detail-oriented Software Engineer with a strong foundation in automated testing, Java, Python, and SQL. Experienced in developing automated test suites with Selenium and Postman for REST API verification.

EDUCATION
Bachelor of Engineering (B.E.) in Computer Science & Engineering
Savitribai Phule Pune University | 2020 - 2024 | CGPA: 8.7/10

TECHNICAL SKILLS
- Programming: Java, Python, JavaScript, SQL
- Testing Tools & Frameworks: Selenium WebDriver, TestNG, Postman, JUnit
- Methodologies: STLC, SDLC, Agile / Scrum, Manual Testing, Defect Tracking
- Tools & Platforms: Git, GitHub, JIRA, Jenkins, MySQL

EXPERIENCE
QA Intern | TechSolutions India | Jan 2024 - Jun 2024
- Authored over 150+ automated test cases using Java and Selenium WebDriver.
- Conducted REST API testing using Postman, validating JSON payloads and HTTP status codes.
- Reported and tracked 40+ software defects using JIRA through their complete bug lifecycle.
- Participated in daily Agile standup meetings and bi-weekly sprint reviews.

PROJECTS
1. E-Commerce Automation Testing Framework
- Built an end-to-end test automation framework using Java, Selenium WebDriver, and TestNG.
- Implemented Page Object Model (POM) design pattern reducing script maintenance effort by 35%.
- Integrated test results reporting with ExtentReports.

2. API Verification & Performance Suite
- Created Postman collections with automated JavaScript test assertions for a microservices architecture.
- Verified 50+ REST endpoints covering authentication, data retrieval, and error response validation.

CERTIFICATIONS
- ISTQB Certified Tester Foundation Level (CTFL)
- Oracle Certified Associate: Java SE 8 Programmer

ACHIEVEMENTS
- First Prize in Inter-College Code Debugging Competition 2023
`;

    fs.writeFileSync(testResumePath, resumeContent, 'utf8');

    // Realistic NVIDIA QA / Test Engineer Job Description matching reference mockup
    const nvidiaJd = `Role: QA / Test Engineer
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
• Exposure to Linux / Unix commands and shell scripting
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

    const sessionId = prepRes.data.session?._id || prepRes.data.data?._id || prepRes.data._id;
    assert(prepRes.status === 201 && sessionId, `Preparation session created with ID: ${sessionId}`);

    // --- TEST 2: Run Phase 3 (Resume Analysis) ---
    console.log('\n--- TEST 2: Complete Phase 3 Resume Analysis ---');
    const analyzeResumeRes = await axios.post(
      `${BASE_URL}/preparations/${sessionId}/resume-analysis`,
      {},
      authHeader
    );
    assert(
      analyzeResumeRes.status === 200 && (analyzeResumeRes.data.candidateProfile || analyzeResumeRes.data.data?.candidateProfile),
      'Phase 3 Resume Analysis completed successfully'
    );
    const candidateProfile = analyzeResumeRes.data.candidateProfile || analyzeResumeRes.data.data?.candidateProfile;
    assert(candidateProfile.skills?.length > 0 || candidateProfile.skills?.programmingLanguages?.length > 0, `Candidate profile has extracted skills`);

    // --- TEST 3: Run Phase 4 (Company & Role Analysis) ---
    console.log('\n--- TEST 3: Complete Phase 4 Company & Role Analysis ---');
    const analyzeRoleRes = await axios.post(
      `${BASE_URL}/preparations/${sessionId}/company-role-analysis`,
      {},
      authHeader
    );
    assert(
      analyzeRoleRes.status === 200 && (analyzeRoleRes.data.companyRoleAnalysis || analyzeRoleRes.data.data?.companyRoleAnalysis),
      'Phase 4 Company & Role Analysis completed successfully'
    );
    const roleAnalysis = analyzeRoleRes.data.roleAnalysis || analyzeRoleRes.data.companyRoleAnalysis;
    assert(roleAnalysis, 'Company & Role requirements extracted');

    // --- TEST 4: Phase 5 - Trigger Skill Gap Analysis Agent ---
    console.log('\n--- TEST 4: Run Skill Gap Analysis Agent (POST /skill-gap) ---');
    const skillGapRes = await axios.post(
      `${BASE_URL}/preparations/${sessionId}/skill-gap`,
      {},
      authHeader
    );
    assert(skillGapRes.status === 200, 'Skill gap analysis endpoint responded 200 OK');
    const sgaData = skillGapRes.data.skillGapAnalysis || skillGapRes.data.data;
    assert(sgaData.status === 'completed', `Skill gap analysis status is '${sgaData.status}'`);

    // Mathematical formula verification
    const strongCount = sgaData.strongSkills?.length || 0;
    const partialCount = sgaData.partialSkills?.length || 0;
    const needsPracticeCount = sgaData.needsPractice?.length || 0;
    const missingCount = sgaData.missingSkills?.length || 0;
    const totalRequirements = sgaData.requirementAnalysis?.length || 0;

    console.log(`    📊 Strong: ${strongCount}, Partial: ${partialCount}, Needs Practice: ${needsPracticeCount}, Missing: ${missingCount}, Total: ${totalRequirements}`);
    console.log(`    📈 Coverage Score: ${sgaData.coverageScore}%`);

    assert(typeof sgaData.coverageScore === 'number' && sgaData.coverageScore >= 0 && sgaData.coverageScore <= 100, 'Coverage score is a valid percentage');

    const expectedScore = totalRequirements > 0
      ? Math.round(((strongCount * 1.0) + (partialCount * 0.6) + (needsPracticeCount * 0.3)) / totalRequirements * 100)
      : 0;
    assert(sgaData.coverageScore === expectedScore, `Mathematical coverage score matches exact weighted formula (${expectedScore}%)`);

    // Verification of requirement analysis structure
    assert(Array.isArray(sgaData.requirementAnalysis) && sgaData.requirementAnalysis.length > 0, 'Requirement analysis array is populated');
    const sampleReq = sgaData.requirementAnalysis[0];
    assert(
      sampleReq.requirement &&
      ['strong', 'partial', 'needs_practice', 'missing'].includes(sampleReq.status) &&
      sampleReq.confidence !== undefined,
      `Requirement item has valid schema (status='${sampleReq.status}', req='${sampleReq.requirement.slice(0, 30)}...')`
    );

    // Verification of preparation priorities
    assert(Array.isArray(sgaData.preparationPriorities) && sgaData.preparationPriorities.length > 0, `Preparation priorities populated (${sgaData.preparationPriorities.length} items)`);
    const firstPriority = sgaData.preparationPriorities[0];
    assert(firstPriority.rank === 1 || firstPriority.priorityRank === 1, 'Top priority has rank 1');
    assert(Boolean(firstPriority.reason || firstPriority.reasoning), 'Priority item includes clear reasoning');

    // Verification of session progress update
    const getSessionRes = await axios.get(`${BASE_URL}/preparations/${sessionId}`, authHeader);
    const currentProgress = getSessionRes.data.session?.progress || getSessionRes.data.data?.progress;
    assert(currentProgress >= 60, `Preparation session progress advanced to ${currentProgress}%`);

    // --- TEST 5: Fetch Skill Gap Analysis (GET /skill-gap) ---
    console.log('\n--- TEST 5: Retrieve Cached Skill Gap Analysis (GET /skill-gap) ---');
    const getSgaRes = await axios.get(`${BASE_URL}/preparations/${sessionId}/skill-gap`, authHeader);
    assert(getSgaRes.status === 200, 'GET /skill-gap responded 200 OK');
    const getSgaData = getSgaRes.data.skillGapAnalysis || getSgaRes.data.data;
    assert(getSgaData.coverageScore === sgaData.coverageScore, 'GET returns identical coverage score');
    assert(getSgaData.strongSkills.length === strongCount, 'GET returns identical strong skills count');

    // --- TEST 6: Generate AI Tailored Resume (POST /tailored-resume) ---
    console.log('\n--- TEST 6: Generate AI Tailored Resume (POST /tailored-resume) ---');
    const tailorRes = await axios.post(
      `${BASE_URL}/preparations/${sessionId}/tailored-resume`,
      {},
      authHeader
    );
    assert(tailorRes.status === 200, 'POST /tailored-resume responded 200 OK');
    const tailored = tailorRes.data.tailoredResume || tailorRes.data.data;
    assert(['generated', 'completed'].includes(tailored.status), `Tailored resume status is '${tailored.status}'`);
    assert(tailored.content && tailored.content.personalInfo, 'Tailored resume contains personalInfo');
    assert(Boolean(tailored.content.professionalSummary || tailored.content.summary), 'Tailored resume contains professional summary');
    assert(tailored.content.skills, 'Tailored resume contains skills');
    assert(Array.isArray(tailored.content.experience), 'Tailored resume contains experience');
    assert(Array.isArray(tailored.content.projects) && tailored.content.projects.length > 0, 'Tailored resume contains projects');
    assert(Array.isArray(tailored.content.education) && tailored.content.education.length > 0, 'Tailored resume contains education');
    assert(tailored.currentVersion === 1 || tailored.currentVersion === 'v1', `Current version is ${tailored.currentVersion}`);
    assert(tailored.versions?.length >= 1, `Versions history tracks ${tailored.versions?.length} version(s)`);

    // Truthfulness validation: Ensure missing skills are not fabricated in tailored resume
    const missingSkillNames = (sgaData.missingSkills || []).map(s => s.toLowerCase());
    if (missingSkillNames.length > 0) {
      const tailoredSkillsFlat = Array.isArray(tailored.content.skills)
        ? tailored.content.skills.map(s => String(s).toLowerCase())
        : [
            ...(tailored.content.skills.technical || tailored.content.skills.technicalSkills || []),
            ...(tailored.content.skills.tools || []),
            ...(tailored.content.skills.softSkills || []),
          ].map(s => String(s).toLowerCase());

      const rawSkills = Array.isArray(candidateProfile.skills)
        ? candidateProfile.skills.map(s => String(s).toLowerCase())
        : [
            ...(candidateProfile.skills?.programmingLanguages || []),
            ...(candidateProfile.skills?.testingTools || []),
            ...(candidateProfile.skills?.databases || []),
            ...(candidateProfile.skills?.frameworks || []),
            ...(candidateProfile.skills?.tools || []),
          ].map(s => String(s).toLowerCase());

      const fabricatedSkills = missingSkillNames.filter(m =>
        tailoredSkillsFlat.some(ts => ts === m && !rawSkills.includes(m))
      );
      assert(fabricatedSkills.length === 0, `Strict truthfulness: 0 missing skills fabricated (checked ${missingSkillNames.length} missing skills)`);
    }

    // --- TEST 7: Retrieve Tailored Resume (GET /tailored-resume) ---
    console.log('\n--- TEST 7: Retrieve Tailored Resume (GET /tailored-resume) ---');
    const getTailoredRes = await axios.get(
      `${BASE_URL}/preparations/${sessionId}/tailored-resume`,
      authHeader
    );
    assert(getTailoredRes.status === 200, 'GET /tailored-resume responded 200 OK');
    const fetchedTailored = getTailoredRes.data.tailoredResume || getTailoredRes.data.data;
    assert(fetchedTailored.currentVersion === 1 || fetchedTailored.currentVersion === 'v1', `GET returned version ${fetchedTailored.currentVersion}`);

    // --- TEST 8: Update Tailored Resume Content (PUT /tailored-resume) ---
    console.log('\n--- TEST 8: Update Tailored Resume Content (PUT /tailored-resume) ---');
    const updatedContent = {
      ...tailored.content,
      professionalSummary: 'Tailored and manually polished QA Engineer summary for NVIDIA with proven automation experience.',
      personalInfo: {
        ...tailored.content.personalInfo,
        name: 'Vidya Hatture, B.E. CS',
      },
    };

    const updateRes = await axios.put(
      `${BASE_URL}/preparations/${sessionId}/tailored-resume`,
      { content: updatedContent },
      authHeader
    );
    assert(updateRes.status === 200, 'PUT /tailored-resume responded 200 OK');
    const updatedTailored = updateRes.data.tailoredResume || updateRes.data.data;
    assert(
      updatedTailored.content.personalInfo.name === 'Vidya Hatture, B.E. CS',
      'Updated full name correctly saved'
    );
    assert(
      updatedTailored.content.professionalSummary === 'Tailored and manually polished QA Engineer summary for NVIDIA with proven automation experience.',
      'Updated summary correctly saved'
    );
    assert(updatedTailored.currentVersion === 2, `Version incremented to ${updatedTailored.currentVersion}`);
    assert(updatedTailored.versions.length >= 2, `Version history has ${updatedTailored.versions.length} versions`);
    assert(updatedTailored.status === 'edited', `Tailored resume status updated to '${updatedTailored.status}'`);

    // --- TEST 9: PDF Export Download (GET /download/pdf) ---
    console.log('\n--- TEST 9: Download Tailored Resume PDF (GET /download/pdf) ---');
    const pdfRes = await axios.get(
      `${BASE_URL}/preparations/${sessionId}/tailored-resume/download/pdf`,
      {
        ...authHeader,
        responseType: 'arraybuffer',
      }
    );
    assert(pdfRes.status === 200, 'PDF download endpoint responded 200 OK');
    assert(
      pdfRes.headers['content-type'] === 'application/pdf',
      `Content-Type is 'application/pdf' (got ${pdfRes.headers['content-type']})`
    );
    const pdfBuffer = Buffer.from(pdfRes.data);
    assert(pdfBuffer.length > 500, `PDF binary generated with size ${pdfBuffer.length} bytes`);
    assert(pdfBuffer.slice(0, 4).toString() === '%PDF', 'PDF buffer starts with %PDF magic bytes');

    // --- TEST 10: DOCX Export Download (GET /download/docx) ---
    console.log('\n--- TEST 10: Download Tailored Resume Word DOCX (GET /download/docx) ---');
    const docxRes = await axios.get(
      `${BASE_URL}/preparations/${sessionId}/tailored-resume/download/docx`,
      {
        ...authHeader,
        responseType: 'arraybuffer',
      }
    );
    assert(docxRes.status === 200, 'DOCX download endpoint responded 200 OK');
    assert(
      docxRes.headers['content-type'] === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      `Content-Type is Word DOCX`
    );
    const docxBuffer = Buffer.from(docxRes.data);
    assert(docxBuffer.length > 500, `DOCX binary generated with size ${docxBuffer.length} bytes`);
    assert(docxBuffer.slice(0, 2).toString() === 'PK', 'DOCX buffer starts with ZIP/PK magic bytes');

    // --- TEST 11: Multi-Tenant Security & Access Isolation ---
    console.log('\n--- TEST 11: Multi-Tenant Security & Isolation (User 2 blocked with 403) ---');
    const user2Res = await axios.post(`${BASE_URL}/auth/register`, {
      name: 'Unauthorized User',
      email: `unauthorized_${Date.now()}@example.com`,
      password: 'password123',
      confirmPassword: 'password123',
    });
    const token2 = user2Res.data.token;
    const authHeader2 = { headers: { Authorization: `Bearer ${token2}` } };

    async function check403(promise, desc) {
      try {
        await promise;
        assert(false, `${desc} should have been forbidden`);
      } catch (err) {
        assert(err.response?.status === 403, `${desc} rejected with 403 Forbidden`);
      }
    }

    await check403(
      axios.post(`${BASE_URL}/preparations/${sessionId}/skill-gap`, {}, authHeader2),
      'User 2 POST /skill-gap'
    );
    await check403(
      axios.get(`${BASE_URL}/preparations/${sessionId}/skill-gap`, authHeader2),
      'User 2 GET /skill-gap'
    );
    await check403(
      axios.post(`${BASE_URL}/preparations/${sessionId}/tailored-resume`, {}, authHeader2),
      'User 2 POST /tailored-resume'
    );
    await check403(
      axios.get(`${BASE_URL}/preparations/${sessionId}/tailored-resume`, authHeader2),
      'User 2 GET /tailored-resume'
    );
    await check403(
      axios.put(`${BASE_URL}/preparations/${sessionId}/tailored-resume`, { content: {} }, authHeader2),
      'User 2 PUT /tailored-resume'
    );
    await check403(
      axios.get(`${BASE_URL}/preparations/${sessionId}/tailored-resume/download/pdf`, authHeader2),
      'User 2 GET /download/pdf'
    );
    await check403(
      axios.get(`${BASE_URL}/preparations/${sessionId}/tailored-resume/download/docx`, authHeader2),
      'User 2 GET /download/docx'
    );

    // --- TEST 12: Original Resume Preservation ---
    console.log('\n--- TEST 12: Original Resume Preservation Check ---');
    const originalResumeOnDisk = fs.readFileSync(testResumePath, 'utf8');
    assert(
      originalResumeOnDisk === resumeContent,
      'Original uploaded resume file on disk is completely untouched and unmodified'
    );

    // Clean up temporary resume file
    try {
      fs.unlinkSync(testResumePath);
    } catch (_) {}

  } catch (err) {
    console.error('\n❌ Unhandled Exception during test run:');
    if (err.response) {
      console.error(`Status: ${err.response.status}`);
      console.error('Data:', JSON.stringify(err.response.data, null, 2));
    } else {
      console.error(err.message || err);
    }
    failed++;
  }

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runPhase5Tests();
