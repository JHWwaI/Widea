"use client";

import Link from "next/link";
import { Badge, SectionHeader, Surface } from "@/components/ProductUI";
import { cx, type ProjectWorkflowState } from "@/lib/product";

export default function ProjectJourney({
  workflow,
  compact = false,
}: {
  workflow: ProjectWorkflowState;
  compact?: boolean;
}) {
  const currentStep =
    workflow.steps.find((step) => step.status === "current") ??
    workflow.steps[workflow.steps.length - 1];

  return (
    <Surface className="space-y-5">
      <SectionHeader
        eyebrow="Workflow map"
        title="Where this project stands"
        description={workflow.summary}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="accent">{workflow.stageLabel}</Badge>
            <Badge>{workflow.completionPercent}% complete</Badge>
          </div>
        }
      />

      <div
        className="rounded-[20px] border border-[var(--line)] bg-white/70 p-4"
        role="progressbar"
        aria-label="Project workflow completion"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={workflow.completionPercent}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Current focus</p>
            <p className="mt-2 text-base font-semibold tracking-[-0.03em] text-[var(--ink)]">
              {currentStep.title}
            </p>
            <p className="mt-1 text-sm leading-7 text-[var(--muted-strong)]">
              {currentStep.description}
            </p>
          </div>
          <p className="text-sm font-semibold text-[var(--ink)]">
            {workflow.completedCount} / {workflow.steps.length} complete
          </p>
        </div>
        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-[rgba(29,42,36,0.08)]">
          <div
            className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-300"
            style={{ width: `${workflow.completionPercent}%` }}
          />
        </div>
      </div>

      <ol className={compact ? "grid gap-3 sm:grid-cols-2" : "grid gap-3 xl:grid-cols-4"}>
        {workflow.steps.map((step, index) => {
          const statusLabel =
            step.status === "done"
              ? "Done"
              : step.status === "current"
                ? "Now"
                : "Next";

          return (
            <li
              key={step.key}
              aria-current={step.status === "current" ? "step" : undefined}
              className={cx(
                "rounded-[20px] border p-4 transition",
                step.status === "done" &&
                  "border-[rgba(15,139,122,0.2)] bg-[rgba(236,248,245,0.72)]",
                step.status === "current" &&
                  "border-[rgba(231,140,71,0.24)] bg-[rgba(255,245,236,0.82)] shadow-[0_8px_24px_rgba(36,42,34,0.08)]",
                step.status === "upcoming" && "border-[var(--line)] bg-white/60",
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
                  Step {index + 1}
                </p>
                <span
                  className={cx(
                    "rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]",
                    step.status === "done" &&
                      "bg-[rgba(15,139,122,0.12)] text-[var(--accent-deep)]",
                    step.status === "current" &&
                      "bg-[rgba(231,140,71,0.14)] text-[rgb(152,95,39)]",
                    step.status === "upcoming" && "bg-[rgba(29,42,36,0.08)] text-[var(--muted)]",
                  )}
                >
                  {statusLabel}
                </span>
              </div>
              <p className="mt-3 text-lg font-semibold tracking-[-0.03em] text-[var(--ink)]">
                {step.title}
              </p>
              <p className="mt-2 text-sm leading-7 text-[var(--muted-strong)]">
                {step.description}
              </p>
            </li>
          );
        })}
      </ol>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-[var(--line)] bg-white/60 p-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Next action</p>
          <p className="mt-2 text-base font-semibold tracking-[-0.03em] text-[var(--ink)]">
            {workflow.nextAction.label}
          </p>
          <p id="project-next-action-description" className="mt-1 text-sm leading-7 text-[var(--muted-strong)]">
            {workflow.nextAction.description}
          </p>
        </div>
        <Link
          href={workflow.nextAction.href}
          className="btn-secondary"
          aria-describedby="project-next-action-description"
        >
          {workflow.nextAction.label}
        </Link>
      </div>
    </Surface>
  );
}
