interface SummaryCardProps {
  label: string;
  value: number | null;
  description: string;
  variant?: 'primary' | 'agency' | 'joint';
}

export function SummaryCard({ label, value, description, variant = 'primary' }: SummaryCardProps) {
  return (
    <div className={`summary-card summary-card--${variant}`}>
      <dt className="summary-label">{label}<span className="summary-marker" aria-hidden="true" /></dt>
      <dd>{value === null ? '—' : value.toLocaleString('es-EC')}</dd>
      <dd className="summary-description">{description}</dd>
    </div>
  );
}

