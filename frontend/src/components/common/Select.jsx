import { forwardRef, useId } from "react";

const Select = forwardRef(function Select(
  { label, name, options, placeholder = "Select...", error, hint, className = "", required, ...props },
  ref
) {
  const id = useId();

  return (
    <div className={`field ${className}`}>
      {label && (
        <label className="field-label" htmlFor={id}>
          {label}
          {required && <span className="text-danger"> *</span>}
        </label>
      )}
      <select
        ref={ref}
        id={id}
        name={name}
        className={`select${error ? " select-error" : ""}`}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        required={required}
        {...props}
      >
        <option value="">{placeholder}</option>
        {(options || []).map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
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

export default Select;
