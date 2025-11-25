/**
 * Debtor Feature Module
 * Exports all debtor-related components, hooks, and pages
 */

// Pages
export { DebtorDashboard } from './pages/DebtorDashboard';

// Components
export { AmountOwedCard } from './components/AmountOwedCard';
export { CreditorInfoCard } from './components/CreditorInfoCard';
export { TimelineCard } from './components/TimelineCard';
export { OptionsPanel } from './components/OptionsPanel';

// Hooks
export { useCountdown, getUrgencyColor, getUrgencyColorClass } from './hooks/useCountdown';
export type { CountdownResult } from './hooks/useCountdown';

// Styles
import './styles/dashboard.css';
