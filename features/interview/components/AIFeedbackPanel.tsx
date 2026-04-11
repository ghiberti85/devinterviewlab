"use client";

import { CheckCircle, XCircle, Lightbulb, AlertTriangle } from "lucide-react";
import { useT } from "@/lib/i18n/useT";
import { cn } from "@/lib/utils";
import type { AIEvaluation } from "@/lib/supabase/types";
import { useSettingsStore } from "@/store/settings.store";

interface Props {
  evaluation: AIEvaluation;
  title?: string;
}

function ScoreBar({ value, label }: { value: number; label: string }) {
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  const color =
    v >= 75 ? "bg-green-500" : v >= 50 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-muted-foreground w-24 shrink-0">
        {label}
      </span>
      <div className="flex-1 h-2 rounded-full bg-border overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${v}%` }}
        />
      </div>
      <span className="text-xs tabular-nums w-7 text-right font-medium">
        {v}
      </span>
    </div>
  );
}

function ScoreCircle({ score }: { score: number }) {
  const v = Math.max(0, Math.min(100, Number(score) || 0));
  const color =
    v >= 75
      ? "text-green-600 dark:text-green-400"
      : v >= 50
        ? "text-yellow-600 dark:text-yellow-400"
        : "text-red-600 dark:text-red-400";
  return (
    <div className={cn("text-5xl font-bold tabular-nums", color)}>
      {v}
      <span className="text-lg text-muted-foreground font-normal">/100</span>
    </div>
  );
}

export function AIFeedbackPanel({ evaluation, title }: Props) {
  const t = useT();
  const { language } = useSettingsStore();
  const { feedback, score } = evaluation;
  const { strengths, gaps, suggestions, score_breakdown, star_analysis } =
    feedback;

  const scoreLabels = t.interview.scoreLabels;
  const starLabels = t.interview.starLabels;

  return (
    <div className="space-y-5">
      {title && (
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          {title}
        </h3>
      )}

      {/* Score + breakdown */}
      <div className="p-5 border rounded-xl bg-muted/30 space-y-4">
        <div className="flex items-center gap-6">
          <ScoreCircle score={score} />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground">{t.interview.score}</p>
            <p className="text-xs mt-0.5">
              {Number(score) >= 75 ? "✅" : Number(score) >= 50 ? "⚠️" : "❌"}{" "}
              {Number(score) >= 75
                ? language === "pt"
                  ? "Boa resposta"
                  : "Strong answer"
                : Number(score) >= 50
                  ? language === "pt"
                    ? "Resposta parcial"
                    : "Partial answer"
                  : language === "pt"
                    ? "Precisa melhorar"
                    : "Needs improvement"}
            </p>
          </div>
        </div>

        {score_breakdown && Object.keys(score_breakdown).length > 0 && (
          <div className="space-y-2.5">
            {(Object.entries(score_breakdown) as [string, number][]).map(
              ([k, v]) => (
                <ScoreBar
                  key={k}
                  value={Number(v)}
                  label={scoreLabels[k as keyof typeof scoreLabels] ?? k}
                />
              ),
            )}
          </div>
        )}
      </div>

      {/* STAR Analysis */}
      {star_analysis && (
        <div>
          <h3 className="text-sm font-semibold mb-2">STAR Analysis</h3>
          <div className="grid grid-cols-2 gap-2">
            {(Object.entries(star_analysis) as [string, any][]).map(
              ([key, val]) => (
                <div key={key} className="border rounded-lg p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide">
                      {starLabels[key as keyof typeof starLabels] ?? key}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {val.detected ? (
                        <CheckCircle size={13} className="text-green-500" />
                      ) : (
                        <XCircle size={13} className="text-red-400" />
                      )}
                      <span className="text-xs tabular-nums font-medium">
                        {Number(val.score)}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {val.notes}
                  </p>
                </div>
              ),
            )}
          </div>
        </div>
      )}

      {/* Strengths */}
      {strengths?.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
            <CheckCircle size={14} className="text-green-500" />
            {t.interview.strengths}
          </h3>
          <ul className="space-y-1.5">
            {strengths.map((s, i) => (
              <li
                key={i}
                className="text-sm text-muted-foreground flex gap-2 leading-relaxed"
              >
                <span className="text-green-500 mt-0.5 shrink-0">•</span>
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Gaps */}
      {gaps?.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
            <AlertTriangle size={14} className="text-yellow-500" />
            {t.interview.gaps}
          </h3>
          <ul className="space-y-1.5">
            {gaps.map((g, i) => (
              <li
                key={i}
                className="text-sm text-muted-foreground flex gap-2 leading-relaxed"
              >
                <span className="text-yellow-500 mt-0.5 shrink-0">•</span>
                {g}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Suggestions */}
      {suggestions?.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
            <Lightbulb size={14} className="text-blue-500" />
            {t.interview.suggestions}
          </h3>
          <ul className="space-y-1.5">
            {suggestions.map((s, i) => (
              <li
                key={i}
                className="text-sm text-muted-foreground flex gap-2 leading-relaxed"
              >
                <span className="text-blue-500 mt-0.5 shrink-0">•</span>
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
