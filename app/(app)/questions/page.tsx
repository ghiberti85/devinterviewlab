"use client";

import { useState } from "react";
import { Plus, Search, Trash2, X } from "lucide-react";
import { useQuestions, useBulkDeleteQuestions } from "@/features/questions/hooks/useQuestions";
import { QuestionCard } from "@/features/questions/components/QuestionCard";
import { QuestionForm } from "@/features/questions/components/QuestionForm";
import { useT } from "@/lib/i18n/useT";
import type { Difficulty, Question } from "@/lib/supabase/types";
import { useSettingsStore } from "@/store/settings.store";

const CATEGORIES = [
  { id: "", name: "javascript" },
  { id: "javascript", name: "JavaScript" },
  { id: "typescript", name: "TypeScript" },
  { id: "react", name: "React" },
  { id: "nodejs", name: "Node.js" },
  { id: "system-design", name: "System Design" },
  { id: "algorithms", name: "Algorithms" },
  { id: "css", name: "CSS" },
  { id: "behavioral", name: "Behavioral" },
];

export default function QuestionsPage() {
  const t = useT();
  const { language } = useSettingsStore();
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const bulkDelete = useBulkDeleteQuestions();

  const { data, isLoading } = useQuestions({
    search: search || undefined,
    difficulty: (difficulty as Difficulty) || undefined,
    language: selectedLanguage || undefined,
  });

  const questions = data?.data ?? [];
  const hasFilters = !!(search || difficulty || selectedLanguage);

  function handleEdit(q: Question) {
    setEditingQuestion(q);
    setShowForm(true);
  }
  function handleClose() {
    setShowForm(false);
    setEditingQuestion(null);
  }
  function clearFilters() {
    setSearch("");
    setDifficulty("");
    setSelectedLanguage("");
  }
  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function toggleSelectAll() {
    if (selectedIds.size === questions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(questions.map((q) => q.id)));
    }
  }
  function exitSelectionMode() {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }
  async function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    await bulkDelete.mutateAsync(Array.from(selectedIds));
    exitSelectionMode();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-xl font-semibold">{t.questions.title}</h1>
        <div className="flex items-center gap-2">
          {!selectionMode && (
            <button
              onClick={() => setSelectionMode(true)}
              className="flex items-center gap-2 border px-4 py-2 rounded-md text-sm hover:bg-accent transition-colors whitespace-nowrap"
            >
              {t.questions.select}
            </button>
          )}
          {!selectionMode && (
            <button
              onClick={() => {
                setEditingQuestion(null);
                setShowForm(true);
              }}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm hover:opacity-90 transition-opacity whitespace-nowrap"
            >
              <Plus size={16} /> {t.questions.newQuestion}
            </button>
          )}
        </div>
      </div>

      {selectionMode && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-muted/50 border rounded-lg">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSelectAll}
              className="text-sm text-primary hover:underline"
            >
              {selectedIds.size === questions.length ? t.questions.deselectAll : t.questions.selectAll}
            </button>
            <span className="text-sm text-muted-foreground">
              {selectedIds.size} {selectedIds.size === 1 ? t.questions.attempts : t.questions.attemptsPlural}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exitSelectionMode}
              className="text-sm px-3 py-1.5 rounded-md border hover:bg-accent transition-colors"
            >
              {t.questions.cancelSelect}
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={selectedIds.size === 0 || bulkDelete.isPending}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md bg-destructive text-destructive-foreground hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 size={14} />
              {bulkDelete.isPending
                ? t.questions.deleting
                : t.questions.deleteSelected(selectedIds.size)}
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.questions.searchPlaceholder}
            className="w-full border rounded-md pl-9 pr-8 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X size={13} />
            </button>
          )}
        </div>
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
          className="border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">{t.questions.allDifficulties}</option>
          <option value="easy">
            {language === "pt" ? "Fácil" : "Easy"}
          </option>
          <option value="medium">
            {language === "pt" ? "Médio" : "Medium"}
          </option>
          <option value="hard">
            {language === "pt" ? "Difícil" : "Hard"}
          </option>
        </select>
        <select
          value={selectedLanguage}
          onChange={(e) => setSelectedLanguage(e.target.value)}
          className="border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">{t.questions.allLanguages}</option>
          <option value="en">🇺🇸 English</option>
          <option value="pt">🇧🇷 Português</option>
        </select>
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground border rounded-md px-3 py-2 hover:bg-accent transition-colors"
          >
            <X size={13} /> {t.common.clear}
          </button>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card border rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <h2 className="font-semibold mb-5">
              {editingQuestion
                ? t.questions.editQuestion
                : t.questions.newQuestion}
            </h2>
            <QuestionForm
              question={editingQuestion ?? undefined}
              categories={CATEGORIES.filter((c) => c.id)}
              onSuccess={handleClose}
            />
          </div>
        </div>
      )}

      {search && !isLoading && (
        <p className="text-xs text-muted-foreground">
          {data?.total ?? 0}{" "}
          {data?.total === 1
            ? t.questions.attempts
            : t.questions.attemptsPlural}{" "}
          — "<strong>{search}</strong>"
        </p>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="border rounded-lg p-4 h-20 animate-pulse bg-muted"
            />
          ))}
        </div>
      ) : questions.length === 0 ? (
        <div className="text-center py-16 border rounded-xl bg-card">
          <p className="text-muted-foreground mb-3">
            {hasFilters ? t.questions.noFilters : t.common.noResults}
          </p>
          {hasFilters ? (
            <button
              onClick={clearFilters}
              className="text-sm text-primary hover:underline"
            >
              {t.common.clear}
            </button>
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className="text-sm text-primary hover:underline"
            >
              {t.questions.createFirst}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((q) => (
            <QuestionCard
              key={q.id}
              question={q}
              onEdit={selectionMode ? undefined : handleEdit}
              isSelected={selectedIds.has(q.id)}
              onToggleSelect={selectionMode ? toggleSelect : undefined}
            />
          ))}
          <p className="text-xs text-muted-foreground text-center pt-1">
            {data?.total}{" "}
            {data?.total === 1
              ? t.questions.attempts
              : t.questions.attemptsPlural}
          </p>
        </div>
      )}
    </div>
  );
}
