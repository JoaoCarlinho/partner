# Demand Letter Management Frontend - Epics and Stories

**Source Document:** [demand-letter-management-frontend.md](../requirements/demand-letter-management-frontend.md)
**Created:** 2025-11-26
**Status:** Ready for Development

---

## Epic Overview

| Epic | Name | Stories | Priority |
|------|------|---------|----------|
| 1 | Demand Letter List & Navigation | 3 | Must - Phase 1 |
| 2 | Letter Detail & Manual Editing | 4 | Must - Phase 1 |
| 3 | AI-Assisted Refinement | 4 | Must - Phase 2 |
| 4 | Version History & Comparison | 3 | Should - Phase 2 |
| 5 | Approval Workflow | 5 | Must - Phase 3 |
| 6 | PDF Preview & Download | 2 | Must - Phase 1/3 |

---

## Epic 1: Demand Letter List & Navigation

**Goal:** Enable users to view all demand letters for a case with status tracking and navigation.

**User Value:** Paralegals and attorneys can quickly find and access demand letters, understand their status at a glance, and navigate to detailed views.

### Story 1.1: Basic Letter List Display
**As a** paralegal
**I want to** see all demand letters for a case in a list
**So that** I can track their status and access them quickly

**Acceptance Criteria:**
- [ ] Display list of demand letters from `GET /api/v1/demands?caseId={caseId}`
- [ ] Show letter status badge using STATUS_COLORS (DRAFT, PENDING_REVIEW, APPROVED, SENT)
- [ ] Show creation date and last modified date for each letter
- [ ] Letters display in descending order by creation date
- [ ] Empty state shows "No demand letters yet" with generate CTA

**Technical Notes:**
- Create `DemandLetterList.tsx` component in `/app/cases/view/components/`
- Use existing StatusBadge component with STATUS_COLORS
- Integrate with existing CaseViewContent.tsx

**Requirements:** DL-LIST-01, DL-LIST-02, DL-LIST-03

---

### Story 1.2: List Sorting and Version Display
**As a** paralegal
**I want to** sort letters and see version numbers
**So that** I can find specific letters and track revisions

**Acceptance Criteria:**
- [ ] Display current version number for each letter
- [ ] Enable sorting by date (ascending/descending)
- [ ] Enable sorting by status
- [ ] Sort controls clearly visible and accessible

**Technical Notes:**
- Add sort state management to DemandLetterList
- Implement client-side sorting (API returns all letters for case)

**Requirements:** DL-LIST-04, DL-LIST-05

---

### Story 1.3: Template Information Display
**As a** paralegal
**I want to** see which template was used for each letter
**So that** I can understand the letter's basis

**Acceptance Criteria:**
- [ ] Show template name if applicable
- [ ] Handle letters without templates gracefully

**Technical Notes:**
- Template info included in demand letter response

**Requirements:** DL-LIST-06

---

## Epic 2: Letter Detail & Manual Editing

**Goal:** Enable users to view letter content, metadata, and compliance status, and manually edit draft letters.

**User Value:** Users can review full letter content, understand compliance issues, and make manual corrections before submission.

### Story 2.1: Letter Detail View
**As a** paralegal
**I want to** view the full content and metadata of a demand letter
**So that** I can review it before taking action

**Acceptance Criteria:**
- [ ] Display full letter content from `GET /api/v1/demands/{id}`
- [ ] Show letter metadata: case info, template, dates
- [ ] Display compliance status with score and check details
- [ ] Content displays with proper formatting (paragraphs preserved)
- [ ] Compliance issues highlighted with specific guidance

**Technical Notes:**
- Create `DemandLetterDetail.tsx` component
- Create `CompliancePanel.tsx` sidebar component
- Header: Case reference, debtor name, status badge
- Content Panel: Letter content display
- Sidebar: Compliance panel, metadata

**Requirements:** DL-EDIT-02, DL-EDIT-03

---

### Story 2.2: Manual Content Editing
**As a** paralegal
**I want to** manually edit a draft demand letter
**So that** I can make corrections before submission

**Acceptance Criteria:**
- [ ] Display letter content in editable text area for DRAFT status
- [ ] Save changes with `PATCH /api/v1/demands/{id}` endpoint
- [ ] Show unsaved changes indicator
- [ ] Save button disabled when no changes or content invalid
- [ ] Footer shows save/cancel buttons and last saved timestamp

**Technical Notes:**
- Create `DemandLetterEditor.tsx` component
- Implement controlled textarea with change tracking
- Add dirty state management for unsaved changes

**Requirements:** DL-EDIT-01, DL-EDIT-04, DL-EDIT-05, DL-EDIT-07

---

### Story 2.3: Read-Only Mode for Sent Letters
**As a** user
**I want** sent letters to be read-only
**So that** I cannot accidentally modify finalized correspondence

**Acceptance Criteria:**
- [ ] SENT status letters display in read-only mode
- [ ] Edit controls hidden/disabled for SENT letters
- [ ] Clear visual indication of read-only state

**Technical Notes:**
- Conditional rendering based on letter status

**Requirements:** DL-EDIT-06

---

### Story 2.4: Navigation Guards and Auto-Save
**As a** user
**I want to** be warned about unsaved changes and have drafts auto-saved
**So that** I don't lose my work

**Acceptance Criteria:**
- [ ] Confirmation prompt when navigating away with unsaved changes
- [ ] Auto-save draft every 30 seconds (if changes exist)
- [ ] Visual indicator during auto-save

**Technical Notes:**
- Implement beforeunload handler
- Use Next.js router events for SPA navigation
- Debounced auto-save with loading indicator

**Requirements:** DL-EDIT-08

---

## Epic 3: AI-Assisted Refinement

**Goal:** Enable users to refine letters using natural language instructions with AI assistance.

**User Value:** Paralegals can improve letter quality without manual rewriting by providing simple instructions to the AI.

### Story 3.1: Refinement Input and Suggestions
**As a** paralegal
**I want to** provide instructions for AI refinement or select common suggestions
**So that** I can improve the letter without manual rewriting

**Acceptance Criteria:**
- [ ] Text input for refinement instruction with 1000 char limit
- [ ] Display common refinement suggestions as quick-select buttons from `GET /api/v1/demands/refinement-suggestions`
- [ ] Instruction field validates min 1, max 1000 characters
- [ ] Placeholder text guides user input

**Suggested Quick Actions:**
- "Make tone more professional"
- "Simplify language for readability"
- "Emphasize dispute rights"
- "Strengthen payment urgency"

**Technical Notes:**
- Create `RefinementPanel.tsx` component
- Suggestions grid with clickable buttons
- Character counter for instruction input

**Requirements:** DL-REF-01, DL-REF-02

---

### Story 3.2: Refinement Processing and Results
**As a** paralegal
**I want to** see the AI refinement results with changes highlighted
**So that** I can review what was modified

**Acceptance Criteria:**
- [ ] Show loading state during AI processing with "Refining..." text
- [ ] Call `POST /api/v1/demands/{id}/refine` with instruction
- [ ] Display refined content with diff highlighting (green additions, red deletions)
- [ ] Display instruction warnings in yellow alert banner if present

**Technical Notes:**
- Create `DiffViewer.tsx` component
- Support side-by-side or unified diff view
- Handle loading states and errors gracefully

**Requirements:** DL-REF-03, DL-REF-04, DL-REF-07

---

### Story 3.3: Compliance Comparison and Accept/Reject
**As a** paralegal
**I want to** see compliance impact and accept or reject refinements
**So that** I maintain letter quality and compliance

**Acceptance Criteria:**
- [ ] Show compliance comparison (before/after scores)
- [ ] Allow accepting refinement (saves new version)
- [ ] Allow rejecting refinement (discards changes, returns to previous)
- [ ] Clear accept/reject buttons with appropriate styling

**Technical Notes:**
- Side-by-side compliance score display
- Accept calls existing save endpoint
- Reject discards in-memory changes

**Requirements:** DL-REF-05, DL-REF-06

---

### Story 3.4: Undo/Redo Version Navigation
**As a** user
**I want to** undo and redo changes
**So that** I can navigate between versions easily

**Acceptance Criteria:**
- [ ] Undo button calls `POST /api/v1/demands/{id}/undo`
- [ ] Redo button calls `POST /api/v1/demands/{id}/redo`
- [ ] Undo disabled when at version 1
- [ ] Redo disabled when at latest version

**Technical Notes:**
- Track current version and available undo/redo state
- Update UI after successful undo/redo

**Requirements:** DL-VER-06, DL-VER-07

---

## Epic 4: Version History & Comparison

**Goal:** Enable users to view version history and compare changes between versions.

**User Value:** Attorneys can understand letter evolution and restore previous versions if needed.

### Story 4.1: Version History List
**As an** attorney
**I want to** see all versions of a letter
**So that** I can understand its evolution

**Acceptance Criteria:**
- [ ] List all versions from `GET /api/v1/demands/{id}/versions`
- [ ] Show version number and creation date
- [ ] Show refinement instruction that created each version
- [ ] Show creator email for each version
- [ ] Current version clearly indicated in list

**Technical Notes:**
- Create `VersionHistory.tsx` component
- Vertical timeline UI showing version progression
- Version cards with metadata

**Requirements:** DL-VER-01, DL-VER-02, DL-VER-03

---

### Story 4.2: View Historical Version Content
**As an** attorney
**I want to** view any historical version content
**So that** I can review past states of the letter

**Acceptance Criteria:**
- [ ] Click to view any version's content
- [ ] Content displays in read-only mode
- [ ] Clear indication of which version is being viewed

**Technical Notes:**
- Modal or panel to display historical content
- Fetch version content from API

**Requirements:** DL-VER-04

---

### Story 4.3: Version Comparison
**As an** attorney
**I want to** compare any two versions
**So that** I can see exactly what changed

**Acceptance Criteria:**
- [ ] Select two versions for comparison
- [ ] Display side-by-side diff from `GET /api/v1/demands/{id}/diff?v1={v1}&v2={v2}`
- [ ] Diff clearly shows additions and deletions

**Technical Notes:**
- Reuse DiffViewer component
- Comparison modal with version selectors

**Requirements:** DL-VER-05

---

## Epic 5: Approval Workflow

**Goal:** Enable the complete approval workflow from submission through sending.

**User Value:** Letters go through proper authorization before being sent, with full audit trail.

### Story 5.1: Submit for Review
**As a** paralegal
**I want to** submit a letter for attorney review
**So that** it can be approved before sending

**Acceptance Criteria:**
- [ ] "Submit for Review" button visible for DRAFT status (paralegal role)
- [ ] Submit calls `POST /api/v1/demands/{id}/submit-for-review`
- [ ] Submit disabled if compliance score below threshold
- [ ] Status updates to PENDING_REVIEW on success

**Technical Notes:**
- Create `ApprovalWorkflow.tsx` component
- Role-based button visibility
- Compliance threshold check before enabling submit

**Requirements:** DL-APR-01

---

### Story 5.2: Approve or Reject Letter
**As an** attorney
**I want to** approve or reject letters submitted for review
**So that** I can authorize sending or request changes

**Acceptance Criteria:**
- [ ] "Approve" and "Reject" buttons visible for PENDING_REVIEW status (attorney role)
- [ ] Approve calls `POST /api/v1/demands/{id}/approve`
- [ ] Approve accepts optional signature
- [ ] Reject calls `POST /api/v1/demands/{id}/reject` with required reason
- [ ] Rejection requires minimum 10 character reason
- [ ] Approval records IP address and user agent

**Technical Notes:**
- Rejection modal with text area
- Approval modal with optional signature input
- Role-based access control

**Requirements:** DL-APR-02, DL-APR-03

---

### Story 5.3: Prepare and Send Letter
**As a** user
**I want to** prepare and mark letters as sent
**So that** I can complete the sending process

**Acceptance Criteria:**
- [ ] "Prepare to Send" button for APPROVED status
- [ ] Prepare calls `POST /api/v1/demands/{id}/prepare-send`
- [ ] "Mark as Sent" button for READY_TO_SEND status
- [ ] Mark sent calls `POST /api/v1/demands/{id}/send`
- [ ] Status updates appropriately through workflow

**Technical Notes:**
- Sequential workflow states: APPROVED → READY_TO_SEND → SENT
- Confirmation dialogs for state transitions

**Requirements:** DL-APR-05, DL-APR-06

---

### Story 5.4: Approval History Timeline
**As a** user
**I want to** see the approval history
**So that** I can track who did what and when

**Acceptance Criteria:**
- [ ] Display timeline of workflow actions from `GET /api/v1/demands/{id}/approvals`
- [ ] Show action type, user, and timestamp
- [ ] Include rejection reasons where applicable

**Technical Notes:**
- Timeline UI component
- Integrate into letter detail view

**Requirements:** DL-APR-04

---

### Story 5.5: Digital Signature Capture
**As an** attorney
**I want to** provide a digital signature when approving
**So that** the letter shows proper authorization

**Acceptance Criteria:**
- [ ] Signature pad in approval modal
- [ ] Signature stored with approval
- [ ] Signature displayed on approved letters

**Technical Notes:**
- Create `SignaturePad.tsx` component (canvas-based)
- Store signature as base64 or SVG

**Requirements:** DL-APR-08

---

## Epic 6: PDF Preview & Download

**Goal:** Enable users to preview and download formatted PDF versions of letters.

**User Value:** Users can see exactly what will be sent and download copies for records.

### Story 6.1: PDF Preview
**As a** user
**I want to** preview the letter as a formatted PDF
**So that** I can see exactly what will be sent

**Acceptance Criteria:**
- [ ] Generate PDF preview from `GET /api/v1/demands/{id}/preview`
- [ ] PDF renders in modal or new tab
- [ ] Include firm letterhead in PDF
- [ ] Include approval signature if approved
- [ ] Letterhead includes organization name

**Technical Notes:**
- Create `PdfPreviewModal.tsx` component
- Handle PDF blob response
- Use iframe or embed for in-page preview

**Requirements:** DL-PDF-01, DL-PDF-02, DL-PDF-03, DL-APR-07

---

### Story 6.2: PDF Download and Print
**As a** user
**I want to** download and print the PDF
**So that** I can keep records and send physical copies

**Acceptance Criteria:**
- [ ] Download button saves PDF
- [ ] Filename format: `demand-letter-{id}.pdf`
- [ ] Print option available from preview

**Technical Notes:**
- Trigger browser download with proper filename
- Print via window.print() or PDF viewer controls

**Requirements:** DL-PDF-04, DL-PDF-05

---

## Non-Functional Requirements (Cross-Cutting)

These requirements apply across all epics:

### Performance
- Letter content loads within 2 seconds
- AI refinement shows loading state immediately, completes within 30 seconds
- Version history lazy-loads content on demand

### Accessibility
- All interactive elements keyboard accessible
- ARIA labels on status badges and action buttons
- Color-blind friendly diff highlighting (patterns + color)

### Responsive Design
- Full functionality on desktop (1024px+)
- Readable on tablet (768px+)
- View-only on mobile (< 768px)

### Error Handling
- User-friendly error messages for API failures
- Retry option for transient failures (503)
- Preserve user input on error

---

## Implementation Order

**Recommended sequence based on dependencies and value delivery:**

1. **Epic 1** - Letter List (foundation for navigation)
2. **Epic 2** - Detail & Edit (core editing capability)
3. **Epic 6.1** - PDF Preview (needed before approval)
4. **Epic 3** - AI Refinement (high-value feature)
5. **Epic 4** - Version History (supports refinement review)
6. **Epic 5** - Approval Workflow (completes letter lifecycle)
7. **Epic 6.2** - PDF Download/Print (polish)

---

## Component Architecture

```
/app/cases/view/
├── CaseViewContent.tsx (enhance with demand letter tab)
├── components/
│   ├── DemandLetterList.tsx (Epic 1)
│   ├── DemandLetterDetail.tsx (Epic 2)
│   ├── DemandLetterEditor.tsx (Epic 2)
│   ├── RefinementPanel.tsx (Epic 3)
│   ├── DiffViewer.tsx (Epic 3, 4)
│   ├── VersionHistory.tsx (Epic 4)
│   ├── ApprovalWorkflow.tsx (Epic 5)
│   ├── CompliancePanel.tsx (Epic 2)
│   └── PdfPreviewModal.tsx (Epic 6)

/components/
├── StatusBadge.tsx (enhance existing)
├── Modal.tsx (create if not exists)
└── SignaturePad.tsx (Epic 5)
```
