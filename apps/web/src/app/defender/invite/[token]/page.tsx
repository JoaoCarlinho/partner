import InvitationLandingClient from './InvitationLandingClient';

// Required for static export - generate a fallback page
export const dynamicParams = true;

export function generateStaticParams() {
  // Return a placeholder that will be used for the static shell
  return [{ token: '_' }];
}

export default function InvitationLandingPage() {
  return <InvitationLandingClient />;
}
