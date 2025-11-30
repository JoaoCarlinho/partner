# Admin Reference Guide

**Complete documentation for platform administrators**

---

## Table of Contents

1. [Overview](#overview)
2. [Defender Invitation Management](#defender-invitation-management)
3. [Invitation List View](#invitation-list-view)
4. [Sending Invitations](#sending-invitations)
5. [Managing Invitations](#managing-invitations)
6. [Troubleshooting](#troubleshooting)

---

## Overview

As a platform administrator, you are responsible for managing the public defender network. Your primary function is to invite qualified public defenders to the platform so they can assist debtors with their cases.

### Your Responsibilities

- Invite new public defenders via email
- Monitor invitation acceptance rates
- Manage pending invitations (resend/revoke)
- Maintain the defender pipeline

### Access Requirements

- Admin role assigned to your account
- Access to the Admin Portal section

---

## Defender Invitation Management

### Navigation

Access defender invitations at: **Admin > Defenders > Invitations**

Or directly via URL: `/admin/defenders/invitations`

### Invitation Lifecycle

```
Created → Pending → Redeemed
                 ↘ Expired (can resend)
                 ↘ Revoked (terminal)
```

### Invitation Expiration

- Default expiration: **7 days** from creation
- Resending extends expiration by an additional **7 days**
- Expired invitations remain in the system for tracking

---

## Invitation List View

### Table Columns

| Column | Description |
|--------|-------------|
| **Email** | Defender's email address |
| **Organization** | Associated organization (if provided) |
| **Status** | Current invitation state |
| **Invited Date** | When invitation was created |
| **Expires Date** | When invitation link expires |
| **Actions** | Available actions for this invitation |

### Status Badges

| Status | Color | Description |
|--------|-------|-------------|
| Pending | Yellow | Awaiting defender response |
| Redeemed | Green | Defender has registered successfully |
| Expired | Gray | Link no longer valid |
| Revoked | Red | Invitation cancelled by admin |

### Sorting Options

- **Date** (default): Newest first
- **Status**: Group by invitation state
- **Email**: Alphabetical

### Filtering

Filter invitations by status:
- All
- Pending only
- Redeemed only
- Expired only

### Summary Statistics

The dashboard header displays:
- **Total**: All invitations ever sent
- **Pending**: Currently awaiting response
- **Redeemed**: Successfully converted
- **Expired**: Links that have timed out

### Pagination

Lists exceeding 20 items are paginated. Use navigation controls at the bottom of the table.

### Empty State

If no invitations exist, you'll see:
> "No invitations yet. Invite your first public defender to get started."

With a prominent **"Invite Defender"** button.

---

## Sending Invitations

### Opening the Invitation Form

1. Click **"Invite Defender"** button (top right of list)
2. A modal form appears

### Form Fields

| Field | Required | Validation |
|-------|----------|------------|
| **Email** | Yes | Valid email format |
| **Organization** | No | Free text, max 255 characters |

### Duplicate Detection

If an email has an existing **pending** invitation:
- Warning displayed: "An active invitation already exists for this email"
- You can choose to resend the existing invitation instead

### Submission Process

1. Fill in required fields
2. Click **"Send Invitation"**
3. System validates input
4. Email is sent to the defender
5. Success message: "Invitation sent to [email]"
6. List refreshes automatically

### What the Defender Receives

The invitation email contains:
- Welcome message explaining the platform
- Secure registration link (unique token)
- Expiration notice (7 days)
- Contact information for questions

---

## Managing Invitations

### Resending an Invitation

**When to use**: Invitation expired, or defender didn't receive/lost the email.

**Steps**:
1. Locate the invitation (must be Pending or Expired status)
2. Click **"Resend"** in the Actions column
3. Confirm the action in the dialog
4. New email sent with fresh 7-day expiration

**Notes**:
- Previous link becomes invalid
- New token generated for security
- Expiration date updated in the list

### Revoking an Invitation

**When to use**: Invitation sent in error, wrong email, or defender no longer eligible.

**Steps**:
1. Locate the invitation (must be Pending status)
2. Click **"Revoke"** in the Actions column
3. Confirm: "Are you sure? The defender will no longer be able to register."
4. Status changes to Revoked

**Important**:
- Revoked invitations cannot be undone
- To re-invite, send a new invitation
- Revoked status is permanent for audit trail
- Cannot revoke already-redeemed invitations

### Viewing Invitation Details

Click on any invitation row to see:
- Full invitation history
- Email delivery status (if available)
- Registration details (if redeemed)

---

## Troubleshooting

### Common Issues

#### "Defender says they didn't receive the email"

1. Verify the email address is correct
2. Ask them to check spam/junk folders
3. Resend the invitation
4. If persistent, verify email domain isn't blocked

#### "Invitation shows as expired"

1. Click **"Resend"** to generate a new link
2. Advise defender to complete registration within 7 days

#### "Can't revoke an invitation"

Only **Pending** invitations can be revoked. If status is:
- **Redeemed**: Defender already registered (contact support to manage user)
- **Expired**: No need to revoke; link is already invalid
- **Revoked**: Already cancelled

#### "Duplicate email error"

An active invitation exists for this email. Options:
1. Resend the existing invitation
2. Revoke the existing invitation, then send a new one
3. If defender already registered, they should log in instead

### Getting Help

For issues not covered here:
- Email: support@partner.com
- Include: Your admin email, the invitation email in question, and a description of the issue

---

## API Reference (For Developers)

### Endpoints Used

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/v1/defenders/invitations` | List all invitations |
| POST | `/api/v1/defenders/invitations` | Create invitation |
| POST | `/api/v1/defenders/invitations/:id/resend` | Resend invitation |
| DELETE | `/api/v1/defenders/invitations/:id` | Revoke invitation |

### Request/Response Examples

**Create Invitation**
```json
POST /api/v1/defenders/invitations
{
  "email": "defender@example.com",
  "organizationName": "Public Defender Office"
}

Response:
{
  "data": {
    "id": "uuid",
    "email": "defender@example.com",
    "status": "PENDING",
    "expiresAt": "2025-12-04T00:00:00Z"
  }
}
```

---

*Last updated: November 2025*
