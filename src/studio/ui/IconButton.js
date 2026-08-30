const IconButton = ({ label, tone = 'default', className = '', children, ...rest }) => {
  const tones = {
    default: 'text-studio-muted hover:bg-studio-surface hover:text-studio-text',
    danger: 'text-studio-muted hover:bg-red-50 hover:text-studio-danger',
    onDark: 'text-white/60 hover:bg-white/10 hover:text-white',
  };

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex h-7 w-7 items-center justify-center rounded-studio transition-colors duration-150
        focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40
        disabled:cursor-not-allowed disabled:opacity-40 ${tones[tone]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
};

export default IconButton;
