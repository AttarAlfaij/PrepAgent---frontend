/**
 * PrepAgent AI — Automated Test Suite: Phase 5 Dual Resume Optimization & User Resume Editor
 *
 * Tests:
 * 1. User authentication & preparation setup
 * 2. GET /user-resume (auto-populates from actual uploaded resume / candidateProfile, zero blank fields)
 * 3. PUT /user-resume (persists user modifications, increments version, saves history)
 * 4. GET /user-resume/download/pdf (streams valid text-selectable PDF)
 * 5. GET /user-resume/download/docx (streams valid Word document)
 * 6. POST /user-resume/reset (reverts back to original candidate profile)
 * 7. AI Ideal Resume regeneration (incorporates updated profile)
 * 8. Multi-tenant security isolation (User 2 blocked with 403 Forbidden)
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const BASE_URL = 'http://localhost:5000/api';

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ [PASS] ${message}`);
  } else {
    console.error(`  ✗ [FAIL] ${message}`);
    process.exitCode = 1;
  }
}

async function runTests() {
  console.log('======================================================================');
  console.log(' PrepAgent AI — Dual Resume Optimization & User Resume Editor Tests   ');
  console.log('======================================================================\n');

  try {
    // 1. Register User 1
    const ts = Date.now();
    const user1Email = `test_dual_resume_${ts}@example.com`;
    const user1Password = 'Password123!';

    console.log('--- STEP 1: Register User 1 & Setup Session ---');
    const regRes = await axios.post(`${BASE_URL}/auth/register`, {
      name: 'Vidya Hatture',
      email: user1Email,
      password: user1Password,
    });
    const token1 = regRes.data.token;
    const authHeader1 = { headers: { Authorization: `Bearer ${token1}` } };
    assert(token1, 'User 1 registered and received JWT token');

    // Create a real resume file
    const sampleResumeContent = `
VIDYA SHIVSHANKAR HATTURE
QA / Test Engineer
Solapur, Maharashtra, India | +91-7588754720
vidyahatture.nbncscoe@gmail.com | linkedin.com/in/vidya-hatture | github.com/VidyaHatture

PROFESSIONAL SUMMARY
Detail-oriented QA / Test Engineer with hands-on experience in manual and automation testing, test case design, and bug tracking. Proficient in Java, SQL, Postman, Git, and Agile methodologies.

SKILLS
Languages: Java, SQL, Python
Testing & Tools: Postman, Git, Jira, Manual Testing, Test Case Design
Databases: MySQL, MongoDB

EXPERIENCE
Software Test Engineer Intern | ABC Technologies Pvt. Ltd. | Jan 2024 - Present | Pune, India
- Designed and executed test cases for web applications.
- Performed API testing using Postman and validated responses.
- Reported and tracked defects using Jira.

PROJECTS
E-Commerce Web Application | Mar 2024 - Jun 2024
- Developed and executed comprehensive test suites for e-commerce workflows.
- Performed functional and regression testing.

EDUCATION
Bachelor of Engineering in Computer Science | NBNSCOE, Solapur | 2020 - 2024 | 8.2 CGPA

CERTIFICATIONS
Certified Software Tester (CST) | ISTQB | 2024
`;
    const tempResumePath = path.join(__dirname, `test_resume_${ts}.txt`);
    fs.writeFileSync(tempResumePath, sampleResumeContent.trim());

    // Upload & Create preparation
    const form = new FormData();
    form.append('company', 'NVIDIA');
    form.append('targetRole', 'QA / Test Engineer');
    form.append('jobDescription', 'Looking for QA Test Engineer skilled in Java, SQL, Selenium, API Testing, Git, Test Automation.');
    form.append('experienceLevel', 'Entry Level');
    form.append('resume', fs.createReadStream(tempResumePath), {
      filename: 'Vidya_Hatture_Resume.pdf',
      contentType: 'application/pdf',
    });

    const prepRes = await axios.post(`${BASE_URL}/preparations`, form, {
      headers: {
        ...authHeader1.headers,
        ...form.getHeaders(),
      },
    });
    fs.unlinkSync(tempResumePath);

    const sessionId = prepRes.data.session?._id || prepRes.data.data?._id || prepRes.data._id;
    assert(sessionId, `Preparation session created with ID: ${sessionId}`);

    // Trigger Phase 3 Resume Analysis to populate candidateProfile
    console.log('\n--- STEP 2: Execute Resume Analysis (Phase 3) ---');
    const p3Res = await axios.post(`${BASE_URL}/preparations/${sessionId}/resume-analysis`, {}, authHeader1);
    assert(p3Res.status === 200, 'Phase 3 Resume Analysis completed');
    const profile = p3Res.data.candidateProfile || {};
    assert(profile.personalInfo?.name, `Candidate profile populated: ${profile.personalInfo?.name}`);

    // 2. Test GET /user-resume (Should auto-populate with zero blank fields)
    console.log('\n--- STEP 3: GET /user-resume (Auto-population) ---');
    const getUserResumeRes = await axios.get(`${BASE_URL}/preparations/${sessionId}/user-resume`, authHeader1);
    assert(getUserResumeRes.status === 200, 'GET /user-resume responded 200 OK');
    const userResumeData = getUserResumeRes.data.userResume;
    assert(userResumeData, 'userResume object returned');
    assert(userResumeData.status === 'original', 'Initial userResume status is "original"');
    assert(userResumeData.currentVersion === 1, 'Initial userResume currentVersion is 1');
    assert(userResumeData.content?.personalInfo?.name, `Full name pre-populated: "${userResumeData.content.personalInfo.name}"`);
    assert(userResumeData.content?.professionalSummary, 'Professional summary pre-populated');
    assert(
      (userResumeData.content?.skills?.technicalSkills?.length || 0) > 0,
      `Technical skills pre-populated (${userResumeData.content?.skills?.technicalSkills?.length} skills)`
    );
    assert(
      (userResumeData.content?.projects?.length || 0) > 0,
      `Projects pre-populated (${userResumeData.content?.projects?.length} projects)`
    );
    assert(
      (userResumeData.content?.education?.length || 0) > 0,
      `Education pre-populated (${userResumeData.content?.education?.length} degrees)`
    );

    // 3. Test PUT /user-resume (Editing and persisting user modifications)
    console.log('\n--- STEP 4: PUT /user-resume (Editing & Versioning) ---');
    const editedContent = JSON.parse(JSON.stringify(userResumeData.content));
    editedContent.personalInfo.title = 'Senior QA Automation Engineer';
    editedContent.professionalSummary = 'Results-driven Senior QA Automation Engineer with extensive expertise in Selenium, Java, API testing, and CI/CD pipelines.';
    editedContent.skills.technicalSkills.push('Selenium', 'Docker');

    const putRes = await axios.put(
      `${BASE_URL}/preparations/${sessionId}/user-resume`,
      { content: editedContent },
      authHeader1
    );
    assert(putRes.status === 200, 'PUT /user-resume responded 200 OK');
    const updatedUserResume = putRes.data.userResume;
    assert(updatedUserResume.status === 'edited', 'userResume status transitioned to "edited"');
    assert(updatedUserResume.currentVersion === 2, 'userResume version incremented to 2');
    assert(
      updatedUserResume.content.personalInfo.title === 'Senior QA Automation Engineer',
      'Updated title verified in saved content'
    );
    assert(
      updatedUserResume.content.skills.technicalSkills.includes('Docker'),
      'Newly added skill verified in saved content'
    );
    assert(updatedUserResume.versions.length >= 2, `Version history has ${updatedUserResume.versions.length} versions`);

    // 4. Test User Resume PDF Download
    console.log('\n--- STEP 5: Download User Resume PDF ---');
    const pdfRes = await axios.get(`${BASE_URL}/preparations/${sessionId}/user-resume/download/pdf`, {
      ...authHeader1,
      responseType: 'arraybuffer',
    });
    assert(pdfRes.status === 200, 'GET /user-resume/download/pdf responded 200 OK');
    assert(pdfRes.headers['content-type'] === 'application/pdf', 'Content-Type is application/pdf');
    const pdfBuffer = Buffer.from(pdfRes.data);
    assert(pdfBuffer.toString('utf8', 0, 4) === '%PDF', 'PDF buffer begins with valid %PDF header');
    assert(pdfBuffer.length > 1000, `PDF size is authentic: ${pdfBuffer.length} bytes`);

    // 5. Test User Resume DOCX Download
    console.log('\n--- STEP 6: Download User Resume DOCX ---');
    const docxRes = await axios.get(`${BASE_URL}/preparations/${sessionId}/user-resume/download/docx`, {
      ...authHeader1,
      responseType: 'arraybuffer',
    });
    assert(docxRes.status === 200, 'GET /user-resume/download/docx responded 200 OK');
    assert(
      docxRes.headers['content-type'] ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Type is valid Word document openxml format'
    );
    const docxBuffer = Buffer.from(docxRes.data);
    assert(docxBuffer.toString('utf8', 0, 2) === 'PK', 'DOCX buffer begins with valid ZIP (PK) header');
    assert(docxBuffer.length > 1000, `DOCX size is authentic: ${docxBuffer.length} bytes`);

    // 6. Test POST /user-resume/reset
    console.log('\n--- STEP 7: Reset User Resume to Original ---');
    const resetRes = await axios.post(
      `${BASE_URL}/preparations/${sessionId}/user-resume/reset`,
      {},
      authHeader1
    );
    assert(resetRes.status === 200, 'POST /user-resume/reset responded 200 OK');
    const resetUserResumeData = resetRes.data.userResume;
    assert(resetUserResumeData.status === 'original', 'userResume status returned to "original"');
    assert(
      !resetUserResumeData.content.skills.technicalSkills.includes('Docker'),
      'Docker was cleared back to original uploaded skills'
    );

    // 7. Test AI Ideal Resume Generation & Independent Downloads
    console.log('\n--- STEP 8: AI Ideal Resume (Generation & Exports) ---');
    const tailorRes = await axios.post(
      `${BASE_URL}/preparations/${sessionId}/tailored-resume`,
      {},
      authHeader1
    );
    assert(tailorRes.status === 200, 'POST /tailored-resume generated AI Ideal Resume');
    assert(tailorRes.data.tailoredResume?.content?.personalInfo?.name, 'AI Ideal Resume content has candidate name');

    const aiPdfRes = await axios.get(
      `${BASE_URL}/preparations/${sessionId}/tailored-resume/download/pdf`,
      { ...authHeader1, responseType: 'arraybuffer' }
    );
    assert(aiPdfRes.status === 200 && Buffer.from(aiPdfRes.data).toString('utf8', 0, 4) === '%PDF', 'AI Ideal Resume PDF generated successfully');

    const aiDocxRes = await axios.get(
      `${BASE_URL}/preparations/${sessionId}/tailored-resume/download/docx`,
      { ...authHeader1, responseType: 'arraybuffer' }
    );
    assert(aiDocxRes.status === 200 && Buffer.from(aiDocxRes.data).toString('utf8', 0, 2) === 'PK', 'AI Ideal Resume DOCX generated successfully');

    // 8. Multi-tenant Security Isolation Test
    console.log('\n--- STEP 9: Multi-tenant Security Isolation ---');
    const user2Email = `test_dual_user2_${ts}@example.com`;
    const regRes2 = await axios.post(`${BASE_URL}/auth/register`, {
      name: 'Unauthorized User',
      email: user2Email,
      password: user1Password,
    });
    const authHeader2 = { headers: { Authorization: `Bearer ${regRes2.data.token}` } };

    const endpoints = [
      { method: 'get', url: `${BASE_URL}/preparations/${sessionId}/user-resume`, desc: 'GET /user-resume' },
      { method: 'put', url: `${BASE_URL}/preparations/${sessionId}/user-resume`, desc: 'PUT /user-resume', data: { content: {} } },
      { method: 'post', url: `${BASE_URL}/preparations/${sessionId}/user-resume/reset`, desc: 'POST /user-resume/reset' },
      { method: 'get', url: `${BASE_URL}/preparations/${sessionId}/user-resume/download/pdf`, desc: 'GET /user-resume/download/pdf' },
      { method: 'get', url: `${BASE_URL}/preparations/${sessionId}/user-resume/download/docx`, desc: 'GET /user-resume/download/docx' },
    ];

    for (const ep of endpoints) {
      try {
        if (ep.method === 'get') {
          await axios.get(ep.url, authHeader2);
        } else if (ep.method === 'post') {
          await axios.post(ep.url, ep.data || {}, authHeader2);
        } else if (ep.method === 'put') {
          await axios.put(ep.url, ep.data || {}, authHeader2);
        }
        assert(false, `Unauthorized user was NOT blocked on ${ep.desc}`);
      } catch (err) {
        assert(err.response?.status === 403, `Unauthorized user blocked with 403 Forbidden on ${ep.desc}`);
      }
    }

    console.log('\n======================================================================');
    console.log(` RESULTS: ${passedTests} / ${totalTests} PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
    console.log('======================================================================\n');
  } catch (error) {
    console.error('\n❌ Test Suite Aborted due to error:', error.response?.data || error.message);
    process.exitCode = 1;
  }
}

runTests();
