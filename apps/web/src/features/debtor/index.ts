/**
 * Debtor Feature Module
 * Exports all debtor-related components, hooks, and pages
 */

// Pages
export { AssessmentPage } from './pages/AssessmentPage';

// Components
export { AmountOwedCard } from './components/AmountOwedCard';
export { AssessmentChat } from './components/AssessmentChat';
export { AssessmentForm } from './components/AssessmentForm';
export { CreditorInfoCard } from './components/CreditorInfoCard';
export { DebtorDashboard } from './pages/DebtorDashboard';
export { TimelineCard } from './components/TimelineCard';
export { OptionsPanel } from './components/OptionsPanel';

// Hooks
export { useCountdown, getUrgencyColor, getUrgencyColorClass } from './hooks/useCountdown';
export type { CountdownResult } from './hooks/useCountdown';

// Styles
import './styles/dashboard.css';
