# Public Defender Reference Guide

**Complete documentation for public defenders**

---

## Table of Contents

1. [Overview](#overview)
2. [Invitation & Registration](#invitation--registration)
3. [Onboarding Process](#onboarding-process)
4. [Dashboard](#dashboard)
5. [Assignment Management](#assignment-management)
6. [Case View](#case-view)
7. [Communication](#communication)
8. [Navigation & Settings](#navigation--settings)
9. [Troubleshooting](#troubleshooting)

---

## Overview

The Partner platform connects public defenders with debtors who need assistance understanding and navigating the debt collection process. Your role is to provide guidance and support to assigned debtors.

### Your Responsibilities

- Review assigned debtor cases
- Understand debtor financial situations
- Provide guidance on options (pay, dispute, negotiate)
- Communicate with debtors through the platform
- Document case notes and observations

### Platform Access

- Requires invitation from platform administrator
- Must complete onboarding (credentials, training, terms)
- Status must be ACTIVE to access dashboard

---

## Invitation & Registration

### Receiving an Invitation

Invitations are sent by platform administrators. The email contains:
- Welcome message
- Secure registration link
- Expiration notice (7 days)

### Invitation States

| State | Meaning |
|-------|---------|
| Valid | Link active, registration available |
| Expired | Link timed out, contact admin for new invite |
| Redeemed | Already registered, use login instead |
| Revoked | Invitation cancelled, contact admin |

### Landing Page

When you click the link:
- System validates your token
- Shows welcome message with organization (if provided)
- "Get Started" button leads to registration

### Error States

| Error | Message | Action |
|-------|---------|--------|
| Not Found | "This invitation link is not valid" | Contact administrator |
| Expired | "This invitation has expired" | Request new invitation |
| Redeemed | "This invitation has already been used" | Log in instead |

### Registration Form

**Required Fields:**

| Field | Validation |
|-------|------------|
| Email | Pre-filled, read-only |
| First Name | Required |
| Last Name | Required |
| Bar Number | Required |
| Bar State | Required (US state dropdown) |
| Password | Min 8 chars, 1 uppercase, 1 number |
| Confirm Password | Must match password |

**Optional Fields:**

| Field | Notes |
|-------|-------|
| Phone Number | For contact purposes |
| Organization | May be pre-filled from invitation |

### Password Requirements

- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 number
- Strength indicator shows password quality

### Registration Errors

| Error | Cause | Solution |
|-------|-------|----------|
| EMAIL_EXISTS | Account already exists | Log in instead |
| INVALID_BAR_NUMBER | Bar number format issue | Verify and re-enter |
| INVITATION_EXPIRED | Token timed out | Request new invitation |

---

## Onboarding Process

After registration, you must complete onboarding before accessing the main platform.

### Onboarding Route

URL: `/defender/onboarding`

If you try to access the dashboard before completing onboarding, you'll be redirected here.

### Step 1: Credential Upload

Upload required credentials for verification:

| Document | Required | Formats | Max Size |
|----------|----------|---------|----------|
| BAR Card | Yes | PDF, JPEG, PNG, WebP | 10 MB |
| Photo ID | Yes | PDF, JPEG, PNG, WebP | 10 MB |
| Organization Letter | No | PDF, JPEG, PNG, WebP | 10 MB |

**Upload Process:**
1. Click upload area or drag file
2. Progress indicator shows upload status
3. File name and timestamp displayed on success
4. Can replace files before submission

**After Upload:**
1. Click "Submit for Verification"
2. Status changes to CREDENTIALS_SUBMITTED
3. Wait for administrator verification
4. You'll be notified when verified

### Step 2: Training Modules

Complete required training before proceeding:

1. View module list with status indicators
2. Click "Start" to begin a module
3. Review the training content
4. Click "Complete" when finished
5. Progress bar shows completion

**Module Statuses:**
- Not Started
- In Progress
- Completed (with timestamp)

### Step 3: Terms Acceptance

Final step before activation:

1. Read the Terms of Service (scrollable)
2. Check the acceptance box
3. Click "Accept & Complete Onboarding"
4. Celebration screen appears
5. Click "Go to Dashboard"

**What's Recorded:**
- Terms version accepted
- Timestamp of acceptance
- Your user ID

### Onboarding Status Flow

```
PENDING → CREDENTIALS_SUBMITTED → CREDENTIALS_VERIFIED → TRAINING_COMPLETE → ACTIVE
```

---

## Dashboard

### Access

URL: `/defender/dashboard`

**Requirements:**
- Authenticated
- Defender role
- ACTIVE status (redirects to onboarding if not)

### Dashboard Layout

```
┌────────────────────────────────────────────────────────────┐
│ Welcome, [First Name]                    [Current Date]   │
├────────────────────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│ │ Active   │ │ Needs    │ │Completed │ │ Pending  │       │
│ │ Cases    │ │ Attention│ │ Cases    │ │ Consent  │       │
│ │   12     │ │    3     │ │   45     │ │    2     │       │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
├────────────────────────────────────────────────────────────┤
│ Recent Activity                                            │
│ • Case assigned: John Doe                    2 hours ago  │
│ • Message received: Jane Smith               1 day ago    │
├────────────────────────────────────────────────────────────┤
│ Quick Links                                                │
│ [View All Assignments] [My Profile] [Messages - Soon]     │
├────────────────────────────────────────────────────────────┤
│ Upcoming Deadlines                                         │
│ • Response due: Case #1234                   Dec 15       │
└────────────────────────────────────────────────────────────┘
```

### Summary Cards

| Card | Description | Click Action |
|------|-------------|--------------|
| Active Cases | Currently assigned cases | Filter to active |
| Needs Attention | Cases requiring action | Filter to attention |
| Completed | Resolved cases | Filter to completed |
| Pending Consent | Awaiting debtor consent | Filter to pending |

### Recent Activity

Shows latest events:
- New case assignments
- Messages received
- Status changes

Each entry includes:
- Activity type icon
- Description
- Timestamp

### Quick Links

- **View All Assignments** → `/defender/assignments`
- **My Profile** → `/defender/settings`
- **Messages** → Coming soon (disabled)

### Upcoming Deadlines

Lists time-sensitive items:
- Response deadlines
- Review dates
- Click to navigate to case

---

## Assignment Management

### Assignments Page

URL: `/defender/assignments`

Lists all your assigned cases with:
- Debtor name
- Case status
- Assignment date
- Key deadlines

### Assignment Statuses

| Status | Meaning |
|--------|---------|
| Assigned | Newly assigned to you |
| Active | You're actively working |
| Pending Consent | Awaiting debtor agreement |
| Resolved | Case completed |

### Filtering & Sorting

- Filter by status
- Sort by date, name, or urgency
- Search by debtor name

---

## Case View

### Accessing a Case

URL: `/defender/cases/[caseId]`

Navigate via:
- Click case in assignment list
- Click case in dashboard
- Direct URL

### Breadcrumb Navigation

`Dashboard > Assignments > Case: [Debtor Name]`

- Dashboard and Assignments are clickable
- Current page is not clickable

### Back Navigation

Click **Back** button to return to assignments (uses browser history).

### Case Information

**Debtor Details:**
- Name and contact information
- Financial assessment summary
- Current situation

**Debt Information:**
- Amount owed (breakdown)
- Original creditor
- Timeline and deadlines
- Available options

**Communication History:**
- Messages between parties
- Tone analysis indicators
- Timestamps

**Notes Section:**
- Your private case notes
- Observations and recommendations

### Error States

| Code | Message | Action |
|------|---------|--------|
| 404 | "This case does not exist or has been removed" | Return to assignments |
| 403 | "You don't have access to this case" | Verify assignment |

---

## Communication

### Messaging Debtors

Communicate with assigned debtors through the platform:
1. Open the case
2. Navigate to communication section
3. Type your message
4. Send

### AI Tone Assistance

Messages are analyzed for tone:
- Warm, supportive messages pass through
- Suggestions provided if tone needs adjustment
- Ensures professional, helpful communication

### Communication Guidelines

- Be supportive and non-judgmental
- Explain options clearly
- Use plain language
- Respond promptly to questions

---

## Navigation & Settings

### Sidebar Navigation

| Item | Route | Description |
|------|-------|-------------|
| Dashboard | `/defender/dashboard` | Home |
| My Assignments | `/defender/assignments` | All cases |
| Messages | Coming soon | Platform messaging |
| Settings | `/defender/settings` | Profile & preferences |

### Active State

Current page highlighted with:
- Blue background
- Indicator dot

### User Profile Section

Sidebar header shows:
- Your name
- Email
- Initials avatar

### Logout

1. Click **"Log out"** at bottom of sidebar
2. Confirm when prompted
3. Redirected to login page

### Mobile Navigation

On smaller screens:
- Hamburger menu appears
- Tap to reveal sidebar
- Overlay covers main content
- Tap outside to close

### Settings Page

Configure your profile:
- Update contact information
- Notification preferences
- Security settings

---

## Troubleshooting

### Common Issues

#### "Redirected to onboarding"
- Your status is not ACTIVE
- Complete all onboarding steps
- Contact admin if stuck at verification

#### "Cannot access case"
- Verify you're assigned to this case
- Check assignment list
- 403 error means unauthorized

#### "Case not found"
- Case may have been removed
- Check case ID
- Return to assignments

#### "Invitation link not working"
- Link may be expired (check date)
- May be already used
- Contact admin for new invitation

#### "Cannot upload credentials"
- Check file format (PDF, JPEG, PNG, WebP)
- Check file size (max 10 MB)
- Try different browser

### Getting Help

For issues not covered here:
- Email: support@partner.com
- Include: Your email, case ID (if applicable), description

---

## API Reference (For Developers)

### Defender Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/v1/defenders/invitations/:token/validate` | Validate invitation |
| POST | `/api/v1/defenders/register` | Register account |
| GET | `/api/v1/defenders/onboarding` | Get onboarding status |
| POST | `/api/v1/defenders/credentials` | Upload credentials |
| POST | `/api/v1/defenders/training/:moduleId/complete` | Complete training |
| POST | `/api/v1/defenders/terms/accept` | Accept terms |
| GET | `/api/v1/defender/dashboard` | Dashboard data |
| GET | `/api/v1/defender/assignments` | Assignment list |
| GET | `/api/v1/defender/assignments/:id` | Assignment detail |

---

*Last updated: November 2025*
