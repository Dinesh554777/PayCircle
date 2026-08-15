export default function PageHeader({ title, subtitle, actions, className = "" }) {
  return (
    <div className={`page-head ${className}`}>
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
