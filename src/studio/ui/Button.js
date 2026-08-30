const VARIANTS = {
  primary: 'bg-[#16181d] text-white hover:bg-[#2a2e37] disabled:bg-[#16181d]/40',
  accent: 'bg-studio-accent text-white hover:bg-[#1d4ed8] disabled:bg-studio-accent/40',
  secondary: 'bg-white text-studio-text border border-studio-border hover:bg-studio-surface disabled:text-studio-faint',
  ghost: 'bg-transparent text-studio-muted hover:bg-studio-surface hover:text-studio-text',
  success: 'bg-studio-go text-white hover:bg-[#19643f] disabled:bg-studio-go/40',
  danger: 'bg-studio-danger text-white hover:bg-[#b91c1c]',
  dark: 'bg-[#2a2e37] text-white hover:bg-[#3a3f4a] border border-white/10',
};

const SIZES = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-9 px-4 text-sm gap-2',
};

const Button = ({ variant = 'secondary', size = 'sm', icon, className = '', children, ...rest }) => {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center rounded-studio font-medium tracking-tight
        transition-colors duration-150 select-none whitespace-nowrap
        focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40
        disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
};

export default Button;
