import CaseViewClient from './CaseViewClient';

// Required for static export - generate a fallback page
export const dynamicParams = true;

export function generateStaticParams() {
  // Return a placeholder that will be used for the static shell
  return [{ caseId: '_' }];
}

export default function DefenderCaseViewRoute() {
  return <CaseViewClient />;
}
