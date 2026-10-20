const PDFDocument = require('pdfkit');
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
} = require('docx');

class ResumeExportService {
  /**
   * Generate genuine selectable-text ATS-compliant PDF
   * @param {object} content - Tailored resume content
   * @returns {Promise<Buffer>}
   */
  generatePdf(content) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          margin: 40,
          size: 'A4',
          info: {
            Title: `${content.personalInfo?.name || 'Resume'} - ${content.personalInfo?.title || 'Tailored Resume'}`,
            Author: content.personalInfo?.name || 'Candidate',
            Subject: 'Tailored ATS Resume',
          },
        });

        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });

        const p = content.personalInfo || {};

        // 1. Header (Name, Title, Contact Info)
        doc
          .font('Helvetica-Bold')
          .fontSize(18)
          .fillColor('#0f172a')
          .text((p.name || 'Candidate Name').toUpperCase(), { align: 'center' });

        if (p.title) {
          doc
            .font('Helvetica-Bold')
            .fontSize(11)
            .fillColor('#2563eb')
            .text(p.title, { align: 'center' })
            .moveDown(0.2);
        }

        // Contact info line
        const contacts = [
          p.location,
          p.phone,
          p.email,
          p.linkedin,
          p.github,
          p.portfolio,
        ].filter(Boolean);

        doc
          .font('Helvetica')
          .fontSize(8.5)
          .fillColor('#475569')
          .text(contacts.join('  |  '), { align: 'center' })
          .moveDown(0.6);

        // Divider
        doc
          .strokeColor('#cbd5e1')
          .lineWidth(0.75)
          .moveTo(40, doc.y)
          .lineTo(555, doc.y)
          .stroke()
          .moveDown(0.6);

        const addSectionHeading = (title) => {
          doc
            .moveDown(0.5)
            .font('Helvetica-Bold')
            .fontSize(10.5)
            .fillColor('#1e293b')
            .text(title.toUpperCase())
            .strokeColor('#e2e8f0')
            .lineWidth(0.5)
            .moveTo(40, doc.y + 2)
            .lineTo(555, doc.y + 2)
            .stroke()
            .moveDown(0.4);
        };

        // 2. Professional Summary / Summary (Standard ATS Section Name)
        if (content.professionalSummary) {
          addSectionHeading('Summary');
          doc
            .font('Helvetica')
            .fontSize(9)
            .fillColor('#334155')
            .text(content.professionalSummary, { lineGap: 2.5 });
        }

        // 3. Skills
        const s = content.skills || {};
        const skillEntries = [];
        if (Array.isArray(s.technicalSkills) && s.technicalSkills.length) {
          skillEntries.push({ label: 'Technical Skills', list: s.technicalSkills });
        }
        if (Array.isArray(s.languages) && s.languages.length) {
          skillEntries.push({ label: 'Languages', list: s.languages });
        }
        if (Array.isArray(s.frameworks) && s.frameworks.length) {
          skillEntries.push({ label: 'Frameworks / Libraries', list: s.frameworks });
        }
        if (Array.isArray(s.databases) && s.databases.length) {
          skillEntries.push({ label: 'Databases', list: s.databases });
        }
        if (Array.isArray(s.tools) && s.tools.length) {
          skillEntries.push({ label: 'Tools & Cloud', list: s.tools });
        }
        if (Array.isArray(s.softSkills) && s.softSkills.length) {
          skillEntries.push({ label: 'Soft Skills', list: s.softSkills });
        }

        if (skillEntries.length) {
          addSectionHeading('Skills');
          skillEntries.forEach((entry) => {
            doc
              .font('Helvetica-Bold')
              .fontSize(8.5)
              .fillColor('#0f172a')
              .text(`${entry.label}: `, { continued: true })
              .font('Helvetica')
              .fillColor('#334155')
              .text(entry.list.join(', '), { lineGap: 2 });
          });
        }

        // 4. Projects
        if (Array.isArray(content.projects) && content.projects.length) {
          addSectionHeading('Projects');
          content.projects.forEach((proj) => {
            doc
              .font('Helvetica-Bold')
              .fontSize(9.5)
              .fillColor('#0f172a')
              .text(proj.name, { continued: true })
              .font('Helvetica')
              .fontSize(8.5)
              .fillColor('#64748b')
              .text(proj.technologies?.length ? `  [ ${proj.technologies.join(', ')} ]` : '');

            if (proj.role) {
              doc
                .font('Helvetica-Oblique')
                .fontSize(8.5)
                .fillColor('#475569')
                .text(`Role: ${proj.role}`);
            }

            if (proj.description) {
              doc
                .font('Helvetica')
                .fontSize(8.5)
                .fillColor('#334155')
                .text(proj.description, { lineGap: 1.5 });
            }

            if (Array.isArray(proj.responsibilities)) {
              proj.responsibilities.forEach((resp) => {
                doc
                  .font('Helvetica')
                  .fontSize(8.5)
                  .fillColor('#334155')
                  .text(`•  ${resp}`, { indent: 8, lineGap: 1.5 });
              });
            }
            doc.moveDown(0.3);
          });
        }

        // 5. Experience
        if (Array.isArray(content.experience) && content.experience.length) {
          addSectionHeading('Experience');
          content.experience.forEach((exp) => {
            doc
              .font('Helvetica-Bold')
              .fontSize(9.5)
              .fillColor('#0f172a')
              .text(exp.role || 'Position', { continued: true })
              .font('Helvetica')
              .fontSize(8.5)
              .fillColor('#64748b')
              .text(`  |  ${exp.company || 'Company'}${exp.location ? ` (${exp.location})` : ''}`, { continued: true })
              .text(`  |  ${exp.startDate || ''} - ${exp.endDate || 'Present'}`, { align: 'right' });

            if (Array.isArray(exp.responsibilities)) {
              exp.responsibilities.forEach((resp) => {
                doc
                  .font('Helvetica')
                  .fontSize(8.5)
                  .fillColor('#334155')
                  .text(`•  ${resp}`, { indent: 8, lineGap: 1.5 });
              });
            }
            doc.moveDown(0.3);
          });
        }

        // 6. Education
        if (Array.isArray(content.education) && content.education.length) {
          addSectionHeading('Education');
          content.education.forEach((edu) => {
            doc
              .font('Helvetica-Bold')
              .fontSize(9)
              .fillColor('#0f172a')
              .text(edu.degree || 'Degree', { continued: true })
              .font('Helvetica')
              .fontSize(8.5)
              .fillColor('#64748b')
              .text(`  |  ${edu.institution || 'College'}`, { continued: true });

            if (edu.endYear || edu.startYear) {
              doc.text(`  (${edu.startYear ? `${edu.startYear} - ` : ''}${edu.endYear || ''})`, { align: 'right' });
            } else {
              doc.text('');
            }

            if (edu.percentageOrCGPA) {
              doc
                .font('Helvetica')
                .fontSize(8.5)
                .fillColor('#334155')
                .text(`Score / CGPA: ${edu.percentageOrCGPA}`);
            }
            doc.moveDown(0.2);
          });
        }

        // 7. Certifications
        if (Array.isArray(content.certifications) && content.certifications.length) {
          addSectionHeading('Certifications');
          content.certifications.forEach((c) => {
            doc
              .font('Helvetica')
              .fontSize(8.5)
              .fillColor('#334155')
              .text(`•  ${c.name}${c.issuer ? ` — ${c.issuer}` : ''}${c.date ? ` (${c.date})` : ''}`);
          });
        }

        // 8. Achievements
        if (Array.isArray(content.achievements) && content.achievements.length) {
          addSectionHeading('Achievements');
          content.achievements.forEach((ach) => {
            doc
              .font('Helvetica')
              .fontSize(8.5)
              .fillColor('#334155')
              .text(`•  ${ach}`, { indent: 4 });
          });
        }

        // 9. Additional Custom Sections
        if (Array.isArray(content.additionalSections) && content.additionalSections.length) {
          content.additionalSections.forEach((sec) => {
            if (sec && sec.title && Array.isArray(sec.items) && sec.items.length) {
              addSectionHeading(sec.title);
              sec.items.forEach((item) => {
                doc
                  .font('Helvetica')
                  .fontSize(8.5)
                  .fillColor('#334155')
                  .text(`•  ${item}`, { indent: 4 });
              });
            }
          });
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Generate genuine editable Microsoft Word (.docx) document
   * @param {object} content - Tailored resume content
   * @returns {Promise<Buffer>}
   */
  async generateDocx(content) {
    const p = content.personalInfo || {};

    const children = [];

    // Header (Name & Title)
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: (p.name || 'Candidate Name').toUpperCase(),
            bold: true,
            size: 32, // 16pt
            color: '0F172A',
          }),
        ],
      })
    );

    if (p.title) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: p.title,
              bold: true,
              size: 24, // 12pt
              color: '2563EB',
            }),
          ],
        })
      );
    }

    // Contacts line
    const contacts = [
      p.location,
      p.phone,
      p.email,
      p.linkedin,
      p.github,
      p.portfolio,
    ].filter(Boolean);

    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: contacts.join('  |  '),
            size: 18, // 9pt
            color: '475569',
          }),
        ],
      })
    );

    const addSectionHeader = (title) => {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 240, after: 100 },
          children: [
            new TextRun({
              text: title.toUpperCase(),
              bold: true,
              size: 22, // 11pt
              color: '1E293B',
            }),
          ],
        })
      );
    };

    // Summary
    if (content.professionalSummary) {
      addSectionHeader('Professional Summary');
      children.push(
        new Paragraph({
          spacing: { after: 140 },
          children: [
            new TextRun({
              text: content.professionalSummary,
              size: 20, // 10pt
              color: '334155',
            }),
          ],
        })
      );
    }

    // Skills
    const s = content.skills || {};
    const skillLines = [];
    if (s.technicalSkills?.length) skillLines.push(`Technical Skills: ${s.technicalSkills.join(', ')}`);
    if (s.languages?.length) skillLines.push(`Languages: ${s.languages.join(', ')}`);
    if (s.frameworks?.length) skillLines.push(`Frameworks: ${s.frameworks.join(', ')}`);
    if (s.databases?.length) skillLines.push(`Databases: ${s.databases.join(', ')}`);
    if (s.tools?.length) skillLines.push(`Tools & Cloud: ${s.tools.join(', ')}`);
    if (s.softSkills?.length) skillLines.push(`Soft Skills: ${s.softSkills.join(', ')}`);

    if (skillLines.length) {
      addSectionHeader('Skills');
      skillLines.forEach((line) => {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: line,
                size: 19,
                color: '334155',
              }),
            ],
          })
        );
      });
    }

    // Projects
    if (Array.isArray(content.projects) && content.projects.length) {
      addSectionHeader('Projects');
      content.projects.forEach((proj) => {
        children.push(
          new Paragraph({
            spacing: { before: 100, after: 40 },
            children: [
              new TextRun({ text: proj.name, bold: true, size: 20, color: '0F172A' }),
              new TextRun({
                text: proj.technologies?.length ? ` [ ${proj.technologies.join(', ')} ]` : '',
                italics: true,
                size: 18,
                color: '64748B',
              }),
            ],
          })
        );

        if (proj.description) {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: proj.description, size: 19, color: '334155' })],
            })
          );
        }

        if (Array.isArray(proj.responsibilities)) {
          proj.responsibilities.forEach((resp) => {
            children.push(
              new Paragraph({
                bullet: { level: 0 },
                children: [new TextRun({ text: resp, size: 19, color: '334155' })],
              })
            );
          });
        }
      });
    }

    // Experience
    if (Array.isArray(content.experience) && content.experience.length) {
      addSectionHeader('Experience');
      content.experience.forEach((exp) => {
        children.push(
          new Paragraph({
            spacing: { before: 100, after: 40 },
            children: [
              new TextRun({ text: exp.role || 'Role', bold: true, size: 20, color: '0F172A' }),
              new TextRun({
                text: ` | ${exp.company || 'Company'}${exp.startDate ? ` (${exp.startDate} - ${exp.endDate || 'Present'})` : ''}`,
                size: 18,
                color: '64748B',
              }),
            ],
          })
        );

        if (Array.isArray(exp.responsibilities)) {
          exp.responsibilities.forEach((resp) => {
            children.push(
              new Paragraph({
                bullet: { level: 0 },
                children: [new TextRun({ text: resp, size: 19, color: '334155' })],
              })
            );
          });
        }
      });
    }

    // Education
    if (Array.isArray(content.education) && content.education.length) {
      addSectionHeader('Education');
      content.education.forEach((edu) => {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: edu.degree || 'Degree', bold: true, size: 19, color: '0F172A' }),
              new TextRun({ text: ` | ${edu.institution || 'College'}`, size: 18, color: '64748B' }),
              new TextRun({ text: edu.percentageOrCGPA ? ` (${edu.percentageOrCGPA})` : '', size: 18, color: '475569' }),
            ],
          })
        );
      });
    }

    // Certifications
    if (Array.isArray(content.certifications) && content.certifications.length) {
      addSectionHeader('Certifications');
      content.certifications.forEach((c) => {
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            children: [
              new TextRun({
                text: `${c.name}${c.issuer ? ` — ${c.issuer}` : ''}${c.date ? ` (${c.date})` : ''}`,
                size: 19,
                color: '334155',
              }),
            ],
          })
        );
      });
    }

    // Achievements
    if (Array.isArray(content.achievements) && content.achievements.length) {
      addSectionHeader('Achievements');
      content.achievements.forEach((ach) => {
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            children: [new TextRun({ text: ach, size: 19, color: '334155' })],
          })
        );
      });
    }

    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: 720,
                bottom: 720,
                left: 720,
                right: 720,
              },
            },
          },
          children,
        },
      ],
    });

    return await Packer.toBuffer(doc);
  }
}

module.exports = new ResumeExportService();
