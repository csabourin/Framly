export default function PropertyLabel({ label, term }: { label: string; term?: string }) {
  return <span className="property-label">
    <span>{label}</span>
    {term && <code className="property-term">{term}</code>}
  </span>;
}
