const mongoose = require('mongoose');

const preparationSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
    resumeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resume',
      required: false,
      default: null,
    },
    // Snapshot of resume details for session isolation and fast retrieval
    resumeSnapshot: {
      originalName: { type: String, default: '' },
      filename: { type: String, default: '' },
      path: { type: String, default: '' },
      size: { type: Number, default: 0 },
      mimeType: { type: String, default: '' },
    },
    targetRole: {
      type: String,
      required: [true, 'Target job role is required'],
      trim: true,
    },
    customRole: {
      type: String,
      trim: true,
      default: '',
    },
    company: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
    },
    jobDescription: {
      type: String,
      required: [true, 'Job description is required'],
      trim: true,
    },
    experienceLevel: {
      type: String,
      required: false,
      default: 'Fresher',
      enum: {
        values: ['Fresher', 'Entry Level', 'Intermediate', 'Experienced'],
        message: '{VALUE} is not a valid experience level',
      },
    },
    interviewType: {
      type: String,
      enum: ['Technical', 'Behavioral / HR', 'Mixed'],
      default: 'Mixed',
    },
    questionCount: {
      type: Number,
      min: 1,
      max: 20,
      default: 10,
    },
    difficulty: {
      type: String,
      enum: ['Easy', 'Medium', 'Medium-Hard', 'Hard'],
      default: 'Medium',
    },
    difficultyReason: {
      type: String,
      default: '',
    },
    difficultyOverride: {
      type: String,
      default: null,
    },
    currentStage: {
      type: String,
      default: 'setup',
      enum: [
        'setup',
        'resume_analysis',
        'company_role_analysis',
        'company_analysis',
        'skill_gap',
        'skill_gap_analysis',
        'resume_tailoring',
        'job_preparation_plan',
        'job_readiness_twin',
        'interview_planning',
        'mock_interview',
        'evaluation',
        'mistake_progress',
        'adaptive_practice',
        'completed',
      ],
    },
    status: {
      type: String,
      default: 'active',
      enum: ['active', 'paused', 'completed', 'archived'],
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    // Phase 3 — Resume Analysis Agent Pipeline State
    resumeAnalysis: {
      status: {
        type: String,
        enum: ['not_started', 'processing', 'completed', 'failed', 'stale'],
        default: 'not_started',
      },
      currentStep: {
        type: String,
        enum: [
          'not_started',
          'reading_resume',
          'extracting_text',
          'understanding_structure',
          'extracting_information',
          'building_profile',
          'completed',
          'failed',
        ],
        default: 'not_started',
      },
      analyzedAt: {
        type: Date,
        default: null,
      },
      error: {
        type: String,
        default: null,
      },
      extractedTextLength: {
        type: Number,
        default: 0,
      },
      rawText: {
        type: String,
        default: '',
      },
      atsScore: {
        type: Number,
        default: null,
      },
      atsBreakdown: {
        type: mongoose.Schema.Types.Mixed,
        default: null,
      },
      atsStrengths: [{ type: String }],
      atsImprovements: [{ type: String }],
      atsAnalyzedAt: {
        type: Date,
        default: null,
      },
    },

    // Phase 3 — Structured Candidate Profile extracted by Resume Analysis Agent
    candidateProfile: {
      personalInfo: {
        name: { type: String, default: '' },
        email: { type: String, default: '' },
        phone: { type: String, default: '' },
        location: { type: String, default: '' },
        linkedin: { type: String, default: '' },
        github: { type: String, default: '' },
        portfolio: { type: String, default: '' },
      },
      professionalSummary: { type: String, default: '' },
      careerObjective: { type: String, default: '' },
      education: [
        {
          degree: { type: String, default: '' },
          institution: { type: String, default: '' },
          fieldOfStudy: { type: String, default: '' },
          startYear: { type: String, default: '' },
          endYear: { type: String, default: '' },
          percentageOrCGPA: { type: String, default: '' },
          coursework: [{ type: String }],
        },
      ],
      skills: {
        programmingLanguages: [{ type: String }],
        frontend: [{ type: String }],
        backend: [{ type: String }],
        frameworks: [{ type: String }],
        libraries: [{ type: String }],
        databases: [{ type: String }],
        aiMl: [{ type: String }],
        cloud: [{ type: String }],
        devops: [{ type: String }],
        tools: [{ type: String }],
        technologies: [{ type: String }],
        other: [{ type: String }],
      },
      projects: [
        {
          name: { type: String, default: '' },
          description: { type: String, default: '' },
          technologies: [{ type: String }],
          role: { type: String, default: '' },
          responsibilities: [{ type: String }],
          achievements: [{ type: String }],
          links: [{ type: String }],
        },
      ],
      experience: [
        {
          company: { type: String, default: '' },
          role: { type: String, default: '' },
          location: { type: String, default: '' },
          startDate: { type: String, default: '' },
          endDate: { type: String, default: '' },
          responsibilities: [{ type: String }],
          technologies: [{ type: String }],
          achievements: [{ type: String }],
        },
      ],
      certifications: [
        {
          name: { type: String, default: '' },
          issuer: { type: String, default: '' },
          date: { type: String, default: '' },
          credentialId: { type: String, default: '' },
          link: { type: String, default: '' },
        },
      ],
      achievements: [{ type: String }],
      leadership: [{ type: mongoose.Schema.Types.Mixed }],
      extracurricularActivities: [{ type: String }],
      coursesAndTraining: [{ type: String }],
      languages: [{ type: mongoose.Schema.Types.Mixed }],
      interests: [{ type: String }],
      publications: [{ type: mongoose.Schema.Types.Mixed }],
      extractedKeywords: [{ type: String }],
      resumeSections: [{ type: String }],
      additionalSections: [
        {
          title: { type: String },
          content: { type: mongoose.Schema.Types.Mixed },
        },
      ],
    },

    // Phase 3 — AI Resume Understanding Map (Network of explicit entities & relationships)
    resumeUnderstandingMap: {
      nodes: [
        {
          id: { type: String, required: true },
          label: { type: String, required: true },
          type: { type: String, required: true }, // 'candidate', 'skill', 'project', 'company', 'education', 'certification'
          category: { type: String, default: '' },
        },
      ],
      relationships: [
        {
          source: { type: String, required: true },
          relationship: { type: String, required: true }, // 'used_in', 'studied_at', 'worked_at', 'certified_in'
          target: { type: String, required: true },
        },
      ],
    },

    // Phase 4 — Company & Role Analysis Agent Pipeline State
    companyRoleAnalysis: {
      status: {
        type: String,
        enum: ['not_started', 'processing', 'completed', 'failed', 'stale'],
        default: 'not_started',
      },
      analyzedAt: {
        type: Date,
        default: null,
      },
      error: {
        type: String,
        default: null,
      },
    },

    // Phase 4 — Structured Company Context
    companyAnalysis: {
      companyName: { type: String, default: '' },
      companyContext: { type: String, default: '' },
      industry: { type: String, default: '' },
      domain: { type: String, default: '' },
      relevantProductsOrServices: [{ type: String }],
      roleContext: { type: String, default: '' },
      companyQuote: { type: String, default: '' },
    },

    // Phase 4 — Structured Role Analysis
    roleAnalysis: {
      roleTitle: { type: String, default: '' },
      normalizedRole: { type: String, default: '' },
      seniorityLevel: { type: String, default: '' },
      jobType: { type: String, default: 'Full Time' },
      location: { type: String, default: '' },
      roleSummary: { type: String, default: '' },
      keyHighlights: [{ type: String }],
      primaryResponsibilities: [{ type: String }],
      secondaryResponsibilities: [{ type: String }],
      technicalAreas: [{ type: String }],
      softSkills: [{ type: String }],
      toolsAndTechnologies: [{ type: String }],
      domainAreas: [{ type: String }],
    },

    // Phase 4 — Structured Job Requirements
    requirements: {
      mustHave: [{ type: String }],
      preferred: [{ type: String }],
      technicalSkills: [{ type: String }],
      tools: [{ type: String }],
      education: [{ type: String }],
      experience: [{ type: String }],
      softSkills: [{ type: String }],
      technicalDetails: {
        programmingLanguages: [{ type: String }],
        frameworks: [{ type: String }],
        testingTools: [{ type: String }],
        databases: [{ type: String }],
        cloudTechnologies: [{ type: String }],
        developmentTools: [{ type: String }],
        methodologies: [{ type: String }],
        otherTechnologies: [{ type: String }],
      },
      experienceDetails: {
        requiredExperience: { type: String, default: '' },
        preferredExperience: { type: String, default: '' },
        experienceLevel: { type: String, default: '' },
        yearsOfExperience: { type: String, default: '' },
        internshipRequirements: [{ type: String }],
      },
      educationDetails: {
        requiredDegrees: [{ type: String }],
        preferredDegrees: [{ type: String }],
        requiredFields: [{ type: String }],
        academicRequirements: [{ type: String }],
      },
    },

    // Phase 4 — Interview-Relevant Preparation Areas (Topics only, no questions)
    interviewRelevantAreas: [{ type: String }],

    // Phase 4 — AI Job Requirement Map (Hierarchical role requirement tree)
    jobRequirementMap: {
      nodes: [
        {
          id: { type: String, required: true },
          label: { type: String, required: true },
          type: { type: String, required: true }, // 'role', 'category', 'tech', 'responsibility', 'tool', 'soft_skill'
          category: { type: String, default: '' },
        },
      ],
      relationships: [
        {
          source: { type: String, required: true },
          relationship: { type: String, required: true }, // 'has_category', 'requires', 'includes', 'utilizes', 'expects'
          target: { type: String, required: true },
        },
      ],
    },

    // Backward-compatible summary fields for skill gap
    skillGap: {
      matchingSkills: [{ type: String }],
      missingSkills: [{ type: String }],
      weakSkills: [{ type: String }],
    },

    // Phase 5 — Skill Gap Analysis Agent Pipeline State & Comprehensive Matrix
    skillGapAnalysis: {
      status: {
        type: String,
        enum: ['not_started', 'processing', 'completed', 'failed', 'stale'],
        default: 'not_started',
      },
      analyzedAt: {
        type: Date,
        default: null,
      },
      error: {
        type: String,
        default: null,
      },
      coverageScore: {
        type: Number,
        default: 0,
      },
      strongSkills: [{ type: String }],
      partialSkills: [{ type: String }],
      needsPractice: [{ type: String }],
      missingSkills: [{ type: String }],
      transferableSkills: [{ type: String }],
      requirementAnalysis: [
        {
          requirement: { type: String, required: true },
          category: { type: String, default: 'General' },
          candidateEvidence: { type: String, default: 'No evidence found' },
          status: {
            type: String,
            enum: ['strong', 'partial', 'needs_practice', 'missing'],
            required: true,
          },
          confidence: { type: String, enum: ['High', 'Medium', 'Low'], default: 'High' },
          importance: { type: String, default: 'Normal' },
          details: { type: String, default: '' },
        },
      ],
      preparationPriorities: [
        {
          rank: { type: Number, required: true },
          skill: { type: String, required: true },
          priority: { type: String, enum: ['High', 'Medium', 'Low'], required: true },
          status: { type: String, required: true },
          reason: { type: String, default: '' },
        },
      ],
    },

    // Phase 5 — AI Resume Tailoring State & Isolated Tailored Resume Versions
    tailoredResume: {
      status: {
        type: String,
        enum: ['not_started', 'generating', 'generated', 'edited', 'failed', 'stale'],
        default: 'not_started',
      },
      generatedAt: {
        type: Date,
        default: null,
      },
      editedAt: {
        type: Date,
        default: null,
      },
      currentVersion: {
        type: Number,
        default: 1,
      },
      content: {
        personalInfo: {
          name: { type: String, default: '' },
          title: { type: String, default: '' },
          email: { type: String, default: '' },
          phone: { type: String, default: '' },
          location: { type: String, default: '' },
          linkedin: { type: String, default: '' },
          github: { type: String, default: '' },
          portfolio: { type: String, default: '' },
        },
        professionalSummary: { type: String, default: '' },
        skills: {
          technicalSkills: [{ type: String }],
          softSkills: [{ type: String }],
          tools: [{ type: String }],
          languages: [{ type: String }],
          databases: [{ type: String }],
          frameworks: [{ type: String }],
        },
        experience: [
          {
            company: { type: String, default: '' },
            role: { type: String, default: '' },
            location: { type: String, default: '' },
            startDate: { type: String, default: '' },
            endDate: { type: String, default: '' },
            responsibilities: [{ type: String }],
            technologies: [{ type: String }],
          },
        ],
        projects: [
          {
            name: { type: String, default: '' },
            role: { type: String, default: '' },
            description: { type: String, default: '' },
            technologies: [{ type: String }],
            responsibilities: [{ type: String }],
            links: [{ type: String }],
          },
        ],
        education: [
          {
            degree: { type: String, default: '' },
            institution: { type: String, default: '' },
            fieldOfStudy: { type: String, default: '' },
            startYear: { type: String, default: '' },
            endYear: { type: String, default: '' },
            percentageOrCGPA: { type: String, default: '' },
          },
        ],
        certifications: [
          {
            name: { type: String, default: '' },
            issuer: { type: String, default: '' },
            date: { type: String, default: '' },
            credentialId: { type: String, default: '' },
          },
        ],
        achievements: [{ type: String }],
        additionalSections: [
          {
            title: { type: String },
            items: [{ type: String }],
          },
        ],
      },
      versions: [
        {
          version: { type: Number, required: true },
          label: { type: String, default: '' },
          createdAt: { type: Date, default: Date.now },
          content: { type: mongoose.Schema.Types.Mixed },
        },
      ],
    },

    // Phase 5 — User's Editable Uploaded Resume & Version History (Separate from AI Ideal Resume)
    userResume: {
      status: {
        type: String,
        enum: ['original', 'edited'],
        default: 'original',
      },
      lastSavedAt: {
        type: Date,
        default: null,
      },
      currentVersion: {
        type: Number,
        default: 1,
      },
      content: {
        personalInfo: {
          name: { type: String, default: '' },
          title: { type: String, default: '' },
          email: { type: String, default: '' },
          phone: { type: String, default: '' },
          location: { type: String, default: '' },
          linkedin: { type: String, default: '' },
          github: { type: String, default: '' },
          portfolio: { type: String, default: '' },
        },
        professionalSummary: { type: String, default: '' },
        skills: {
          technicalSkills: [{ type: String }],
          softSkills: [{ type: String }],
          tools: [{ type: String }],
          languages: [{ type: String }],
          databases: [{ type: String }],
          frameworks: [{ type: String }],
        },
        experience: [
          {
            company: { type: String, default: '' },
            role: { type: String, default: '' },
            location: { type: String, default: '' },
            startDate: { type: String, default: '' },
            endDate: { type: String, default: '' },
            responsibilities: [{ type: String }],
            technologies: [{ type: String }],
          },
        ],
        projects: [
          {
            name: { type: String, default: '' },
            role: { type: String, default: '' },
            description: { type: String, default: '' },
            technologies: [{ type: String }],
            responsibilities: [{ type: String }],
            links: [{ type: String }],
          },
        ],
        education: [
          {
            degree: { type: String, default: '' },
            institution: { type: String, default: '' },
            fieldOfStudy: { type: String, default: '' },
            startYear: { type: String, default: '' },
            endYear: { type: String, default: '' },
            percentageOrCGPA: { type: String, default: '' },
          },
        ],
        certifications: [
          {
            name: { type: String, default: '' },
            issuer: { type: String, default: '' },
            date: { type: String, default: '' },
            credentialId: { type: String, default: '' },
          },
        ],
        achievements: [{ type: String }],
        additionalSections: [
          {
            title: { type: String },
            items: [{ type: String }],
          },
        ],
      },
      versions: [
        {
          version: { type: Number, required: true },
          label: { type: String, default: '' },
          createdAt: { type: Date, default: Date.now },
          content: { type: mongoose.Schema.Types.Mixed },
        },
      ],
    },

    // Phase 6 — Job Preparation Plan
    jobPreparationPlan: {
      status: {
        type: String,
        enum: ['not_started', 'generating', 'completed', 'stale', 'failed'],
        default: 'not_started',
      },
      generatedAt: { type: Date, default: null },
      readinessScore: { type: Number, default: 0 },
      initialReadinessScore: { type: Number, default: 0 },
      headline: { type: String, default: "You are on the right track!" },
      explanation: {
        type: String,
        default:
          'Based on your skill gap analysis and target role, this plan focuses on the most important areas to help you crack the interview.',
      },
      stagesCount: { type: Number, default: 6 },
      topicsCount: { type: Number, default: 28 },
      estimatedWeeks: { type: Number, default: 6 },
      priorities: [
        {
          rank: { type: Number, required: true },
          topic: { type: String, required: true },
          reason: { type: String, default: '' },
          priority: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
        },
      ],
      roadmap: [
        {
          stageNumber: { type: Number, required: true },
          title: { type: String, required: true },
          topicsCount: { type: Number, default: 3 },
          estimatedDuration: { type: String, default: '1 week' },
          description: { type: String, default: '' },
        },
      ],
      technicalPreparation: [
        {
          topic: { type: String, required: true },
          category: { type: String, default: 'General' },
          priority: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
          currentLevel: { type: String, default: 'Beginner' },
          targetLevel: { type: String, default: 'Intermediate' },
          estimatedTime: { type: String, default: '1 week' },
          completed: { type: Boolean, default: false },
        },
      ],
      skillGapSummary: {
        strongCount: { type: Number, default: 0 },
        transferableCount: { type: Number, default: 0 },
        needsPracticeCount: { type: Number, default: 0 },
        missingCount: { type: Number, default: 0 },
      },
      projectPreparation: [
        {
          projectName: { type: String, required: true },
          projectRelevance: { type: String, default: '' },
          priority: { type: String, enum: ['High', 'Medium', 'Low'], default: 'High' },
          preparationPoints: [{ type: String }],
        },
      ],
      resumePreparation: [
        {
          id: { type: String, required: true },
          text: { type: String, required: true },
          completed: { type: Boolean, default: false },
        },
      ],
      behavioralPreparation: [
        {
          topic: { type: String, required: true },
          priority: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
          icon: { type: String, default: 'user' },
        },
      ],
      schedule: [
        {
          weekNumber: { type: Number, required: true },
          title: { type: String, default: '' },
          days: [
            {
              day: { type: String, required: true },
              task: { type: String, required: true },
              completed: { type: Boolean, default: false },
            },
          ],
        },
      ],
      readinessChecklist: [
        {
          id: { type: String, required: true },
          text: { type: String, required: true },
          completed: { type: Boolean, default: false },
        },
      ],
    },

    // Phase 7 — AI Job Readiness Twin
    jobReadinessTwin: {
      status: {
        type: String,
        enum: ['not_started', 'generating', 'completed', 'stale', 'failed'],
        default: 'not_started',
      },
      overallScore: { type: Number, default: 0 },
      readinessStatus: {
        type: String,
        enum: [
          'Needs Significant Preparation',
          'Developing',
          'Approaching Readiness',
          'Interview Ready',
          'Not Started',
        ],
        default: 'Not Started',
      },
      previousScore: { type: Number, default: null },
      scoreDelta: { type: Number, default: 0 },
      headlineInsight: { type: String, default: '' },
      dimensions: {
        technical: {
          score: { type: Number, default: 0 },
          status: { type: String, default: 'Developing' },
          label: { type: String, default: 'Technical Readiness' },
          summary: { type: String, default: '' },
          evidence: [{ type: String }],
          gaps: [{ type: String }],
        },
        jobRequirements: {
          score: { type: Number, default: 0 },
          status: { type: String, default: 'Developing' },
          label: { type: String, default: 'Job Requirement Readiness' },
          summary: { type: String, default: '' },
          evidence: [{ type: String }],
          gaps: [{ type: String }],
        },
        projects: {
          score: { type: Number, default: 0 },
          status: { type: String, default: 'Developing' },
          label: { type: String, default: 'Project Readiness' },
          summary: { type: String, default: '' },
          evidence: [{ type: String }],
          gaps: [{ type: String }],
        },
        problemSolving: {
          score: { type: Number, default: null },
          status: { type: String, default: 'not_enough_evidence' },
          label: { type: String, default: 'Problem Solving Readiness' },
          summary: { type: String, default: 'Will be available after mock interviews' },
          evidence: [{ type: String }],
          gaps: [{ type: String }],
        },
        communication: {
          score: { type: Number, default: null },
          status: { type: String, default: 'not_enough_evidence' },
          label: { type: String, default: 'Communication Readiness' },
          summary: { type: String, default: 'Will be available after mock interviews' },
          evidence: [{ type: String }],
          gaps: [{ type: String }],
        },
        resumeDefense: {
          score: { type: Number, default: null },
          status: { type: String, default: 'awaiting_interview_evidence' },
          label: { type: String, default: 'Resume Defense Readiness' },
          summary: { type: String, default: 'Will be available after mock interviews' },
          evidence: [{ type: String }],
          gaps: [{ type: String }],
        },
      },
      topStrengths: [
        {
          name: { type: String, required: true },
          level: { type: String, default: 'Strong' },
          category: { type: String, default: 'Technical' },
          evidence: { type: String, default: '' },
        },
      ],
      topRisks: [
        {
          rank: { type: Number, required: true },
          topic: { type: String, required: true },
          severity: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
          reason: { type: String, required: true },
        },
      ],
      nextBestAction: {
        actionTitle: { type: String, default: '' },
        reason: { type: String, default: '' },
        priority: { type: String, default: 'High' },
        estimatedTime: { type: String, default: '30 min' },
        focusAreas: [{ type: String }],
        targetModule: { type: String, default: 'practice' },
      },
      skillWiseReadiness: [
        {
          skill: { type: String, required: true },
          currentLevel: {
            type: String,
            enum: ['Strong', 'Partial', 'Missing', 'Needs Practice'],
            default: 'Partial',
          },
          priority: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
          readiness: { type: Number, default: 50 },
        },
      ],
      nextSteps: [
        {
          stepNumber: { type: Number, required: true },
          title: { type: String, required: true },
          estimatedTime: { type: String, default: '30 min' },
          description: { type: String, required: true },
        },
      ],
      insights: [{ type: String }],
      proTip: { type: String, default: '' },
      readinessHistory: [
        {
          score: { type: Number, required: true },
          date: { type: Date, default: Date.now },
          label: { type: String, default: '' },
          source: { type: String, default: 'initial_assessment' },
        },
      ],
      calculatedAt: { type: Date, default: null },
      scoreVersion: { type: Number, default: 1 },
    },

    interviewPlan: { type: mongoose.Schema.Types.Mixed, default: null },
    mockInterviewSession: {
      status: {
        type: String,
        enum: ['setup', 'active', 'analyzing', 'completed', 'abandoned', 'not_started'],
        default: 'not_started',
      },
      currentRound: { type: Number, default: 1 },
      totalRounds: { type: Number, default: 4 },
      currentRoundTitle: { type: String, default: 'Technical Fundamentals' },
      questionNumber: { type: Number, default: 1 },
      totalQuestionsTarget: { type: Number, default: 12 },
      currentQuestion: {
        id: { type: String, default: '' },
        question: { type: String, default: '' },
        category: { type: String, default: 'Technical' },
        topic: { type: String, default: '' },
        difficulty: { type: String, default: 'Medium' },
        source: { type: String, default: 'JD' },
        hint: { type: String, default: "Take your time to answer. I'm listening..." },
        roundNumber: { type: Number, default: 1 },
      },
      questions: [
        {
          id: { type: String, required: true },
          question: { type: String, required: true },
          category: { type: String, default: 'Technical' },
          topic: { type: String, default: '' },
          difficulty: { type: String, default: 'Medium' },
          source: { type: String, default: 'JD' },
          roundNumber: { type: Number, default: 1 },
          askedAt: { type: Date, default: Date.now },
        },
      ],
      answers: [
        {
          questionId: { type: String, required: true },
          question: { type: String, required: true },
          category: { type: String, default: 'Technical' },
          topic: { type: String, default: '' },
          difficulty: { type: String, default: 'Medium' },
          source: { type: String, default: 'JD' },
          answer: { type: String, default: '' },
          transcript: { type: String, default: '' },
          durationSeconds: { type: Number, default: 0 },
          roundNumber: { type: Number, default: 1 },
          answerAnalysis: {
            relevance: { type: Number, default: 0 },
            technicalAccuracy: { type: Number, default: 0 },
            completeness: { type: Number, default: 0 },
            quality: {
              type: String,
              enum: ['Strong', 'Partial', 'Weak'],
              default: 'Partial',
            },
            strengths: [{ type: String }],
            weaknesses: [{ type: String }],
            feedback: { type: String, default: '' },
          },
          followUpGenerated: { type: Boolean, default: false },
          submittedAt: { type: Date, default: Date.now },
          nextAction: { type: String, default: '' },
          nextActionReasoning: { type: String, default: '' },
          isFollowUp: { type: Boolean, default: false },
          parentQuestionId: { type: String, default: '' },
        },
      ],
      integritySignals: [
        {
          type: { type: String, required: true },
          severity: { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
          timestamp: { type: Date, default: Date.now },
          description: { type: String, required: true },
        },
      ],
      performanceSnapshot: {
        overallPerformance: { type: Number, default: 0 },
        badgeText: { type: String, default: 'Good Performance!' },
        summary: { type: String, default: '' },
        questionsAnswered: { type: Number, default: 0 },
        roundsCompleted: { type: Number, default: 0 },
        topicsCovered: { type: Number, default: 0 },
        totalDurationSeconds: { type: Number, default: 0 },
        integritySignalsCount: { type: Number, default: 0 },
      },
      startedAt: { type: Date, default: null },
      endedAt: { type: Date, default: null },
      durationSeconds: { type: Number, default: 0 },
      completed: { type: Boolean, default: false },
      interviewType: { type: String, enum: ['Technical', 'HR', 'Mixed'], default: 'Mixed' },
      estimatedDurationMinutes: { type: Number, default: 25 },
      objectives: [{ type: String }],
      coverage: {
        overall: { type: Number, default: 0 },
        technical: { type: Number, default: 0 },
        resume: { type: Number, default: 0 },
        skillGap: { type: Number, default: 0 },
        behavioral: { type: Number, default: 0 },
      },
      coveredTopics: [{ type: String }],
      uncoveredTopics: [{ type: String }],
      difficultyState: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Medium' },
      agentDecisions: [{
        questionId: { type: String },
        nextAction: { type: String },
        reasoning: { type: String },
        timestamp: { type: Date, default: Date.now },
      }],
      completionReason: { type: String, default: '' },
      finalEvaluation: { type: mongoose.Schema.Types.Mixed, default: null },
    },
    interviewHistory: [{ type: mongoose.Schema.Types.Mixed }],
    mistakeMemory: [{
      topic: { type: String, required: true },
      category: { type: String, default: 'Technical' },
      weakness: { type: String, default: '' },
      severity: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
      occurrenceCount: { type: Number, default: 1 },
      firstSeenAt: { type: Date, default: Date.now },
      lastSeenAt: { type: Date, default: Date.now },
      lastScore: { type: Number, default: 0 },
      trend: { type: String, enum: ['improving', 'declining', 'stable', 'new'], default: 'new' },
      resolved: { type: Boolean, default: false },
    }],
    evaluationResults: { type: mongoose.Schema.Types.Mixed, default: null },
    mistakes: {
      weakTopics: [{ type: String }],
      strongTopics: [{ type: String }],
    },
    progressData: { type: mongoose.Schema.Types.Mixed, default: null },
    nextAction: { type: String, default: 'RUN_RESUME_ANALYSIS' },
    lastAgent: { type: String, default: null },
    agentHistory: [
      {
        agent: { type: String, required: true },
        status: { type: String, required: true },
        startedAt: { type: Date, default: Date.now },
        completedAt: { type: Date, default: null },
        error: { type: String, default: null },
        retryCount: { type: Number, default: 0 },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Virtual getter for display role
preparationSessionSchema.virtual('displayRole').get(function () {
  if (this.targetRole === 'Other / Custom Role' && this.customRole) {
    return this.customRole;
  }
  return this.targetRole;
});

preparationSessionSchema.set('toObject', { virtuals: true });
preparationSessionSchema.set('toJSON', { virtuals: true });

const PreparationSession = mongoose.model('PreparationSession', preparationSessionSchema);

module.exports = PreparationSession;
