import { forwardRef, useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

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
    passwordToggle = false,
    ...props
  },
  ref
) {
  const id = useId();
  const [showPassword, setShowPassword] = useState(false);
  const showToggle = !textarea && type === "password" && passwordToggle;
  const resolvedType = showToggle && showPassword ? "text" : type;

  function toggleVisibility() {
    setShowPassword((visible) => !visible);
  }

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
          type={resolvedType}
          className={`input${error ? " input-error" : ""}${showToggle ? " input-has-trailing" : ""}`}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          required={required}
          {...props}
        />
        {showToggle && (
          <button
            type="button"
            className="input-trailing-btn"
            onClick={toggleVisibility}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            aria-controls={id}
          >
            {showPassword ? (
              <EyeOff aria-hidden="true" />
            ) : (
              <Eye aria-hidden="true" />
            )}
          </button>
        )}
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
