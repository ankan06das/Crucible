export const inputCls =
  "w-full rounded-lg border border-slate-300 dark:border-[#272c3d] bg-white dark:bg-[#1a1e2b] px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition";

export function Card({ className = "", children, ...rest }) {
  return (
    <div
      className={`bg-white dark:bg-[#14161f] border border-slate-200 dark:border-[#272c3d] rounded-xl ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

export function Button({ variant = "primary", size = "md", className = "", children, ...rest }) {
  const base =
    "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary:
      "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm hover:from-indigo-500 hover:to-violet-500 dark:shadow-[0_0_18px_-6px_rgba(139,92,246,0.6)]",
    secondary:
      "border border-slate-300 dark:border-[#272c3d] bg-white dark:bg-[#1a1e2b] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#252b3d]",
    ghost: "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1a1e2b]",
    danger: "bg-rose-600 hover:bg-rose-500 text-white shadow-sm",
  };
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2 text-sm" };
  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...rest}>
      {children}
    </button>
  );
}

export function Badge({ tone = "neutral", children, className = "" }) {
  const tones = {
    neutral: "bg-slate-100 dark:bg-[#1a1e2b] text-slate-600 dark:text-slate-300",
    primary: "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
    success: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    warning: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300",
    danger: "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]} ${className}`}>
      {children}
    </span>
  );
}

export function SectionLabel({ children }) {
  return <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{children}</span>;
}

export function Field({ label, required, hint, children, className = "" }) {
  return (
    <div className={className}>
      <label className="block space-y-1.5">
        <span className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
          {required && <span className="ml-0.5 text-rose-500">*</span>}
        </span>
        {children}
        {hint && <span className="block text-xs text-slate-400 dark:text-slate-500">{hint}</span>}
      </label>
    </div>
  );
}

export function StatTile({ label, value, caption }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-[#272c3d] bg-slate-50 dark:bg-[#1a1e2b] p-5">
      <div className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{value}</div>
      {caption && <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{caption}</p>}
    </div>
  );
}

export function AgentAvatar({ agent, size = "md" }) {
  const sizes = { sm: "h-7 w-7 text-base", md: "h-9 w-9 text-lg", lg: "h-11 w-11 text-xl" };
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full ${sizes[size]}`}
      style={{ backgroundColor: `${agent.color}1f`, color: agent.color }}
      title={agent.name}
    >
      <span className="material-symbols-outlined">{agent.icon}</span>
    </span>
  );
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      {children}
    </header>
  );
}

export function Stepper({ steps, current }) {
  return (
    <nav aria-label="Progress" className="mb-6">
      <ol className="flex items-center gap-1">
        {steps.map((step, i) => {
          const active = i === current;
          const done = i < current;
          return (
            <li key={step.id} className="flex items-center">
              {i > 0 && (
                <span className={`mx-1 h-px w-6 md:w-12 ${done ? "bg-indigo-500 dark:bg-indigo-400" : "bg-slate-200 dark:bg-[#272c3d]"}`} />
              )}
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                  active
                    ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white dark:shadow-[0_0_16px_-2px_rgba(99,102,241,0.6)]"
                    : done
                      ? "text-indigo-600 dark:text-indigo-300"
                      : "text-slate-500 dark:text-slate-400"
                }`}
              >
                <span className="material-symbols-outlined text-sm">{done ? "check" : step.icon}</span>
                <span className="hidden sm:inline">{step.label}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
