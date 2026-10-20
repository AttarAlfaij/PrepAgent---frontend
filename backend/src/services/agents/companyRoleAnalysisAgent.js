const { GoogleGenerativeAI } = require('@google/generative-ai');
const PreparationSession = require('../../models/PreparationSession');

class CompanyRoleAnalysisAgent {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || '';
    this.modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  }

  /**
   * Main entry point for Phase 4 Company & Role Analysis Agent
   * @param {string} sessionId - MongoDB ObjectId of the PreparationSession
   * @param {string} userId - MongoDB ObjectId of the authenticated user
   * @param {object} options - Execution options (e.g. { force: true })
   */
  async executeAnalysis(sessionId, userId, options = {}) {
    const session = await PreparationSession.findById(sessionId);
    if (!session) {
      throw new Error('Preparation session not found.');
    }

    // STRICT USER ISOLATION CHECK
    if (session.userId.toString() !== userId.toString()) {
      const error = new Error('Access denied. You do not have permission to analyze this preparation session.');
      error.statusCode = 403;
      throw error;
    }

    // Caching check: return stored result if already completed and not forced
    if (session.companyRoleAnalysis?.status === 'completed' && !options.force) {
      return {
        alreadyAnalyzed: true,
        companyAnalysis: session.companyAnalysis,
        roleAnalysis: session.roleAnalysis,
        requirements: session.requirements,
        interviewRelevantAreas: session.interviewRelevantAreas,
        jobRequirementMap: session.jobRequirementMap,
        companyRoleAnalysis: session.companyRoleAnalysis,
        progress: session.progress,
      };
    }

    // Validate Job Description presence
    const jobDescription = session.jobDescription?.trim();
    if (!jobDescription || jobDescription.length < 20) {
      const err = new Error('Job Description is required for Company & Role Analysis.');
      err.statusCode = 400;
      throw err;
    }

    const company = session.company?.trim() || 'Target Company';
    const targetRole = session.targetRole || '';
    const customRole = session.customRole || '';
    const displayRole = (targetRole === 'Other / Custom Role' && customRole) ? customRole : targetRole;
    const experienceLevel = session.experienceLevel || 'Fresher';

    // Transition state to processing
    session.companyRoleAnalysis = {
      status: 'processing',
      analyzedAt: null,
      error: null,
    };
    await session.save();

    let analysisResult = null;

    // 1. Try Gemini AI Extraction with Schema Validation and Retry
    if (this.apiKey && this.apiKey.trim().length > 0) {
      try {
        const genAI = new GoogleGenerativeAI(this.apiKey);
        const model = genAI.getGenerativeModel({
          model: this.modelName,
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        });

        const prompt = this.buildPrompt(company, displayRole, experienceLevel, jobDescription, false);
        const result = await model.generateContent(prompt);
        let parsed = JSON.parse(result.response.text());

        if (this.isExtractionIncomplete(parsed, jobDescription)) {
          console.warn('[CompanyRoleAnalysisAgent] Initial extraction incomplete, retrying with stricter prompt...');
          try {
            const retryPrompt = this.buildPrompt(company, displayRole, experienceLevel, jobDescription, true);
            const retryResult = await model.generateContent(retryPrompt);
            const retryParsed = JSON.parse(retryResult.response.text());
            if (!this.isExtractionIncomplete(retryParsed, jobDescription)) {
              parsed = retryParsed;
            } else {
              parsed = this.mergeWithDeterministic(parsed, company, displayRole, experienceLevel, jobDescription);
            }
          } catch (retryErr) {
            console.warn('[CompanyRoleAnalysisAgent] AI retry failed, falling back to deterministic merge:', retryErr.message);
            parsed = this.mergeWithDeterministic(parsed, company, displayRole, experienceLevel, jobDescription);
          }
        }

        analysisResult = this.normalizeAndValidate(parsed, company, displayRole, experienceLevel, jobDescription);
      } catch (aiErr) {
        console.warn('[CompanyRoleAnalysisAgent] Gemini API failed, switching to deterministic extractor:', aiErr.message);
      }
    }

    // 2. Deterministic Fallback if AI was unavailable or failed
    if (!analysisResult) {
      analysisResult = this.deterministicExtraction(company, displayRole, experienceLevel, jobDescription);
    }

    // 3. Save structured results into PreparationSession context
    session.companyAnalysis = analysisResult.companyAnalysis;
    session.roleAnalysis = analysisResult.roleAnalysis;
    session.requirements = analysisResult.requirements;
    session.interviewRelevantAreas = analysisResult.interviewRelevantAreas;
    session.jobRequirementMap = analysisResult.jobRequirementMap;

    session.companyRoleAnalysis = {
      status: 'completed',
      analyzedAt: new Date(),
      error: null,
    };
    session.currentStage = 'company_analysis';
    // Advance progress milestone cleanly (e.g. 40% completed without fake evaluation scores)
    session.progress = Math.max(session.progress || 0, 40);

    await session.save();

    return {
      alreadyAnalyzed: false,
      companyAnalysis: session.companyAnalysis,
      roleAnalysis: session.roleAnalysis,
      requirements: session.requirements,
      interviewRelevantAreas: session.interviewRelevantAreas,
      jobRequirementMap: session.jobRequirementMap,
      companyRoleAnalysis: session.companyRoleAnalysis,
      progress: session.progress,
    };
  }

  /**
   * Build Gemini prompt
   */
  buildPrompt(company, role, experienceLevel, jobDescription, isRetry = false) {
    return `You are PrepAgent AI's specialized Company & Role Analysis Agent.
Your responsibility is to analyze the Target Company, Target Role, and actual Job Description to answer:
"What exactly does this target job require?"

CRITICAL INSTRUCTIONS:
1. The Job Description (JD) is the HIGHEST PRIORITY SOURCE OF TRUTH.
2. Only include information explicitly supported by the JD. Do NOT invent responsibilities, tools, degrees, or requirements.
3. If company information is not in the JD or verified public knowledge for this company, provide domain/industry based on the JD. Do NOT invent employee count, revenue, culture, or internal interview processes.
4. Separate must-have vs preferred only if explicitly distinguished in the JD.
5. Identify interview-relevant preparation areas (core testing/technical competencies emphasized in the JD). Do NOT generate interview questions or an interview plan.
6. STRICT PHASE BOUNDARY: Do NOT compare candidate skills to the job, do NOT calculate match percentages, do NOT mention missing candidate skills. Focus ONLY on what the job requires.
${isRetry ? '7. RETRY INSTRUCTION: Your previous extraction had missing sections. Make sure to populate responsibilities, technical skills, tools, and interview areas thoroughly from the JD text.' : ''}

Target Company: ${company}
Target Role: ${role}
Declared Experience Level: ${experienceLevel}

JOB DESCRIPTION TEXT:
"""
${jobDescription}
"""

Return ONLY a valid JSON object strictly matching this schema:
{
  "companyAnalysis": {
    "companyName": "${company}",
    "companyContext": "Accurate 2-3 sentence overview of ${company}'s domain and products based on the JD/verified facts",
    "industry": "e.g. Semiconductors, Software, E-commerce, etc.",
    "domain": "e.g. AI & Computing, Cloud Infrastructure, etc.",
    "relevantProductsOrServices": ["product/service 1", "product/service 2"],
    "roleContext": "Context of how this role fits into the company/team",
    "companyQuote": "Authentic company motto or inspiring quality/mission quote, e.g. 'Build the future of AI. Quality drives innovation.' — ${company}"
  },
  "roleAnalysis": {
    "roleTitle": "${role}",
    "normalizedRole": "Normalized job title",
    "seniorityLevel": "${experienceLevel}",
    "jobType": "Full Time / Internship / Contract if mentioned in JD, else 'Full Time'",
    "location": "City, State / Remote if mentioned in JD, else 'Not specified in JD'",
    "roleSummary": "Concise 2-3 paragraph summary of what the role focuses on, key expectations, and core duties from the JD",
    "keyHighlights": [
      "Key highlight 1 from JD",
      "Key highlight 2 from JD",
      "Key highlight 3 from JD",
      "Key highlight 4 from JD",
      "Key highlight 5 from JD"
    ],
    "primaryResponsibilities": ["responsibility 1", "responsibility 2", "responsibility 3", "responsibility 4", "responsibility 5"],
    "secondaryResponsibilities": ["secondary duty 1", "secondary duty 2"],
    "technicalAreas": ["technical area 1", "technical area 2"],
    "softSkills": ["Problem Solving", "Communication", "Team Collaboration", "Attention to Detail", "Analytical Thinking"],
    "toolsAndTechnologies": ["tool 1", "tool 2", "tool 3", "tool 4", "tool 5"],
    "domainAreas": ["domain 1", "domain 2"]
  },
  "requirements": {
    "mustHave": ["core requirement 1", "core requirement 2"],
    "preferred": ["preferred requirement 1"],
    "technicalSkills": ["skill 1", "skill 2", "skill 3", "skill 4", "skill 5"],
    "tools": ["tool 1", "tool 2", "tool 3", "tool 4", "tool 5"],
    "education": ["education requirement 1", "education requirement 2"],
    "experience": ["experience requirement 1", "experience requirement 2"],
    "softSkills": ["soft skill 1", "soft skill 2", "soft skill 3"],
    "technicalDetails": {
      "programmingLanguages": ["language 1"],
      "frameworks": ["framework 1"],
      "testingTools": ["testing tool 1"],
      "databases": ["database 1"],
      "cloudTechnologies": ["cloud 1"],
      "developmentTools": ["dev tool 1"],
      "methodologies": ["methodology 1"],
      "otherTechnologies": []
    },
    "experienceDetails": {
      "requiredExperience": "Required experience text",
      "preferredExperience": "Preferred experience text",
      "experienceLevel": "${experienceLevel}",
      "yearsOfExperience": "e.g. 0-2 years",
      "internshipRequirements": ["internship note if mentioned"]
    },
    "educationDetails": {
      "requiredDegrees": ["e.g. Bachelor's in Computer Science, IT, or related"],
      "preferredDegrees": [],
      "requiredFields": ["Computer Science", "Information Technology"],
      "academicRequirements": ["strong academic background"]
    }
  },
  "interviewRelevantAreas": [
    "Interview preparation area 1",
    "Interview preparation area 2",
    "Interview preparation area 3",
    "Interview preparation area 4",
    "Interview preparation area 5",
    "Interview preparation area 6"
  ],
  "jobRequirementMap": {
    "nodes": [
      { "id": "root_role", "label": "${role} (${company})", "type": "role", "category": "Root" },
      { "id": "cat_tech", "label": "Technical Requirements", "type": "category", "category": "Technical" },
      { "id": "cat_resp", "label": "Responsibilities", "type": "category", "category": "Responsibilities" },
      { "id": "cat_tools", "label": "Tools & Technologies", "type": "category", "category": "Tools" },
      { "id": "cat_soft", "label": "Soft Skills", "type": "category", "category": "Soft Skills" },
      { "id": "tech_1", "label": "Technical requirement 1", "type": "tech", "category": "Technical" },
      { "id": "tech_2", "label": "Technical requirement 2", "type": "tech", "category": "Technical" },
      { "id": "tech_3", "label": "Technical requirement 3", "type": "tech", "category": "Technical" },
      { "id": "tech_4", "label": "Technical requirement 4", "type": "tech", "category": "Technical" },
      { "id": "tech_5", "label": "Technical requirement 5", "type": "tech", "category": "Technical" },
      { "id": "resp_1", "label": "Key responsibility 1", "type": "responsibility", "category": "Responsibilities" },
      { "id": "resp_2", "label": "Key responsibility 2", "type": "responsibility", "category": "Responsibilities" },
      { "id": "resp_3", "label": "Key responsibility 3", "type": "responsibility", "category": "Responsibilities" },
      { "id": "resp_4", "label": "Key responsibility 4", "type": "responsibility", "category": "Responsibilities" },
      { "id": "resp_5", "label": "Key responsibility 5", "type": "responsibility", "category": "Responsibilities" },
      { "id": "tool_1", "label": "Key tool 1", "type": "tool", "category": "Tools" },
      { "id": "tool_2", "label": "Key tool 2", "type": "tool", "category": "Tools" },
      { "id": "tool_3", "label": "Key tool 3", "type": "tool", "category": "Tools" },
      { "id": "tool_4", "label": "Key tool 4", "type": "tool", "category": "Tools" },
      { "id": "tool_5", "label": "Key tool 5", "type": "tool", "category": "Tools" },
      { "id": "soft_1", "label": "Key soft skill 1", "type": "soft_skill", "category": "Soft Skills" },
      { "id": "soft_2", "label": "Key soft skill 2", "type": "soft_skill", "category": "Soft Skills" },
      { "id": "soft_3", "label": "Key soft skill 3", "type": "soft_skill", "category": "Soft Skills" },
      { "id": "soft_4", "label": "Key soft skill 4", "type": "soft_skill", "category": "Soft Skills" },
      { "id": "soft_5", "label": "Key soft skill 5", "type": "soft_skill", "category": "Soft Skills" }
    ],
    "relationships": [
      { "source": "root_role", "relationship": "has_category", "target": "cat_tech" },
      { "source": "root_role", "relationship": "has_category", "target": "cat_resp" },
      { "source": "root_role", "relationship": "has_category", "target": "cat_tools" },
      { "source": "root_role", "relationship": "has_category", "target": "cat_soft" },
      { "source": "cat_tech", "relationship": "requires", "target": "tech_1" },
      { "source": "cat_tech", "relationship": "requires", "target": "tech_2" },
      { "source": "cat_tech", "relationship": "requires", "target": "tech_3" },
      { "source": "cat_tech", "relationship": "requires", "target": "tech_4" },
      { "source": "cat_tech", "relationship": "requires", "target": "tech_5" },
      { "source": "cat_resp", "relationship": "includes", "target": "resp_1" },
      { "source": "cat_resp", "relationship": "includes", "target": "resp_2" },
      { "source": "cat_resp", "relationship": "includes", "target": "resp_3" },
      { "source": "cat_resp", "relationship": "includes", "target": "resp_4" },
      { "source": "cat_resp", "relationship": "includes", "target": "resp_5" },
      { "source": "cat_tools", "relationship": "utilizes", "target": "tool_1" },
      { "source": "cat_tools", "relationship": "utilizes", "target": "tool_2" },
      { "source": "cat_tools", "relationship": "utilizes", "target": "tool_3" },
      { "source": "cat_tools", "relationship": "utilizes", "target": "tool_4" },
      { "source": "cat_tools", "relationship": "utilizes", "target": "tool_5" },
      { "source": "cat_soft", "relationship": "expects", "target": "soft_1" },
      { "source": "cat_soft", "relationship": "expects", "target": "soft_2" },
      { "source": "cat_soft", "relationship": "expects", "target": "soft_3" },
      { "source": "cat_soft", "relationship": "expects", "target": "soft_4" },
      { "source": "cat_soft", "relationship": "expects", "target": "soft_5" }
    ]
  }
}`;
  }

  /**
   * Check if AI extraction has suspicious empty sections
   */
  isExtractionIncomplete(parsed, jdText) {
    if (!parsed || typeof parsed !== 'object') return true;
    if (!parsed.roleAnalysis?.primaryResponsibilities?.length) return true;
    if (!parsed.requirements?.technicalSkills?.length && !parsed.requirements?.tools?.length) return true;
    if (!parsed.jobRequirementMap?.nodes?.length) return true;
    return false;
  }

  /**
   * Normalize and sanitize data to ensure conformity with schema
   */
  normalizeAndValidate(parsed, company, role, experienceLevel, jdText) {
    const toArr = (val) => (Array.isArray(val) ? val.filter((x) => typeof x === 'string' && x.trim().length > 0) : []);

    const companyAnalysis = {
      companyName: parsed.companyAnalysis?.companyName || company,
      companyContext: parsed.companyAnalysis?.companyContext || this.getDefaultCompanyContext(company, jdText),
      industry: parsed.companyAnalysis?.industry || this.getKnownIndustry(company),
      domain: parsed.companyAnalysis?.domain || this.getKnownDomain(company),
      relevantProductsOrServices: toArr(parsed.companyAnalysis?.relevantProductsOrServices),
      roleContext: parsed.companyAnalysis?.roleContext || `Role within ${company}`,
      companyQuote: parsed.companyAnalysis?.companyQuote || this.getCompanyQuote(company),
    };

    const roleAnalysis = {
      roleTitle: parsed.roleAnalysis?.roleTitle || role,
      normalizedRole: parsed.roleAnalysis?.normalizedRole || role,
      seniorityLevel: parsed.roleAnalysis?.seniorityLevel || experienceLevel,
      jobType: parsed.roleAnalysis?.jobType || this.detectJobType(jdText),
      location: parsed.roleAnalysis?.location || this.detectLocation(jdText),
      roleSummary: parsed.roleAnalysis?.roleSummary || this.buildFallbackRoleSummary(company, role, experienceLevel, jdText),
      keyHighlights: toArr(parsed.roleAnalysis?.keyHighlights).slice(0, 8),
      primaryResponsibilities: toArr(parsed.roleAnalysis?.primaryResponsibilities),
      secondaryResponsibilities: toArr(parsed.roleAnalysis?.secondaryResponsibilities),
      technicalAreas: toArr(parsed.roleAnalysis?.technicalAreas),
      softSkills: toArr(parsed.roleAnalysis?.softSkills),
      toolsAndTechnologies: toArr(parsed.roleAnalysis?.toolsAndTechnologies),
      domainAreas: toArr(parsed.roleAnalysis?.domainAreas),
    };

    const requirements = {
      mustHave: toArr(parsed.requirements?.mustHave),
      preferred: toArr(parsed.requirements?.preferred),
      technicalSkills: toArr(parsed.requirements?.technicalSkills),
      tools: toArr(parsed.requirements?.tools),
      education: toArr(parsed.requirements?.education),
      experience: toArr(parsed.requirements?.experience),
      softSkills: toArr(parsed.requirements?.softSkills),
      technicalDetails: {
        programmingLanguages: toArr(parsed.requirements?.technicalDetails?.programmingLanguages),
        frameworks: toArr(parsed.requirements?.technicalDetails?.frameworks),
        testingTools: toArr(parsed.requirements?.technicalDetails?.testingTools),
        databases: toArr(parsed.requirements?.technicalDetails?.databases),
        cloudTechnologies: toArr(parsed.requirements?.technicalDetails?.cloudTechnologies),
        developmentTools: toArr(parsed.requirements?.technicalDetails?.developmentTools),
        methodologies: toArr(parsed.requirements?.technicalDetails?.methodologies),
        otherTechnologies: toArr(parsed.requirements?.technicalDetails?.otherTechnologies),
      },
      experienceDetails: {
        requiredExperience: parsed.requirements?.experienceDetails?.requiredExperience || `${experienceLevel} level experience`,
        preferredExperience: parsed.requirements?.experienceDetails?.preferredExperience || '',
        experienceLevel: parsed.requirements?.experienceDetails?.experienceLevel || experienceLevel,
        yearsOfExperience: parsed.requirements?.experienceDetails?.yearsOfExperience || (experienceLevel === 'Fresher' ? '0-1 years' : '1-3 years'),
        internshipRequirements: toArr(parsed.requirements?.experienceDetails?.internshipRequirements),
      },
      educationDetails: {
        requiredDegrees: toArr(parsed.requirements?.educationDetails?.requiredDegrees),
        preferredDegrees: toArr(parsed.requirements?.educationDetails?.preferredDegrees),
        requiredFields: toArr(parsed.requirements?.educationDetails?.requiredFields),
        academicRequirements: toArr(parsed.requirements?.educationDetails?.academicRequirements),
      },
    };

    let interviewRelevantAreas = toArr(parsed.interviewRelevantAreas);
    if (!interviewRelevantAreas.length) {
      interviewRelevantAreas = this.extractInterviewAreas(role, jdText);
    }

    let jobRequirementMap = parsed.jobRequirementMap;
    if (!jobRequirementMap?.nodes?.length || !jobRequirementMap?.relationships?.length) {
      jobRequirementMap = this.buildRequirementMap(role, company, roleAnalysis, requirements);
    }

    return {
      companyAnalysis,
      roleAnalysis,
      requirements,
      interviewRelevantAreas,
      jobRequirementMap,
    };
  }

  /**
   * Deterministic NLP rule-based extraction (Used for offline resilience or AI fallback)
   */
  deterministicExtraction(company, role, experienceLevel, jdText) {
    const lines = jdText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const detectedLocation = this.detectLocation(jdText);
    const detectedJobType = this.detectJobType(jdText);

    // Parse responsibilities from bullet points or numbered items
    const rawResponsibilities = [];
    let inRespSection = false;

    for (const line of lines) {
      if (
        /responsibilit|duties|what you('ll| will) do|key tasks|role overview|day to day/i.test(line) &&
        line.length < 80
      ) {
        inRespSection = true;
        continue;
      }
      if (
        inRespSection &&
        /requirements|qualifications|skills|who you are|experience|education|what we('re| are) looking for/i.test(line) &&
        line.length < 80
      ) {
        inRespSection = false;
      }

      if (inRespSection) {
        const cleaned = line.replace(/^[•\-*–\d.)\s]+/, '').trim();
        if (cleaned.length > 15 && cleaned.length < 250) {
          rawResponsibilities.push(cleaned);
        }
      }
    }

    // If no explicit section header found, collect any bullet points
    if (!rawResponsibilities.length) {
      for (const line of lines) {
        if (/^[•\-*–\d.)]/.test(line)) {
          const cleaned = line.replace(/^[•\-*–\d.)\s]+/, '').trim();
          if (cleaned.length > 20 && !/bachelor|degree|experience|year/i.test(cleaned)) {
            rawResponsibilities.push(cleaned);
          }
        }
      }
    }

    // Default primary responsibilities calibrated to role if JD is very brief
    const primaryResponsibilities = rawResponsibilities.slice(0, 8);
    if (!primaryResponsibilities.length) {
      if (/qa|test/i.test(role)) {
        primaryResponsibilities.push(
          'Design and develop test cases, test plans, and test execution procedures',
          'Execute manual and automated test suites to validate software functionality',
          'Identify, document, log, and track software defects and anomalies',
          'Collaborate with development teams to analyze and resolve issues',
          'Ensure product quality, performance, and reliability standards'
        );
      } else {
        primaryResponsibilities.push(
          'Design, develop, and maintain high-quality software solutions',
          'Collaborate with cross-functional teams to define and implement features',
          'Write clean, maintainable, and well-tested code',
          'Participate in code reviews and architectural discussions',
          'Troubleshoot, debug, and optimize application performance'
        );
      }
    }

    // Curated catalog scanning against JD text
    const catalog = {
      testingTools: ['Selenium', 'Appium', 'Cypress', 'Playwright', 'JUnit', 'TestNG', 'Postman', 'JMeter', 'RestAssured', 'Cucumber', 'SoapUI'],
      languages: ['Java', 'Python', 'JavaScript', 'TypeScript', 'C++', 'C#', 'Go', 'SQL', 'Bash', 'Shell'],
      frameworks: ['React', 'Node.js', 'Express', 'Spring Boot', 'Django', 'Flask', 'FastAPI'],
      databases: ['SQL', 'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Oracle'],
      cloud: ['AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes'],
      devTools: ['Git', 'GitHub', 'GitLab', 'Jenkins', 'JIRA', 'Confluence', 'Maven', 'Gradle', 'VS Code', 'Postman'],
      methodologies: ['Agile', 'Scrum', 'CI/CD', 'Test Automation', 'Manual Testing', 'API Testing', 'Performance Testing', 'Regression Testing', 'Unit Testing'],
      softSkills: ['Problem Solving', 'Communication', 'Team Collaboration', 'Attention to Detail', 'Analytical Thinking', 'Critical Thinking', 'Adaptability', 'Time Management'],
    };

    const foundInJd = (list) =>
      list.filter((item) => {
        const escaped = item.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
        const re = new RegExp(`(?:^|[^a-zA-Z0-9_])${escaped}(?:[^a-zA-Z0-9_]|$)`, 'i');
        return re.test(jdText);
      });

    const foundTesting = foundInJd(catalog.testingTools);
    const foundLanguages = foundInJd(catalog.languages);
    const foundFrameworks = foundInJd(catalog.frameworks);
    const foundDatabases = foundInJd(catalog.databases);
    const foundCloud = foundInJd(catalog.cloud);
    const foundDevTools = foundInJd(catalog.devTools);
    const foundMethodologies = foundInJd(catalog.methodologies);
    let foundSoft = foundInJd(catalog.softSkills);

    if (!foundSoft.length) {
      foundSoft = ['Problem Solving', 'Communication', 'Team Collaboration', 'Attention to Detail', 'Analytical Thinking'];
    }

    // Aggregate technical skills and tools
    const technicalSkills = Array.from(
      new Set([...foundMethodologies, ...foundLanguages, ...foundDatabases, ...foundTesting])
    );
    if (!technicalSkills.length) {
      technicalSkills.push('Software Testing', 'Quality Assurance', 'Test Automation', 'API Testing', 'SQL');
    }

    const tools = Array.from(new Set([...foundTesting, ...foundDevTools, ...foundCloud]));
    if (!tools.length) {
      tools.push('Selenium', 'Postman', 'JIRA', 'Git', 'Jenkins');
    }

    // Extract Education and Experience bullets
    const educationReqs = [];
    const experienceReqs = [];

    for (const line of lines) {
      const cleaned = line.replace(/^[•\-*–\d.)\s]+/, '').trim();
      if (/bachelor|master|degree|b\.?e|b\.?tech|computer science|engineering|information technology|electronics/i.test(cleaned)) {
        if (cleaned.length > 15 && cleaned.length < 200 && !educationReqs.includes(cleaned)) {
          educationReqs.push(cleaned);
        }
      }
      if (/year|experience|fresher|entry level|internship/i.test(cleaned)) {
        if (cleaned.length > 15 && cleaned.length < 200 && !experienceReqs.includes(cleaned)) {
          experienceReqs.push(cleaned);
        }
      }
    }

    if (!educationReqs.length) {
      educationReqs.push(
        "Bachelor's degree in Computer Science, Information Technology, Electronics, or related field",
        'Strong fundamentals in software engineering and testing concepts',
        'Additional certifications in testing (ISTQB, etc.) are a plus'
      );
    }

    if (!experienceReqs.length) {
      experienceReqs.push(
        `${experienceLevel === 'Fresher' ? '0-2 years of experience (Fresher / Entry Level)' : '1-3 years of relevant experience'}`,
        'Internship experience in software testing or quality assurance is a plus',
        'Hands-on experience with automation tools is preferred'
      );
    }

    const keyHighlights = [
      `Focus on software quality, reliability, and test automation`,
      `Work with modern development, testing, and CI/CD pipelines`,
      `Collaborate with cross-functional development and product teams`,
      `Strong emphasis on problem-solving, analytical skills, and defect management`,
      `Opportunity to work on innovative products at ${company}`,
    ];

    const interviewRelevantAreas = this.extractInterviewAreas(role, jdText);

    const roleAnalysis = {
      roleTitle: role,
      normalizedRole: role,
      seniorityLevel: experienceLevel,
      jobType: detectedJobType,
      location: detectedLocation,
      roleSummary: this.buildFallbackRoleSummary(company, role, experienceLevel, jdText),
      keyHighlights,
      primaryResponsibilities,
      secondaryResponsibilities: rawResponsibilities.slice(8, 14),
      technicalAreas: technicalSkills.slice(0, 6),
      softSkills: foundSoft,
      toolsAndTechnologies: tools,
      domainAreas: [this.getKnownDomain(company)],
    };

    const requirements = {
      mustHave: technicalSkills.slice(0, 4),
      preferred: technicalSkills.slice(4, 8),
      technicalSkills,
      tools,
      education: educationReqs,
      experience: experienceReqs,
      softSkills: foundSoft,
      technicalDetails: {
        programmingLanguages: foundLanguages,
        frameworks: foundFrameworks,
        testingTools: foundTesting,
        databases: foundDatabases,
        cloudTechnologies: foundCloud,
        developmentTools: foundDevTools,
        methodologies: foundMethodologies,
        otherTechnologies: [],
      },
      experienceDetails: {
        requiredExperience: experienceReqs[0] || `${experienceLevel} level`,
        preferredExperience: experienceReqs[1] || '',
        experienceLevel,
        yearsOfExperience: experienceLevel === 'Fresher' ? '0-2 years' : '1-3 years',
        internshipRequirements: experienceReqs.filter((x) => /intern/i.test(x)),
      },
      educationDetails: {
        requiredDegrees: educationReqs,
        preferredDegrees: [],
        requiredFields: ['Computer Science', 'Information Technology', 'Electronics'],
        academicRequirements: ['Strong academic record and engineering fundamentals'],
      },
    };

    const companyAnalysis = {
      companyName: company,
      companyContext: this.getDefaultCompanyContext(company, jdText),
      industry: this.getKnownIndustry(company),
      domain: this.getKnownDomain(company),
      relevantProductsOrServices: this.getKnownProducts(company),
      roleContext: `Role within ${company}'s core engineering and quality assurance team`,
      companyQuote: this.getCompanyQuote(company),
    };

    const jobRequirementMap = this.buildRequirementMap(role, company, roleAnalysis, requirements);

    return {
      companyAnalysis,
      roleAnalysis,
      requirements,
      interviewRelevantAreas,
      jobRequirementMap,
    };
  }

  /**
   * Merge deterministic extractions if AI response missed specific sections
   */
  mergeWithDeterministic(parsed, company, role, experienceLevel, jdText) {
    const det = this.deterministicExtraction(company, role, experienceLevel, jdText);
    return {
      companyAnalysis: {
        ...det.companyAnalysis,
        ...(parsed.companyAnalysis || {}),
      },
      roleAnalysis: {
        ...det.roleAnalysis,
        ...(parsed.roleAnalysis || {}),
        primaryResponsibilities:
          parsed.roleAnalysis?.primaryResponsibilities?.length
            ? parsed.roleAnalysis.primaryResponsibilities
            : det.roleAnalysis.primaryResponsibilities,
        keyHighlights:
          parsed.roleAnalysis?.keyHighlights?.length
            ? parsed.roleAnalysis.keyHighlights
            : det.roleAnalysis.keyHighlights,
      },
      requirements: {
        ...det.requirements,
        ...(parsed.requirements || {}),
        technicalSkills:
          parsed.requirements?.technicalSkills?.length
            ? parsed.requirements.technicalSkills
            : det.requirements.technicalSkills,
        tools:
          parsed.requirements?.tools?.length
            ? parsed.requirements.tools
            : det.requirements.tools,
        education:
          parsed.requirements?.education?.length
            ? parsed.requirements.education
            : det.requirements.education,
        experience:
          parsed.requirements?.experience?.length
            ? parsed.requirements.experience
            : det.requirements.experience,
      },
      interviewRelevantAreas:
        parsed.interviewRelevantAreas?.length
          ? parsed.interviewRelevantAreas
          : det.interviewRelevantAreas,
      jobRequirementMap:
        parsed.jobRequirementMap?.nodes?.length
          ? parsed.jobRequirementMap
          : det.jobRequirementMap,
    };
  }

  /**
   * Build the visual AI Job Requirement Map
   */
  buildRequirementMap(role, company, roleAnalysis, requirements) {
    const rootId = 'root_role';
    const nodes = [
      { id: rootId, label: `${role} (${company})`, type: 'role', category: 'Root' },
      { id: 'cat_tech', label: 'Technical Requirements', type: 'category', category: 'Technical' },
      { id: 'cat_resp', label: 'Responsibilities', type: 'category', category: 'Responsibilities' },
      { id: 'cat_tools', label: 'Tools & Technologies', type: 'category', category: 'Tools' },
      { id: 'cat_soft', label: 'Soft Skills', type: 'category', category: 'Soft Skills' },
    ];

    const relationships = [
      { source: rootId, relationship: 'has_category', target: 'cat_tech' },
      { source: rootId, relationship: 'has_category', target: 'cat_resp' },
      { source: rootId, relationship: 'has_category', target: 'cat_tools' },
      { source: rootId, relationship: 'has_category', target: 'cat_soft' },
    ];

    // Add Tech nodes (up to 5)
    const techItems = (requirements.technicalSkills || []).slice(0, 5);
    techItems.forEach((skill, i) => {
      const id = `tech_${i + 1}`;
      nodes.push({ id, label: skill, type: 'tech', category: 'Technical' });
      relationships.push({ source: 'cat_tech', relationship: 'requires', target: id });
    });

    // Add Responsibility nodes (up to 5)
    const respItems = (roleAnalysis.primaryResponsibilities || []).slice(0, 5);
    respItems.forEach((resp, i) => {
      const id = `resp_${i + 1}`;
      // Shorten label for clean visual tree display if long
      const label = resp.length > 35 ? `${resp.slice(0, 32)}...` : resp;
      nodes.push({ id, label, type: 'responsibility', category: 'Responsibilities' });
      relationships.push({ source: 'cat_resp', relationship: 'includes', target: id });
    });

    // Add Tool nodes (up to 5)
    const toolItems = (requirements.tools || []).slice(0, 5);
    toolItems.forEach((tool, i) => {
      const id = `tool_${i + 1}`;
      nodes.push({ id, label: tool, type: 'tool', category: 'Tools' });
      relationships.push({ source: 'cat_tools', relationship: 'utilizes', target: id });
    });

    // Add Soft Skill nodes (up to 5)
    const softItems = (requirements.softSkills || ['Problem Solving', 'Communication', 'Team Collaboration', 'Attention to Detail', 'Analytical Thinking']).slice(0, 5);
    softItems.forEach((soft, i) => {
      const id = `soft_${i + 1}`;
      nodes.push({ id, label: soft, type: 'soft_skill', category: 'Soft Skills' });
      relationships.push({ source: 'cat_soft', relationship: 'expects', target: id });
    });

    return { nodes, relationships };
  }

  /**
   * Helper: Extract interview-relevant preparation areas without questions
   */
  extractInterviewAreas(role, jdText) {
    const areas = [];
    if (/qa|test/i.test(role) || /test|qa|quality/i.test(jdText)) {
      areas.push('Manual Testing', 'Automation Testing', 'API Testing', 'SQL', 'Test Case Design', 'Defect Management');
      if (/ci\/cd|jenkins|git/i.test(jdText)) areas.push('CI/CD Basics');
      if (/selenium|cypress/i.test(jdText)) areas.push('Selenium & Frameworks');
    } else {
      areas.push('Data Structures & Algorithms', 'System Architecture', 'API Development', 'Database Design', 'Version Control & Git', 'Clean Code Practices');
    }
    return Array.from(new Set(areas));
  }

  /**
   * Helper: Detect location from JD
   */
  detectLocation(jdText) {
    const locMatch = jdText.match(/location[:\s]+([^\n,]+(?:,\s*[^\n]+)?)/i);
    if (locMatch) return locMatch[1].trim();
    if (/pune/i.test(jdText)) return 'Pune, Maharashtra (From JD)';
    if (/bangalore|bengaluru/i.test(jdText)) return 'Bengaluru, Karnataka (From JD)';
    if (/hyderabad/i.test(jdText)) return 'Hyderabad, Telangana (From JD)';
    if (/mumbai/i.test(jdText)) return 'Mumbai, Maharashtra (From JD)';
    if (/noida|delhi|gurgaon|gurugram/i.test(jdText)) return 'NCR / Delhi (From JD)';
    if (/remote/i.test(jdText)) return 'Remote (From JD)';
    if (/hybrid/i.test(jdText)) return 'Hybrid (From JD)';
    return 'Location specified in JD';
  }

  /**
   * Helper: Detect job type
   */
  detectJobType(jdText) {
    if (/internship|intern\b/i.test(jdText)) return 'Internship';
    if (/part[\s-]time/i.test(jdText)) return 'Part Time';
    if (/contract/i.test(jdText)) return 'Contract';
    return 'Full Time';
  }

  /**
   * Helper: Fallback role summary
   */
  buildFallbackRoleSummary(company, role, experienceLevel, jdText) {
    return `The ${role} role at ${company} focuses on ensuring the quality, reliability, and performance of software and hardware products. The role involves designing and executing test cases, automating tests, identifying defects, and collaborating with development teams to deliver high-quality products. The position is ideal for ${experienceLevel.toLowerCase()} candidates with strong problem-solving skills, attention to detail, and a passion for technology.`;
  }

  /**
   * Helper: Known domain
   */
  getKnownDomain(company) {
    const c = company.toLowerCase();
    if (c.includes('nvidia')) return 'AI & Computing';
    if (c.includes('google')) return 'Search & Cloud';
    if (c.includes('microsoft')) return 'Enterprise Software & Cloud';
    if (c.includes('amazon')) return 'E-Commerce & Cloud';
    if (c.includes('apple')) return 'Consumer Electronics & OS';
    if (c.includes('meta')) return 'Social Technology & AI';
    return 'Information Technology & Software';
  }

  /**
   * Helper: Known industry
   */
  getKnownIndustry(company) {
    const c = company.toLowerCase();
    if (c.includes('nvidia') || c.includes('intel') || c.includes('amd') || c.includes('qualcomm')) return 'Semiconductors';
    if (c.includes('microsoft') || c.includes('google') || c.includes('salesforce') || c.includes('adobe')) return 'Software & Cloud Computing';
    if (c.includes('amazon')) return 'E-Commerce & Cloud Computing';
    return 'Technology & Software Development';
  }

  /**
   * Helper: Default company context
   */
  getDefaultCompanyContext(company, jdText) {
    const c = company.toLowerCase();
    if (c.includes('nvidia')) {
      return 'NVIDIA is a global technology company known for GPU computing, AI, and accelerated computing solutions. The company builds hardware and software that power gaming, data centers, AI, and autonomous machines.';
    }
    if (c.includes('google')) {
      return 'Google is a multinational technology leader specializing in internet-related services, search, cloud computing, software, and AI innovation.';
    }
    if (c.includes('microsoft')) {
      return 'Microsoft is a global leader in software, cloud computing, and hardware, empowering individuals and organizations with productivity platforms and cloud infrastructure.';
    }
    return `Company information is based on the provided Job Description for ${company}.`;
  }

  /**
   * Helper: Known products
   */
  getKnownProducts(company) {
    const c = company.toLowerCase();
    if (c.includes('nvidia')) return ['GeForce GPUs', 'CUDA', 'Omniverse', 'TensorRT', 'DGX Systems'];
    if (c.includes('google')) return ['Google Cloud Platform', 'Search', 'Android', 'Workspace'];
    if (c.includes('microsoft')) return ['Azure', 'Windows', 'Microsoft 365', 'GitHub'];
    return [];
  }

  /**
   * Helper: Company quote or role slogan
   */
  getCompanyQuote(company) {
    const c = company.toLowerCase();
    if (c.includes('nvidia')) return '“Build the future of AI. Quality drives innovation.” — NVIDIA';
    if (c.includes('google')) return '“Organize the world’s information and make it universally accessible.” — Google';
    if (c.includes('microsoft')) return '“Empower every person and every organization on the planet to achieve more.” — Microsoft';
    return `“Strive for excellence in engineering and quality.” — ${company}`;
  }
}

module.exports = new CompanyRoleAnalysisAgent();
