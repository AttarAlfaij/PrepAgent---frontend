const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('====================================================');
  console.log('🚀 RUNNING PREPAGENT AI PHASE 1 + 2 TEST SUITE');
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
    // 0. Health check
    console.log('--- TEST 0: Health Check ---');
    const health = await axios.get(`${BASE_URL}/health`);
    assert(health.status === 200 && health.data.status === 'online', 'Backend health is online');

    // 1. Validation checks on Register
    console.log('\n--- TEST 1: Registration Validation ---');
    try {
      await axios.post(`${BASE_URL}/auth/register`, {
        name: 'Test',
        email: 'invalid-email',
        password: '123',
      });
      assert(false, 'Should reject invalid email and short password');
    } catch (e) {
      assert(e.response && e.response.status === 400, 'Rejects invalid registration inputs with 400 Bad Request');
    }

    // 2. User 1 Registration
    console.log('\n--- TEST 2: User Registration & Password Hashing ---');
    const user1Email = `vidya_${Date.now()}@example.com`;
    const regRes = await axios.post(`${BASE_URL}/auth/register`, {
      name: 'Vidya Hatture',
      email: user1Email,
      password: 'password123',
      confirmPassword: 'password123',
    });
    assert(regRes.status === 201 && regRes.data.token, 'User 1 registered and JWT token returned');
    assert(regRes.data.user.name === 'Vidya Hatture', 'User name is correct');
    assert(!regRes.data.user.password, 'Password is NOT exposed in response');

    const token1 = regRes.data.token;
    const auth1 = { headers: { Authorization: `Bearer ${token1}` } };

    // Duplicate email check
    try {
      await axios.post(`${BASE_URL}/auth/register`, {
        name: 'Duplicate',
        email: user1Email,
        password: 'password123',
      });
      assert(false, 'Duplicate registration should fail');
    } catch (e) {
      assert(e.response && e.response.status === 400, 'Detects and blocks duplicate email');
    }

    // 3. User 1 Login
    console.log('\n--- TEST 3: User Login ---');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: user1Email,
      password: 'password123',
    });
    assert(loginRes.status === 200 && loginRes.data.token, 'Login successful with valid credentials');

    // Wrong password check
    try {
      await axios.post(`${BASE_URL}/auth/login`, {
        email: user1Email,
        password: 'wrongpassword',
      });
      assert(false, 'Login with wrong password should fail');
    } catch (e) {
      assert(e.response && e.response.status === 401, 'Rejects invalid password with 401 Unauthorized');
    }

    // 4. Session Persistence (/api/auth/me)
    console.log('\n--- TEST 4: Authentication Persistence (GET /api/auth/me) ---');
    const meRes = await axios.get(`${BASE_URL}/auth/me`, auth1);
    assert(meRes.status === 200 && meRes.data.user.email === user1Email, 'User profile verified via JWT token');

    // 5. First-Time User Detection (0 preparation sessions)
    console.log('\n--- TEST 5: First-Time User Routing Detection ---');
    const initPreps = await axios.get(`${BASE_URL}/preparations`, auth1);
    assert(initPreps.data.count === 0 && initPreps.data.sessions.length === 0, 'First-time user has 0 sessions (redirects to /preparation/setup)');

    // 6. Profile Editing
    console.log('\n--- TEST 6: User Profile Update ---');
    const updateProf = await axios.put(
      `${BASE_URL}/users/profile`,
      {
        phone: '+1 555-0199',
        bio: 'Aspiring AI and Software Engineer',
        education: 'B.Tech in Computer Science',
        experienceLevel: 'Fresher',
      },
      auth1
    );
    assert(updateProf.status === 200 && updateProf.data.user.profile.phone === '+1 555-0199', 'Profile updated successfully');

    // 7. Compulsory Field Validation for Preparation Setup
    console.log('\n--- TEST 7: Preparation Setup Compulsory Field Validation ---');
    try {
      await axios.post(`${BASE_URL}/preparations`, { company: 'NVIDIA' }, auth1);
      assert(false, 'Should reject incomplete preparation inputs');
    } catch (e) {
      assert(e.response && e.response.status === 400, 'Rejects preparation creation when compulsory inputs are missing');
    }

    // 8. Session A Creation with File Upload (NVIDIA)
    console.log('\n--- TEST 8: Session A Creation with Resume File Upload (NVIDIA) ---');
    const dummyPdfPath = path.join(__dirname, 'dummy_resume.pdf');
    fs.writeFileSync(dummyPdfPath, '%PDF-1.4 Dummy Resume for Vidya Hatture with skills in Python, Node, React');

    const formA = new FormData();
    formA.append('targetRole', 'Software Engineer');
    formA.append('company', 'NVIDIA');
    formA.append('experienceLevel', 'Fresher');
    formA.append('jobDescription', 'NVIDIA is seeking a passionate Software Engineer to work on GPU acceleration and system software.');
    formA.append('resume', fs.createReadStream(dummyPdfPath), {
      filename: 'Vidya_Hatture_Resume.pdf',
      contentType: 'application/pdf',
    });

    const createARes = await axios.post(`${BASE_URL}/preparations`, formA, {
      headers: {
        ...auth1.headers,
        ...formA.getHeaders(),
      },
    });

    assert(createARes.status === 201 && createARes.data.session._id, 'Session A created for NVIDIA');
    assert(createARes.data.session.company === 'NVIDIA', 'Session A company is NVIDIA');
    assert(createARes.data.session.targetRole === 'Software Engineer', 'Session A role is Software Engineer');
    assert(createARes.data.session.progress === 0, 'Progress starts cleanly at 0% (no fake AI data)');
    assert(createARes.data.session.resumeSnapshot.originalName === 'Vidya_Hatture_Resume.pdf', 'Resume snapshot captured');

    const sessionAId = createARes.data.session._id;
    const resumeId = createARes.data.session.resumeId;

    // 9. Resume Reuse Test
    console.log('\n--- TEST 9: Resume Reuse Feature ---');
    const latestResumeRes = await axios.get(`${BASE_URL}/resumes/latest`, auth1);
    assert(latestResumeRes.status === 200 && latestResumeRes.data.resume._id === resumeId, 'Latest uploaded resume is available for reuse');

    // 10. Session B Creation with Resume Reuse & Custom Role (Microsoft)
    console.log('\n--- TEST 10: Session B Creation with Resume Reuse & Custom Role (Microsoft) ---');
    const createBRes = await axios.post(
      `${BASE_URL}/preparations`,
      {
        targetRole: 'Other / Custom Role',
        customRole: 'Distributed Systems Engineer',
        company: 'Microsoft',
        experienceLevel: 'Intermediate',
        jobDescription: 'Microsoft Azure core platform team seeking Distributed Systems Engineer with expertise in high-concurrency microservices.',
        resumeId: resumeId,
      },
      auth1
    );

    assert(createBRes.status === 201 && createBRes.data.session._id, 'Session B created for Microsoft with reused resume');
    assert(createBRes.data.session.company === 'Microsoft', 'Session B company is Microsoft');
    assert(createBRes.data.session.customRole === 'Distributed Systems Engineer', 'Session B custom role stored correctly');
    const sessionBId = createBRes.data.session._id;

    // 11. Returning User Flow Detection
    console.log('\n--- TEST 11: Returning User Flow Detection ---');
    const returningPreps = await axios.get(`${BASE_URL}/preparations`, auth1);
    assert(returningPreps.data.count === 2, 'Returning user has 2 distinct sessions (routes to /dashboard)');

    // 12. Session Isolation Check
    console.log('\n--- TEST 12: Session Isolation Verification ---');
    const fetchARes = await axios.get(`${BASE_URL}/preparations/${sessionAId}`, auth1);
    const fetchBRes = await axios.get(`${BASE_URL}/preparations/${sessionBId}`, auth1);

    assert(fetchARes.data.session.company === 'NVIDIA', 'Session A is isolated and retains NVIDIA');
    assert(fetchBRes.data.session.company === 'Microsoft', 'Session B is isolated and retains Microsoft');
    assert(fetchARes.data.session._id !== fetchBRes.data.session._id, 'Session IDs are distinct');

    // Update Session B and verify Session A is untouched
    await axios.put(
      `${BASE_URL}/preparations/${sessionBId}`,
      { status: 'completed' },
      auth1
    );

    const reFetchA = await axios.get(`${BASE_URL}/preparations/${sessionAId}`, auth1);
    const reFetchB = await axios.get(`${BASE_URL}/preparations/${sessionBId}`, auth1);

    assert(reFetchB.data.session.status === 'completed', 'Session B updated to completed');
    assert(reFetchA.data.session.status === 'active', 'Session A remains active and unaffected');

    // 13. Security & Multi-Tenant Authorization Check
    console.log('\n--- TEST 13: Multi-Tenant Authorization / Access Denied Check ---');
    const user2Res = await axios.post(`${BASE_URL}/auth/register`, {
      name: 'User Two',
      email: `user2_${Date.now()}@example.com`,
      password: 'password123',
    });
    const token2 = user2Res.data.token;
    const auth2 = { headers: { Authorization: `Bearer ${token2}` } };

    // User 2 tries to access User 1's Session A
    try {
      await axios.get(`${BASE_URL}/preparations/${sessionAId}`, auth2);
      assert(false, 'User 2 should NOT be able to view User 1 session');
    } catch (e) {
      assert(e.response && (e.response.status === 403 || e.response.status === 404), 'Unauthorized access to session returns 403/404 Access Denied');
    }

    // User 2 tries to modify User 1's Session A
    try {
      await axios.put(`${BASE_URL}/preparations/${sessionAId}`, { company: 'Hacked' }, auth2);
      assert(false, 'User 2 should NOT be able to update User 1 session');
    } catch (e) {
      assert(e.response && (e.response.status === 403 || e.response.status === 404), 'Unauthorized modification returns 403/404 Access Denied');
    }

    // Clean up temporary dummy pdf
    if (fs.existsSync(dummyPdfPath)) {
      fs.unlinkSync(dummyPdfPath);
    }

    console.log('\n====================================================');
    console.log(`🏁 TEST SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
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

runTests();
