import { forwardRef, useId } from "react";

const Input = forwardRef(function Input(
  {
    label,
    name,
    type = "text",
    icon: Icon,
    error,
    hint,
    className = "",
    required,
    textarea = false,
    ...props
  },
  ref
) {
  const id = useId();

  const fieldClasses = `field ${className}`;

  if (textarea) {
    return (
      <div className={fieldClasses}>
        {label && (
          <label className="field-label" htmlFor={id}>
            {label}
            {required && <span className="text-danger"> *</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={id}
          name={name}
          className={`input textarea${error ? " input-error" : ""}`}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          required={required}
          {...props}
        />
        {error && (
          <span className="field-error" id={`${id}-error`}>
            {error}
          </span>
        )}
        {hint && !error && (
          <span className="field-hint" id={`${id}-hint`}>
            {hint}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={fieldClasses}>
      {label && (
        <label className="field-label" htmlFor={id}>
          {label}
          {required && <span className="text-danger"> *</span>}
        </label>
      )}
      <div className="input-wrap">
        {Icon && <Icon aria-hidden="true" />}
        <input
          ref={ref}
          id={id}
          name={name}
          type={type}
          className={`input${error ? " input-error" : ""}`}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          required={required}
          {...props}
        />
      </div>
      {error && (
        <span className="field-error" id={`${id}-error`}>
          {error}
        </span>
      )}
      {hint && !error && (
        <span className="field-hint" id={`${id}-hint`}>
          {hint}
        </span>
      )}
    </div>
  );
});

export default Input;
