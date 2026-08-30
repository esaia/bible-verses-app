import { HiChevronDown } from 'react-icons/hi';

/**
 * Restyled native select. The legacy console uses react-select for its
 * searchable book list; here the longest list is 13 translations, so a native
 * control is lighter, keyboard-accessible for free, and usable on a touch
 * screen at the back of a hall.
 */
const Select = ({ value, onChange, options, tone = 'light', className = '', ...rest }) => {
  const tones = {
    light: 'bg-white text-studio-text border-studio-border hover:bg-studio-surface',
    dark: 'bg-[#2a2e37] text-white border-white/10 hover:bg-[#343945]',
  };

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`h-8 w-full appearance-none truncate rounded-studio border pl-3 pr-8 text-xs
          font-medium transition-colors duration-150 focus:outline-none
          focus-visible:ring-2 focus-visible:ring-studio-accent/40 ${tones[tone]}`}
        {...rest}
      >
        {options.map(option => (
          <option key={option.value} value={option.value} className="bg-white text-studio-text">
            {option.label}
          </option>
        ))}
      </select>
      <HiChevronDown
        className={`pointer-events-none absolute right-2 text-base ${
          tone === 'dark' ? 'text-white/50' : 'text-studio-faint'
        }`}
      />
    </div>
  );
};

export default Select;
