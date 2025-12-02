Case Creation and Paralegal/Defender Access
Creating a New Case
Endpoint: POST /api/v1/demands/cases Who can create: ATTORNEY or FIRM_ADMIN only (not paralegals)
// Request body
{
  creditorName: string;      // Required
  debtAmount: number;        // Required
  debtorName?: string;
  debtorEmail?: string;
  metadata?: object;
}
User Roles & Permissions
Role	Case Access
FIRM_ADMIN	Full access to all cases
ATTORNEY	Full access to all organization cases
PARALEGAL	Can view all org cases, create demand letters
DEBTOR	Can only view their own case
PUBLIC_DEFENDER	Can only view cases with ACTIVE assignment
How Paralegal Gets Access
Paralegals get access automatically to all cases in their organization:
Paralegal is invited to the organization
Once registered, they have cases:view permission
They can access any case via GET /api/v1/demands/cases or GET /api/v1/demands/cases/{id}
No assignment needed - it's organization-scoped.
How Public Defender Gets Access
Defenders require an explicit assignment with debtor consent:
1. ADMIN invites defender
   POST /api/v1/defenders/invitations
   ↓
2. Defender registers & completes onboarding
   ↓
3. Assignment created (status: PENDING_CONSENT)
   createAssignment(defenderId, debtorId, caseId)
   ↓
4. Debtor consents (7-day token expiration)
   processConsent(assignmentId, consent=true)
   ↓
5. Assignment status → ACTIVE
   ↓
6. Defender can now view the case
Note: The assignment service is currently in-memory (assignmentService.ts). The access check:
// Defender can only view if they have an ACTIVE assignment
hasDefenderAccess(defenderId, debtorId) → boolean
Quick Reference - Creating Case + Assigning
# 1. Create case (as Attorney/Admin)
curl -X POST /api/v1/demands/cases \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "creditorName": "ABC Collections",
    "debtAmount": 5000,
    "debtorName": "John Doe",
    "debtorEmail": "john@example.com"
  }'

# 2. Invite defender (as Admin)
curl -X POST /api/v1/defenders/invitations \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"email": "defender@example.com"}'

# 3. After defender registers, create assignment
# (This is handled via the assignment service)
Would you like me to show you the specific API handlers or database schema for any of these flows?