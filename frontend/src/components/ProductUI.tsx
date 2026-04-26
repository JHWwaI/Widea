import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cx, humanizeKey } from "@/lib/product";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  badge,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
  badge?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-3xl space-y-2">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">{eyebrow}</p>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">{title}</h1>
          {badge}
        </div>
        <p className="max-w-2xl text-sm leading-relaxed text-gray-500 sm:text-base">
          {description}
        </p>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  titleId,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  titleId?: string;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="max-w-2xl space-y-1.5">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">{eyebrow}</p>
        ) : null}
        <h2 id={titleId} className="text-xl font-bold text-gray-900">
          {title}
        </h2>
        {description ? (
          <p className="text-sm leading-relaxed text-gray-500">{description}</p>
        ) : null}
      </div>
      {action ? <div className="flex flex-wrap items-center gap-2">{action}</div> : null}
    </div>
  );
}

export function Surface({
  children,
  className,
  muted = false,
  ...props
}: {
  children: ReactNode;
  muted?: boolean;
} & ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cx(
        "rounded-2xl border",
        muted
          ? "border-gray-100 bg-gray-50/80 p-5"
          : "border-gray-200 bg-white p-6 shadow-sm",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint: string;
  tone?: "default" | "accent" | "warm";
}) {
  return (
    <div
      className={cx(
        "space-y-2 rounded-2xl border p-5 shadow-sm",
        tone === "accent"
          ? "border-blue-100 bg-gradient-to-br from-blue-50 to-white"
          : tone === "warm"
            ? "border-amber-100 bg-gradient-to-br from-amber-50 to-white"
            : "border-gray-200 bg-white",
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm leading-relaxed text-gray-500">{hint}</p>
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "accent" | "success" | "warning";
}) {
  const toneClasses = {
    neutral: "bg-gray-100 text-gray-600",
    accent: "bg-blue-50 text-blue-700",
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
  };

  return (
    <span className={cx("inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold", toneClasses[tone])}>
      {children}
    </span>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-dashed border-gray-200 bg-gray-50/50 p-8 text-left">
      <div className="space-y-1.5">
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        <p className="max-w-xl text-sm leading-relaxed text-gray-500">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-5" role="status" aria-live="polite">
      <span className="inline-flex h-2.5 w-2.5 animate-pulse rounded-full bg-blue-500" />
      <span className="text-sm text-gray-500">{label}</span>
    </div>
  );
}

export function StructuredData({ data }: { data: unknown }) {
  if (data === null || data === undefined || data === "") {
    return <p className="text-sm text-gray-500">No data available yet.</p>;
  }

  if (Array.isArray(data)) {
    const isSimple = data.every(
      (entry) =>
        entry === null ||
        entry === undefined ||
        typeof entry === "string" ||
        typeof entry === "number" ||
        typeof entry === "boolean",
    );

    if (isSimple) {
      return (
        <div className="flex flex-wrap gap-1.5">
          {data.map((entry, index) => (
            <span key={`${entry}-${index}`} className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
              {String(entry)}
            </span>
          ))}
        </div>
      );
    }

    return (
      <div className="grid gap-3">
        {data.map((entry, index) => (
          <div key={index} className="space-y-2 rounded-xl border border-gray-100 bg-gray-50/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Item {index + 1}
            </p>
            <StructuredData data={entry} />
          </div>
        ))}
      </div>
    );
  }

  if (typeof data === "object") {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        {Object.entries(data as Record<string, unknown>).map(([key, value]) => (
          <div key={key} className="space-y-2 rounded-xl border border-gray-100 bg-gray-50/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              {humanizeKey(key)}
            </p>
            <StructuredData data={value} />
          </div>
        ))}
      </div>
    );
  }

  return <p className="text-sm leading-relaxed text-gray-900">{String(data)}</p>;
}
