// Labeled input with an error message (red) or hint (green) underneath.
function FormField({ label, name, error, hint, type = 'text', ...inputProps }) {
  const errorId = `${name}-error`
  const hintId = `${name}-hint`
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        className={`mt-2 block w-full rounded-md border bg-cream px-3.5 py-2.5 text-sm placeholder:text-muted/80 focus:ring-2 focus:outline-none ${
          error
            ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
            : hint
              ? 'border-green-600/50 focus:border-green-600 focus:ring-green-600/20'
              : 'border-line focus:border-copper focus:ring-copper/25'
        }`}
        {...inputProps}
      />
      {error ? (
        <p id={errorId} className="mt-1.5 text-xs text-red-700">
          {error}
        </p>
      ) : (
        hint && (
          <p id={hintId} className="mt-1.5 text-xs text-green-700">
            {hint}
          </p>
        )
      )}
    </div>
  )
}

export default FormField
