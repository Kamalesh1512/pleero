export function ChoiceGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-3 text-sm font-bold text-[#0B0C0E]">{label}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <label
            key={option}
            className={`flex cursor-pointer items-center rounded-lg border p-3 text-sm font-medium transition ${
              value === option
                ? "border-[#2D7A4F] bg-[#E8F5EE] text-[#163D29]"
                : "border-black/10 bg-white text-[#4E5968] hover:border-black/20"
            }`}
          >
            <input
              type="radio"
              name={label}
              value={option}
              checked={value === option}
              onChange={() => onChange(option)}
              className="mr-3 h-4 w-4 accent-[#2D7A4F]"
            />
            {option}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function MultiChoiceGroup({
  label,
  options,
  values,
  onChange,
}: {
  label: string;
  options: string[];
  values: string[];
  onChange: (values: string[]) => void;
}) {
  function toggle(option: string) {
    onChange(
      values.includes(option) ? values.filter((value) => value !== option) : [...values, option]
    );
  }

  return (
    <fieldset>
      <legend className="mb-3 text-sm font-bold text-[#0B0C0E]">{label}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <label
            key={option}
            className={`flex cursor-pointer items-center rounded-lg border p-3 text-sm font-medium transition ${
              values.includes(option)
                ? "border-[#2D7A4F] bg-[#E8F5EE] text-[#163D29]"
                : "border-black/10 bg-white text-[#4E5968] hover:border-black/20"
            }`}
          >
            <input
              type="checkbox"
              value={option}
              checked={values.includes(option)}
              onChange={() => toggle(option)}
              className="mr-3 h-4 w-4 rounded accent-[#2D7A4F]"
            />
            {option}
          </label>
        ))}
      </div>
    </fieldset>
  );
}