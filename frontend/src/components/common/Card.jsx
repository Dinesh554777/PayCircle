export default function Card({
  title,
  icon: Icon,
  actions,
  footer,
  children,
  hover = false,
  padded = true,
  className = "",
  ...props
}) {
  return (
    <section
      className={`card${hover ? " card-hover" : ""}${!padded ? " card-pad-0" : ""} ${className}`}
      {...props}
    >
      {(title || actions) && (
        <div className="card-head">
          <h3 className="card-title">
            {Icon && (
              <span className="card-icon">
                <Icon aria-hidden="true" />
              </span>
            )}
            {title}
          </h3>
          {actions && <div className="card-actions">{actions}</div>}
        </div>
      )}
      {children}
      {footer && <div className="card-footer">{footer}</div>}
    </section>
  );
}
