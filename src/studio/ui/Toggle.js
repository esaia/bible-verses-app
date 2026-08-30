/** Small switch used to arm a language for the projector. */
const Toggle = ({ checked, onChange, label }) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors duration-150
        focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40
        ${checked ? 'bg-studio-accent' : 'bg-studio-border'}`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-studio transition-all duration-150
          ${checked ? 'left-[18px]' : 'left-0.5'}`}
      />
    </button>
  );
};

export default Toggle;
