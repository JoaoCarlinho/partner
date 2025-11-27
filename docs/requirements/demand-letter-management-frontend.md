# Demand Letter Management Frontend Requirements

**Document Version:** 1.0
**Date:** 2025-11-27
**Author:** Product Manager
**Status:** Draft

---

## 1. Overview

### 1.1 Purpose
This document defines requirements for frontend features enabling users to view, edit, refine, and manage demand letters with AI assistance. The backend API already supports these capabilities; frontend implementation is required to expose them to users.

### 1.2 Scope
- Letter viewing and editing interface
- AI-assisted refinement workflow
- Version history and comparison
- Approval workflow management
- Letter listing and navigation

### 1.3 Target Users
- **Attorneys**: Review, approve/reject letters, apply signature
- **Paralegals**: Generate, edit, refine letters, submit for review
- **Firm Admins**: Full access to all features

---

## 2. Feature Requirements

### 2.1 Demand Letter List View

**User Story:** As a paralegal, I want to see all demand letters for a case so I can track their status and access previous versions.

#### Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| DL-LIST-01 | Display list of demand letters associated with a case | Must |
| DL-LIST-02 | Show letter status badge (DRAFT, PENDING_REVIEW, APPROVED, SENT) | Must |
| DL-LIST-03 | Show creation date and last modified date | Must |
| DL-LIST-04 | Show current version number | Should |
| DL-LIST-05 | Enable sorting by date, status | Should |
| DL-LIST-06 | Show template name if applicable | Could |

#### API Integration
```
GET /api/v1/demands?caseId={caseId}
```

#### Acceptance Criteria
- [ ] Letters display in descending order by creation date
- [ ] Status badges use consistent color coding (defined in existing STATUS_COLORS)
- [ ] Clicking a letter navigates to the detail/edit view
- [ ] Empty state shows "No demand letters yet" with generate CTA

---

### 2.2 Letter Detail & Edit View

**User Story:** As a paralegal, I want to view and manually edit a demand letter so I can make corrections before submission.

#### Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| DL-EDIT-01 | Display full letter content in editable text area | Must |
| DL-EDIT-02 | Show letter metadata (case info, template, dates) | Must |
| DL-EDIT-03 | Display compliance status with score and check details | Must |
| DL-EDIT-04 | Enable manual content editing for DRAFT status letters | Must |
| DL-EDIT-05 | Save changes with PATCH endpoint | Must |
| DL-EDIT-06 | Prevent editing of SENT letters (read-only mode) | Must |
| DL-EDIT-07 | Show unsaved changes indicator | Should |
| DL-EDIT-08 | Auto-save draft periodically (30 seconds) | Could |

#### API Integration
```
GET  /api/v1/demands/{id}
PATCH /api/v1/demands/{id}  (body: { content: string })
```

#### UI Components
- **Header**: Case reference, debtor name, status badge
- **Content Panel**: Rich text or markdown editor with letter content
- **Sidebar**: Compliance panel, metadata, action buttons
- **Footer**: Save/Cancel buttons, last saved timestamp

#### Acceptance Criteria
- [ ] Content displays with proper formatting (paragraphs preserved)
- [ ] Compliance issues highlighted with specific guidance
- [ ] Save button disabled when no changes or content invalid
- [ ] Confirmation prompt when navigating away with unsaved changes

---

### 2.3 AI-Assisted Refinement

**User Story:** As a paralegal, I want to refine a letter using AI by providing natural language instructions so I can improve the letter without manual rewriting.

#### Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| DL-REF-01 | Provide text input for refinement instruction | Must |
| DL-REF-02 | Display common refinement suggestions as quick-select buttons | Must |
| DL-REF-03 | Show loading state during AI processing | Must |
| DL-REF-04 | Display refined content with diff highlighting | Must |
| DL-REF-05 | Show compliance comparison (before/after) | Must |
| DL-REF-06 | Allow accepting or rejecting refinement | Must |
| DL-REF-07 | Display instruction warnings from AI | Should |
| DL-REF-08 | Show token usage/cost indicator | Could |

#### API Integration
```
GET  /api/v1/demands/refinement-suggestions
POST /api/v1/demands/{id}/refine  (body: { instruction: string })
```

#### Refinement Workflow
1. User enters instruction or selects suggestion
2. System shows "Refining letter..." loading state
3. Response displays side-by-side or inline diff view
4. User reviews compliance impact
5. User accepts (saves new version) or cancels (discards)

#### UI Components
- **Instruction Input**: Text field with 1000 char limit, placeholder text
- **Suggestions Panel**: Grid of common refinement buttons
  - "Make tone more professional"
  - "Simplify language for readability"
  - "Emphasize dispute rights"
  - "Strengthen payment urgency"
- **Diff Viewer**: Split or unified diff with additions/deletions highlighted
- **Compliance Comparison**: Before/after compliance scores

#### Acceptance Criteria
- [ ] Instruction field validates min 1, max 1000 characters
- [ ] Loading spinner with "Refining..." text during API call
- [ ] Diff clearly shows green additions, red deletions
- [ ] Accept creates new version, Cancel returns to previous state
- [ ] Warnings display in yellow alert banner if present

---

### 2.4 Version History

**User Story:** As an attorney, I want to see all versions of a letter with the changes made so I can understand its evolution and restore previous versions if needed.

#### Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| DL-VER-01 | List all versions with version number and date | Must |
| DL-VER-02 | Show refinement instruction that created each version | Must |
| DL-VER-03 | Show creator email for each version | Should |
| DL-VER-04 | Enable viewing any historical version content | Must |
| DL-VER-05 | Enable comparing any two versions (diff view) | Should |
| DL-VER-06 | Undo to previous version | Must |
| DL-VER-07 | Redo to next version (if available) | Should |

#### API Integration
```
GET  /api/v1/demands/{id}/versions
GET  /api/v1/demands/{id}/diff?v1={version1}&v2={version2}
POST /api/v1/demands/{id}/undo
POST /api/v1/demands/{id}/redo
```

#### UI Components
- **Version Timeline**: Vertical list showing version progression
- **Version Card**: Version number, date, instruction, creator
- **Action Buttons**: View, Compare, Restore
- **Comparison Modal**: Side-by-side diff of selected versions

#### Acceptance Criteria
- [ ] Current version clearly indicated in list
- [ ] Undo disabled when at version 1
- [ ] Redo disabled when at latest version
- [ ] Restore prompts confirmation before overwriting current

---

### 2.5 Approval Workflow

**User Story:** As an attorney, I want to review and approve demand letters so they can be sent to debtors with proper authorization.

#### Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| DL-APR-01 | Submit letter for review (paralegal action) | Must |
| DL-APR-02 | Approve letter with optional signature (attorney action) | Must |
| DL-APR-03 | Reject letter with required reason (attorney action) | Must |
| DL-APR-04 | Display approval history timeline | Should |
| DL-APR-05 | Prepare approved letter for sending | Must |
| DL-APR-06 | Mark letter as sent | Must |
| DL-APR-07 | Generate PDF preview of letter | Should |
| DL-APR-08 | Digital signature capture for approval | Could |

#### API Integration
```
POST /api/v1/demands/{id}/submit-for-review
POST /api/v1/demands/{id}/approve  (body: { signature?: string })
POST /api/v1/demands/{id}/reject   (body: { reason: string })
POST /api/v1/demands/{id}/prepare-send
POST /api/v1/demands/{id}/send
GET  /api/v1/demands/{id}/approvals
GET  /api/v1/demands/{id}/preview  (returns PDF)
```

#### Workflow States
```
DRAFT → PENDING_REVIEW → APPROVED → READY_TO_SEND → SENT
                ↓
              DRAFT (on rejection)
```

#### UI Components
- **Status Banner**: Current workflow state with available actions
- **Action Buttons**: Contextual based on status and user role
  - DRAFT: "Submit for Review" (paralegal)
  - PENDING_REVIEW: "Approve" / "Reject" (attorney)
  - APPROVED: "Prepare to Send"
  - READY_TO_SEND: "Mark as Sent"
- **Rejection Modal**: Text area for required reason
- **Approval Modal**: Optional signature pad, confirmation
- **History Panel**: Timeline of all workflow actions

#### Acceptance Criteria
- [ ] Buttons visible only to users with appropriate permissions
- [ ] Submit disabled if compliance score below threshold
- [ ] Rejection requires minimum 10 character reason
- [ ] Approval records IP address and user agent
- [ ] PDF preview opens in new tab or modal

---

### 2.6 PDF Preview & Download

**User Story:** As a user, I want to preview the demand letter as a formatted PDF so I can see exactly what will be sent to the debtor.

#### Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| DL-PDF-01 | Generate PDF preview of current letter | Must |
| DL-PDF-02 | Include firm letterhead in PDF | Should |
| DL-PDF-03 | Include approval signature if approved | Should |
| DL-PDF-04 | Download PDF button | Must |
| DL-PDF-05 | Print directly from preview | Could |

#### API Integration
```
GET /api/v1/demands/{id}/preview  (Accept: application/pdf)
```

#### Acceptance Criteria
- [ ] PDF renders in modal or new tab
- [ ] Download uses filename format: `demand-letter-{id}.pdf`
- [ ] Letterhead includes organization name
- [ ] Approved letters show signature and approval date

---

## 3. Non-Functional Requirements

### 3.1 Performance
- Letter content should load within 2 seconds
- AI refinement should show loading state immediately, complete within 30 seconds
- Version history should lazy-load content on demand

### 3.2 Accessibility
- All interactive elements keyboard accessible
- ARIA labels on status badges and action buttons
- Color-blind friendly diff highlighting (use patterns in addition to color)

### 3.3 Responsive Design
- Full functionality on desktop (1024px+)
- Readable on tablet (768px+)
- View-only on mobile (< 768px)

### 3.4 Error Handling
- Display user-friendly error messages for API failures
- Retry option for transient failures (503 Service Unavailable)
- Preserve user input on error (don't clear forms)

---

## 4. Component Architecture

### 4.1 Proposed Component Structure
```
/app/cases/view/
├── CaseViewContent.tsx (existing - enhance)
├── components/
│   ├── DemandLetterList.tsx
│   ├── DemandLetterDetail.tsx
│   ├── DemandLetterEditor.tsx
│   ├── RefinementPanel.tsx
│   ├── VersionHistory.tsx
│   ├── ApprovalWorkflow.tsx
│   ├── CompliancePanel.tsx
│   ├── DiffViewer.tsx
│   └── PdfPreviewModal.tsx
```

### 4.2 Shared Components
```
/components/
├── StatusBadge.tsx (enhance existing)
├── LoadingSpinner.tsx (existing)
├── Modal.tsx (create)
├── DiffView.tsx (create)
└── SignaturePad.tsx (create - optional)
```

---

## 5. API Response Shapes

### 5.1 Demand Letter Detail
```typescript
interface DemandLetter {
  id: string;
  caseId: string;
  templateId?: string;
  content: string;
  status: 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'READY_TO_SEND' | 'SENT';
  currentVersion: number;
  complianceResult: {
    isCompliant: boolean;
    score: number;
    checks: ComplianceCheck[];
  };
  createdAt: string;
  updatedAt: string;
  case: {
    id: string;
    creditorName: string;
    debtorName: string;
    status: string;
  };
  template?: {
    id: string;
    name: string;
  };
}
```

### 5.2 Refinement Response
```typescript
interface RefinementResponse {
  id: string;
  content: string;
  version: number;
  previousVersion: number;
  refinementInstruction: string;
  complianceResult: ComplianceResult;
  diff: {
    additions: number;
    deletions: number;
    hunks: DiffHunk[];
  };
  warnings: string[];
}
```

### 5.3 Version History
```typescript
interface VersionHistory {
  currentVersion: number;
  versions: {
    id: string;
    version: number;
    refinementInstruction?: string;
    createdAt: string;
    creator: {
      id: string;
      email: string;
    };
  }[];
}
```

---

## 6. Implementation Priority

### Phase 1 - Core Editing (Sprint 1)
1. DL-LIST-01 through DL-LIST-04
2. DL-EDIT-01 through DL-EDIT-06
3. DL-PDF-01, DL-PDF-04

### Phase 2 - AI Refinement (Sprint 2)
1. DL-REF-01 through DL-REF-06
2. DL-VER-01 through DL-VER-04
3. DL-VER-06

### Phase 3 - Approval Workflow (Sprint 3)
1. DL-APR-01 through DL-APR-06
2. DL-APR-07

### Phase 4 - Polish (Sprint 4)
1. Remaining "Should" and "Could" requirements
2. Accessibility improvements
3. Performance optimization

---

## 7. Open Questions

1. **Signature Implementation**: Should we implement a canvas-based signature pad or accept typed signatures?
2. **Real-time Collaboration**: Should multiple users be able to edit simultaneously (future consideration)?
3. **Notifications**: Should attorneys receive notifications when letters are submitted for review?
4. **Template Selection**: Should users be able to change templates after initial generation?

---

## 8. Appendix

### A. Existing Backend Endpoints Summary

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | /api/v1/demands | List letters |
| POST | /api/v1/demands/generate | Generate new letter |
| GET | /api/v1/demands/:id | Get letter detail |
| PATCH | /api/v1/demands/:id | Update letter |
| DELETE | /api/v1/demands/:id | Delete draft letter |
| POST | /api/v1/demands/:id/refine | AI refinement |
| POST | /api/v1/demands/:id/undo | Undo to previous version |
| POST | /api/v1/demands/:id/redo | Redo to next version |
| GET | /api/v1/demands/:id/diff | Compare versions |
| GET | /api/v1/demands/:id/versions | List versions |
| GET | /api/v1/demands/:id/preview | PDF preview |
| POST | /api/v1/demands/:id/submit-for-review | Submit for review |
| POST | /api/v1/demands/:id/approve | Approve letter |
| POST | /api/v1/demands/:id/reject | Reject letter |
| POST | /api/v1/demands/:id/prepare-send | Prepare for sending |
| POST | /api/v1/demands/:id/send | Mark as sent |
| GET | /api/v1/demands/:id/approvals | Get approval history |
| GET | /api/v1/demands/refinement-suggestions | Get refinement suggestions |

### B. Status Color Reference
```typescript
const STATUS_COLORS = {
  DRAFT: 'bg-gray-100 text-gray-800',
  PENDING_REVIEW: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  READY_TO_SEND: 'bg-blue-100 text-blue-800',
  SENT: 'bg-purple-100 text-purple-800',
  REJECTED: 'bg-red-100 text-red-800',
};
```
