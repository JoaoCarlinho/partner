# Law Firm Reference Guide

**Complete documentation for attorneys, paralegals, and firm administrators**

---

## Table of Contents

1. [Overview](#overview)
2. [Demand Letter List](#demand-letter-list)
3. [Letter Detail & Editing](#letter-detail--editing)
4. [AI-Assisted Refinement](#ai-assisted-refinement)
5. [Version History](#version-history)
6. [Approval Workflow](#approval-workflow)
7. [PDF Preview & Download](#pdf-preview--download)
8. [Payment Plan Management](#payment-plan-management)
9. [Messaging & Communication](#messaging--communication)
10. [Compliance & Audit](#compliance--audit)
11. [Troubleshooting](#troubleshooting)

---

## Overview

The Partner platform enables law firms to create, refine, and send FDCPA-compliant demand letters while managing debtor communications and payment negotiations.

### User Roles

| Role | Capabilities |
|------|--------------|
| **Paralegal** | Create, edit, refine letters; submit for review; record payments |
| **Attorney** | All paralegal capabilities + approve/reject, sign, send letters |
| **Firm Admin** | All capabilities + firm settings and user management |

### Workflow Summary

```
Draft → Pending Review → Approved → Ready to Send → Sent
              ↓
           Draft (if rejected)
```

---

## Demand Letter List

### Accessing Letters

Navigate to any case and select the **Demand Letters** tab to see all letters associated with that case.

### List Columns

| Column | Description |
|--------|-------------|
| **Status** | Current workflow state |
| **Created** | Date letter was created |
| **Modified** | Last update timestamp |
| **Version** | Current version number |
| **Template** | Template used (if any) |

### Status Badges

| Status | Color | Description |
|--------|-------|-------------|
| DRAFT | Gray | Work in progress, editable |
| PENDING_REVIEW | Yellow | Awaiting attorney approval |
| APPROVED | Green | Approved, ready for sending |
| READY_TO_SEND | Blue | Prepared for delivery |
| SENT | Purple | Delivered to debtor |
| REJECTED | Red | Returned for revision |

### Sorting and Filtering

- **Sort by**: Date (default), Status, Version
- **Filter by**: Status dropdown

### Empty State

If no letters exist for a case:
> "No demand letters yet"
>
> [Generate Letter] button

---

## Letter Detail & Editing

### Accessing Letter Detail

Click any letter in the list to open the detail view.

### Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│ Header: Case Reference | Debtor Name | Status Badge         │
├─────────────────────────────────┬───────────────────────────┤
│                                 │                           │
│    Content Panel                │    Sidebar                │
│    (Letter text)                │    - Compliance Panel     │
│                                 │    - Metadata             │
│                                 │    - Actions              │
│                                 │                           │
├─────────────────────────────────┴───────────────────────────┤
│ Footer: Save/Cancel | Last Saved Timestamp                  │
└─────────────────────────────────────────────────────────────┘
```

### Editing Content

**Requirements**: Letter must be in DRAFT status

1. Click in the content area
2. Make your changes
3. Changes are tracked automatically
4. Click **Save** or wait for auto-save (30 seconds)

### Unsaved Changes Indicator

A dot appears next to "Save" when you have unsaved changes.

### Navigation Guards

If you try to leave with unsaved changes:
> "You have unsaved changes. Are you sure you want to leave?"

### Read-Only Mode

Letters in SENT status are read-only. Edit controls are hidden and content is not editable.

### Metadata Display

The sidebar shows:
- **Case**: Reference number and debtor name
- **Template**: Name of template used
- **Created**: Creation date
- **Modified**: Last update
- **Version**: Current version number

---

## AI-Assisted Refinement

### Overview

AI refinement allows you to improve letters using natural language instructions. The AI modifies content while maintaining FDCPA compliance.

### Accessing Refinement

1. Open a DRAFT letter
2. Locate the **Refinement Panel** (usually below content or in sidebar)

### Refinement Methods

#### Custom Instruction

1. Type your instruction in the text field
2. Examples:
   - "Make the tone more professional"
   - "Simplify the language for an 8th grade reading level"
   - "Add emphasis on the debtor's right to dispute"
3. Press Enter or click **Refine**

**Constraints**:
- Minimum: 1 character
- Maximum: 1,000 characters

#### Quick Suggestions

Pre-built refinement options:

| Button | Effect |
|--------|--------|
| "Make tone more professional" | Formal business language |
| "Simplify language for readability" | Lower reading level |
| "Emphasize dispute rights" | Highlights debtor rights |
| "Strengthen payment urgency" | Clearer calls to action |

### Processing

1. Click a suggestion or submit custom instruction
2. Loading state: "Refining letter..." (typically 5-15 seconds)
3. Results appear in diff view

### Reviewing Changes

The diff viewer shows:
- **Green highlighting**: Added text
- **Red highlighting**: Removed text
- **Side-by-side** or **unified** view options

### Compliance Comparison

Before accepting, review:
- **Before score**: Original compliance rating
- **After score**: New compliance rating
- Any new warnings or issues

### Accept or Reject

| Action | Result |
|--------|--------|
| **Accept** | Creates new version with changes |
| **Reject** | Discards changes, returns to previous |

### Warnings

If the AI identifies potential issues:
- Yellow warning banner appears
- Review warnings before accepting
- Common warnings: tone concerns, potential compliance issues

---

## Version History

### Accessing History

Click **Version History** in the letter detail view (usually a tab or sidebar section).

### Version Timeline

Displays chronologically:
- Version number
- Creation date/time
- Creator email
- Refinement instruction (if AI-generated)

### Current Version

Clearly marked with "Current" badge.

### Viewing Historical Versions

1. Click any version in the list
2. Content displays in read-only mode
3. Clear indicator shows which version you're viewing

### Comparing Versions

1. Select first version
2. Click **Compare**
3. Select second version
4. Side-by-side diff appears

### Undo/Redo

| Action | Button State | Result |
|--------|--------------|--------|
| **Undo** | Disabled at v1 | Reverts to previous version |
| **Redo** | Disabled at latest | Advances to next version |

---

## Approval Workflow

### Workflow States

```
DRAFT
  ↓ [Submit for Review]
PENDING_REVIEW
  ↓ [Approve]          ↓ [Reject]
APPROVED              DRAFT (with feedback)
  ↓ [Prepare to Send]
READY_TO_SEND
  ↓ [Mark as Sent]
SENT
```

### Submit for Review (Paralegal)

**Requirements**:
- Letter in DRAFT status
- Compliance score meets threshold

**Process**:
1. Click **"Submit for Review"**
2. Confirm submission
3. Status changes to PENDING_REVIEW
4. Attorney is notified

### Approve Letter (Attorney)

**Requirements**:
- Letter in PENDING_REVIEW status
- Attorney role

**Process**:
1. Review letter content
2. Click **"Approve"**
3. Optional: Add digital signature
4. Confirm approval
5. Status changes to APPROVED

### Digital Signature

When approving:
1. Signature pad modal appears
2. Draw your signature with mouse/touch
3. Click **Save Signature**
4. Signature stored and appears on final PDF

**Signature data includes**:
- Visual signature image
- Timestamp
- IP address
- User agent (for audit)

### Reject Letter (Attorney)

**Requirements**:
- Letter in PENDING_REVIEW status
- Attorney role

**Process**:
1. Click **"Reject"**
2. Enter reason (minimum 10 characters)
3. Be specific about needed changes
4. Click **Confirm Rejection**
5. Status returns to DRAFT
6. Paralegal notified with feedback

### Prepare to Send

After approval:
1. Click **"Prepare to Send"**
2. System generates final PDF
3. Status changes to READY_TO_SEND

### Mark as Sent

After delivering the letter externally:
1. Click **"Mark as Sent"**
2. Confirm action
3. Status changes to SENT
4. Letter becomes read-only

### Approval History

The **Approval History** panel shows:
- All workflow transitions
- Who performed each action
- Timestamps
- Rejection reasons (if applicable)
- Signature records

---

## PDF Preview & Download

### Generating Preview

1. Click **"Preview PDF"** on any letter
2. PDF renders in modal or new tab

### PDF Contents

- Firm letterhead
- Full letter content
- Compliance disclosures
- Approval signature (if approved)
- Approval date (if approved)

### Downloading

1. Click **"Download"** button
2. File saves as: `demand-letter-{id}.pdf`

### Printing

1. Open PDF preview
2. Use browser print function or preview controls
3. Optimized for standard letter size

---

## Payment Plan Management

### Viewing Plans

Navigate to case **Payment Plans** section to see:
- All payment plans for the case
- Plan status and terms
- Payment schedule

### Plan States

| Status | Description |
|--------|-------------|
| Proposed | Debtor submitted, awaiting review |
| Under Review | You're reviewing the proposal |
| Countered | You've proposed different terms |
| Accepted | Agreement reached |
| Rejected | No agreement (terminal) |
| Active | Payments in progress |
| Completed | All payments made |
| Defaulted | Payments stopped |

### Reviewing Proposals

For each proposal, you see:
- Total amount
- Down payment
- Payment amount and frequency
- Start/end dates
- Debtor's financial assessment summary

### Responding to Proposals

| Action | When to Use |
|--------|-------------|
| **Accept** | Terms are acceptable |
| **Reject** | Terms unacceptable, provide reason |
| **Counter** | Propose alternative terms |

### Counter-Proposals

1. Click **"Counter"**
2. Modify terms:
   - Payment amount
   - Frequency
   - Duration
   - Down payment
3. Add message explaining changes
4. Submit for debtor review

### Recording Payments

When payments are made externally:
1. Find the scheduled payment
2. Click **"Record Payment"**
3. Enter:
   - Payment date
   - Amount received
   - Payment method (check, transfer, etc.)
   - Notes (optional)
4. Save

### Payment Dashboard

Overview shows:
- Active plans count
- On-track vs. at-risk vs. defaulted
- Expected vs. received amounts
- Upcoming payment dates

---

## Messaging & Communication

### AI Tone Analysis

All messages are analyzed before delivery:

| Score Range | Category | Action |
|-------------|----------|--------|
| 80-100 | Warm/Supportive | Passes through |
| 50-79 | Neutral | Passes through |
| 30-49 | Cool/Distant | Suggest rewording |
| 10-29 | Aggressive | Blocked, rewrite required |
| 0-9 | Abusive | Blocked, alert |

### Message Rewriting

If your message is flagged:
1. System shows warning with concerns
2. AI suggests alternative phrasings
3. Choose a suggestion or write your own
4. Resubmit for analysis

### Compliance Features

- FDCPA violation detection
- Frequency limit enforcement
- Time restriction compliance (8am-9pm local)
- Full audit trail

---

## Compliance & Audit

### Compliance Panel

Real-time compliance checking shows:
- Overall compliance score
- Individual check results
- Specific guidance for issues

### Required Elements

Letters are checked for:
- Validation notice
- Dispute rights disclosure
- Creditor identification
- Amount verification
- Required disclosures

### Audit Trail

All actions are logged:
- Who performed the action
- When (timestamp with timezone)
- What changed
- Original and modified content (for edits)

### Export

For audits, export:
- Communication history
- Approval records
- Version history
- Compliance check results

---

## Troubleshooting

### Common Issues

#### "Cannot edit letter"
- Check letter status (must be DRAFT)
- SENT letters are read-only

#### "Submit for Review disabled"
- Compliance score may be below threshold
- Check compliance panel for issues

#### "Refinement taking too long"
- AI processing typically takes 5-15 seconds
- If over 30 seconds, refresh and retry

#### "PDF preview not loading"
- Check browser popup blocker
- Try opening in new tab

#### "Cannot approve letter"
- Verify you have Attorney role
- Letter must be in PENDING_REVIEW status

#### "Payment not recording"
- Ensure all required fields are filled
- Check for validation errors

### Getting Help

For issues not covered here:
- Email: support@partner.com
- Include: Case ID, letter ID, screenshots, and description

---

## API Reference (For Developers)

### Demand Letter Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/v1/demands?caseId={id}` | List letters for case |
| GET | `/api/v1/demands/{id}` | Get letter detail |
| PATCH | `/api/v1/demands/{id}` | Update letter content |
| POST | `/api/v1/demands/{id}/refine` | AI refinement |
| POST | `/api/v1/demands/{id}/undo` | Undo to previous |
| POST | `/api/v1/demands/{id}/redo` | Redo to next |
| GET | `/api/v1/demands/{id}/versions` | Version history |
| GET | `/api/v1/demands/{id}/diff` | Compare versions |
| POST | `/api/v1/demands/{id}/submit-for-review` | Submit for review |
| POST | `/api/v1/demands/{id}/approve` | Approve letter |
| POST | `/api/v1/demands/{id}/reject` | Reject letter |
| POST | `/api/v1/demands/{id}/prepare-send` | Prepare to send |
| POST | `/api/v1/demands/{id}/send` | Mark as sent |
| GET | `/api/v1/demands/{id}/preview` | PDF preview |
| GET | `/api/v1/demands/{id}/approvals` | Approval history |

---

*Last updated: November 2025*
