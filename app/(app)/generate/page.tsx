"use client";

import { useState, useRef } from "react";
import { useCreateQuestion } from "@/features/questions/hooks/useQuestions";
import {
  useSavedCV,
  useDocuments,
  useUploadDocument,
  useDeleteDocument,
  useUpdateDocument,
  formatFileSize,
  type UserDocument,
} from "@/features/documents/hooks/useDocuments";
import { DifficultyBadge } from "@/components/DifficultyBadge";
import { useSettingsStore } from "@/store/settings.store";
import { useT } from "@/lib/i18n/useT";
import {
  Upload,
  Sparkles,
  Check,
  FileText,
  X,
  Save,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Trash2,
  BookUser,
  FilePlus,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import type { Difficulty } from "@/lib/supabase/types";
import { readNdjsonStream } from "@/lib/api/stream";

const CATEGORIES = [
  { value: "", label: "Auto" },
  { value: "JavaScript", label: "JavaScript" },
  { value: "TypeScript", label: "TypeScript" },
  { value: "React", label: "React" },
  { value: "Node.js", label: "Node.js" },
  { value: "System Design", label: "System Design" },
  { value: "Algorithms", label: "Algorithms" },
  { value: "CSS", label: "CSS" },
  { value: "Behavioral", label: "Behavioral" },
];

interface GeneratedQuestion {
  title: string;
  body: string | null;
  ideal_answer: string;
  difficulty: Difficulty;
  is_behavioral: boolean;
  detected_skills?: string[];
}
interface GenerateResult {
  questions: GeneratedQuestion[];
  skills_detected: string[];
  summary: string;
}

interface TempFile {
  file: File;
  keepStored: boolean;
}

export default function GeneratePage() {
  const { language } = useSettingsStore();
  const t = useT();

  // ── Saved CV ────────────────────────────────────────────────────────────────
  const {
    data: savedCV,
    isLoading: cvLoading,
    refetch: refetchCV,
  } = useSavedCV();
  const { data: allDocs = [] } = useDocuments();
  const savedOtherDocs = allDocs.filter((d) => d.doc_type === "other");

  const uploadDoc = useUploadDocument();
  const deleteDoc = useDeleteDocument();
  const updateDoc = useUpdateDocument();

  // ── CV upload ref ───────────────────────────────────────────────────────────
  const cvInputRef = useRef<HTMLInputElement>(null);
  const extraInputRef = useRef<HTMLInputElement>(null);

  // ── Temp files (not yet saved) ──────────────────────────────────────────────
  const [tempFiles, setTempFiles] = useState<TempFile[]>([]);
  const [selectedSavedIds, setSelectedSavedIds] = useState<Set<string>>(
    new Set(),
  );

  // ── Generation settings ─────────────────────────────────────────────────────
  const [context, setContext] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty | "mixed">("mixed");
  const [count, setCount] = useState(5);
  const [categoryName, setCategoryName] = useState("");
  const [isBehavioral, setIsBehavioral] = useState(false);
  const [questionLang, setQuestionLang] = useState<string>(language);

  // ── Generation state ────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  const createQuestion = useCreateQuestion();

  // ── CV handlers ─────────────────────────────────────────────────────────────
  async function handleCVUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await uploadDoc.mutateAsync({ file, docType: "cv", keepStored: true });
      refetchCV();
    } catch (err: any) {
      setError(err.message);
    }
    e.target.value = "";
  }

  async function handleCVDelete() {
    if (!savedCV) return;
    await deleteDoc.mutateAsync(savedCV.id);
    refetchCV();
  }

  // ── Extra file handlers ──────────────────────────────────────────────────────
  async function handleExtraFileAdd(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setTempFiles((prev) => [
      ...prev,
      ...files.map((f) => ({ file: f, keepStored: false })),
    ]);
    e.target.value = "";
  }

  function removeTempFile(i: number) {
    setTempFiles((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function saveTempFile(i: number) {
    const tf = tempFiles[i];
    try {
      const result = await uploadDoc.mutateAsync({
        file: tf.file,
        docType: "other",
        keepStored: true,
      });
      // Remove from temp, it's now in saved
      setTempFiles((prev) => prev.filter((_, idx) => idx !== i));
      if (result.id) {
        setSelectedSavedIds((prev) => new Set([...prev, result.id]));
      }
    } catch (err: any) {
      setError(err.message);
    }
  }

  function toggleSavedDoc(id: string) {
    setSelectedSavedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // ── Generate ─────────────────────────────────────────────────────────────────
  async function handleGenerate() {
    const hasCv = !!savedCV?.text_content;
    const hasExtra =
      tempFiles.length > 0 || selectedSavedIds.size > 0 || context.trim();

    if (!hasCv && !hasExtra) {
      setError(
        language === "pt"
          ? "Faça upload do seu CV ou adicione um arquivo / descrição de vaga para gerar questões."
          : "Upload your CV or add a file / job description to generate questions.",
      );
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);
    setSelected(new Set());
    setSavedCount(0);

    try {
      const fd = new FormData();
      fd.append("context", context);
      fd.append("difficulty", difficulty);
      fd.append("count", String(count));
      fd.append("is_behavioral", String(isBehavioral));
      fd.append("language", questionLang);
      if (categoryName) fd.append("category_name", categoryName);
      if (selectedSavedIds.size > 0) {
        fd.append("saved_doc_ids", [...selectedSavedIds].join(","));
      }
      // Only send the first temp file (API handles one at a time; for MVP)
      if (tempFiles.length > 0) {
        fd.append("temp_file", tempFiles[0].file);
      }

      const res = await fetch("/api/ai/generate", { method: "POST", body: fd });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Generation failed");
      }
      const data = await readNdjsonStream<GenerateResult>(res);

      setResult(data);
      setSelected(new Set(data.questions.map((_: any, i: number) => i)));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function toggleSelect(i: number) {
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(i) ? n.delete(i) : n.add(i);
      return n;
    });
  }
  function toggleExpand(i: number) {
    setExpanded((prev) => {
      const n = new Set(prev);
      n.has(i) ? n.delete(i) : n.add(i);
      return n;
    });
  }
  function toggleAll() {
    if (!result) return;
    setSelected(
      selected.size === result.questions.length
        ? new Set()
        : new Set(result.questions.map((_, i) => i)),
    );
  }

  async function handleSave() {
    if (!result || selected.size === 0) return;
    setSaving(true);
    let saved = 0;
    for (const i of selected) {
      const q = result.questions[i];
      try {
        await createQuestion.mutateAsync({
          title: q.title,
          body: q.body ?? undefined,
          ideal_answer: q.ideal_answer,
          difficulty: q.difficulty,
          is_behavioral: q.is_behavioral,
          language: questionLang as "en" | "pt",
        });
        saved++;
      } catch {}
    }
    setSavedCount(saved);
    setSaving(false);
    setSelected(new Set());
  }

  const difficultyOptions = [
    { value: "easy", label: language === "pt" ? "🟢 Fácil" : "🟢 Easy" },
    { value: "medium", label: language === "pt" ? "🟡 Médio" : "🟡 Medium" },
    { value: "hard", label: language === "pt" ? "🔴 Difícil" : "🔴 Hard" },
    {
      value: "mixed",
      label: language === "pt" ? "🎲 Misto (varia)" : "🎲 Mixed (varies)",
    },
  ];

  const cvLabel = language === "pt" ? "Currículo (CV)" : "Resume (CV)";
  const autoLabel =
    language === "pt"
      ? "Incluído automaticamente em todas as gerações"
      : "Automatically included in all generations";

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Sparkles size={20} className="text-primary" />
          {language === "pt" ? "Gerar questões" : "Generate questions"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {language === "pt"
            ? "Seu CV é a base. Adicione descrição da vaga para questões ainda mais personalizadas."
            : "Your CV is the base. Add a job description for even more targeted questions."}
        </p>
      </div>

      {/* ── SECTION 1: CV ── */}
      <div className="border rounded-xl bg-card overflow-hidden">
        <div className="px-5 py-3 border-b bg-muted/30 flex items-center gap-2">
          <BookUser size={15} className="text-primary" />
          <span className="font-medium text-sm">{cvLabel}</span>
          <span className="text-xs text-muted-foreground ml-1">
            — {autoLabel}
          </span>
        </div>

        <div className="p-5">
          {cvLoading ? (
            <div className="h-16 animate-pulse bg-muted rounded-lg" />
          ) : savedCV ? (
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                  <FileText
                    size={16}
                    className="text-green-600 dark:text-green-400"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium">{savedCV.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(savedCV.file_size)} ·{" "}
                    {savedCV.chars?.toLocaleString()}{" "}
                    {language === "pt"
                      ? "caracteres extraídos"
                      : "chars extracted"}
                    {" · "}
                    {language === "pt" ? "atualizado" : "updated"}{" "}
                    {new Date(
                      savedCV.updated_at ?? savedCV.created_at,
                    ).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                  <Check size={12} /> {language === "pt" ? "Salvo" : "Saved"}
                </span>
                <button
                  onClick={() => cvInputRef.current?.click()}
                  disabled={uploadDoc.isPending}
                  className="flex items-center gap-1.5 text-xs border px-2.5 py-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground"
                >
                  <RefreshCw size={12} />
                  {language === "pt" ? "Substituir" : "Replace"}
                </button>
                <button
                  onClick={handleCVDelete}
                  className="flex items-center gap-1.5 text-xs border border-destructive/30 text-destructive px-2.5 py-1.5 rounded-md hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => cvInputRef.current?.click()}
              className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/40 hover:bg-accent transition-colors"
            >
              {uploadDoc.isPending && uploadDoc.variables?.docType === "cv" ? (
                <p className="text-sm text-muted-foreground">
                  {language === "pt" ? "Processando CV…" : "Processing CV…"}
                </p>
              ) : (
                <>
                  <Upload
                    size={22}
                    className="mx-auto text-muted-foreground mb-2"
                  />
                  <p className="text-sm font-medium">
                    {language === "pt"
                      ? "Faça upload do seu CV (PDF)"
                      : "Upload your CV (PDF)"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {language === "pt"
                      ? "Será salvo e usado automaticamente em todas as gerações"
                      : "Saved and auto-used in all future generations"}
                  </p>
                </>
              )}
            </div>
          )}
          <input
            ref={cvInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleCVUpload}
          />
        </div>
      </div>

      {/* ── SECTION 2: Additional documents ── */}
      <div className="border rounded-xl bg-card overflow-hidden">
        <div className="px-5 py-3 border-b bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FilePlus size={15} className="text-muted-foreground" />
            <span className="font-medium text-sm">
              {language === "pt" ? "Arquivos adicionais" : "Additional files"}
            </span>
            <span className="text-xs text-muted-foreground">
              {language === "pt"
                ? "(descrição da vaga, portfólio, etc.)"
                : "(job description, portfolio, etc.)"}
            </span>
          </div>
          <button
            onClick={() => extraInputRef.current?.click()}
            className="flex items-center gap-1.5 text-xs border px-3 py-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground"
          >
            <Upload size={12} />
            {language === "pt" ? "Adicionar arquivo" : "Add file"}
          </button>
          <input
            ref={extraInputRef}
            type="file"
            accept="application/pdf"
            multiple
            className="hidden"
            onChange={handleExtraFileAdd}
          />
        </div>

        <div className="p-5 space-y-3">
          {/* Previously saved other docs */}
          {savedOtherDocs.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {language === "pt" ? "Documentos salvos" : "Saved documents"}
              </p>
              {savedOtherDocs.map((doc) => (
                <div
                  key={doc.id}
                  className={`flex items-center justify-between gap-3 p-3 border rounded-lg transition-colors ${selectedSavedIds.has(doc.id) ? "border-primary/50 bg-primary/5" : "hover:bg-accent"}`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={selectedSavedIds.has(doc.id)}
                      onChange={() => toggleSavedDoc(doc.id)}
                      className="rounded shrink-0"
                    />
                    <FileText
                      size={14}
                      className="text-muted-foreground shrink-0"
                    />
                    <span className="text-sm truncate">{doc.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatFileSize(doc.file_size)}
                    </span>
                  </div>
                  <button
                    onClick={() => deleteDoc.mutate(doc.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Temp files */}
          {tempFiles.length > 0 && (
            <div className="space-y-2">
              {savedOtherDocs.length > 0 && (
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {language === "pt" ? "Arquivos desta sessão" : "This session"}
                </p>
              )}
              {tempFiles.map((tf, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-3 p-3 border rounded-lg bg-yellow-50/50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FileText
                      size={14}
                      className="text-yellow-600 dark:text-yellow-400 shrink-0"
                    />
                    <span className="text-sm truncate">{tf.file.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatFileSize(tf.file.size)}
                    </span>
                    <span className="text-xs text-yellow-700 dark:text-yellow-300 border border-yellow-300 px-1.5 py-0.5 rounded">
                      {language === "pt" ? "temporário" : "temp"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => saveTempFile(i)}
                      disabled={uploadDoc.isPending}
                      className="text-xs border px-2 py-1 rounded hover:bg-accent transition-colors text-muted-foreground"
                      title={
                        language === "pt"
                          ? "Salvar permanentemente"
                          : "Save permanently"
                      }
                    >
                      <Save size={11} />
                    </button>
                    <button
                      onClick={() => removeTempFile(i)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Context textarea */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              {language === "pt"
                ? "Descrição da vaga / contexto adicional"
                : "Job description / additional context"}
            </label>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              rows={5}
              placeholder={
                language === "pt"
                  ? "Cole a descrição da vaga, requisitos do cargo, stack tecnológica desejada..."
                  : "Paste the job description, role requirements, desired tech stack..."
              }
              className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          {savedOtherDocs.length === 0 &&
            tempFiles.length === 0 &&
            !context && (
              <p className="text-xs text-muted-foreground text-center py-2">
                {language === "pt"
                  ? "Adicione a descrição da vaga (texto ou PDF) para questões mais direcionadas"
                  : "Add a job description (text or PDF) for more targeted questions"}
              </p>
            )}
        </div>
      </div>

      {/* ── SECTION 3: Settings + Generate ── */}
      <div className="border rounded-xl p-5 bg-card space-y-4">
        <h2 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
          {language === "pt" ? "Configurações" : "Settings"}
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1.5 text-muted-foreground">
              {language === "pt" ? "Dificuldade" : "Difficulty"}
            </label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as any)}
              className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {difficultyOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5 text-muted-foreground">
              {language === "pt" ? "Quantidade" : "Count"}
            </label>
            <select
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value))}
              className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {[3, 5, 8, 10, 15].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5 text-muted-foreground">
              {language === "pt" ? "Categoria" : "Category"}
            </label>
            <select
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">
                {language === "pt" ? "Detectar automaticamente" : "Auto-detect"}
              </option>
              {CATEGORIES.filter((c) => c.value).map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5 text-muted-foreground">
              {language === "pt" ? "Idioma" : "Language"}
            </label>
            <select
              value={questionLang}
              onChange={(e) => setQuestionLang(e.target.value as "en" | "pt")}
              className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="en">🇺🇸 English</option>
              <option value="pt">🇧🇷 Português</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={isBehavioral}
              onChange={(e) => setIsBehavioral(e.target.checked)}
              className="rounded"
            />
            {language === "pt"
              ? "Incluir questões comportamentais (STAR)"
              : "Include behavioral questions (STAR)"}
          </label>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            <Sparkles size={15} />
            {loading
              ? language === "pt"
                ? "Gerando…"
                : "Generating…"
              : language === "pt"
                ? "Gerar questões"
                : "Generate questions"}
          </button>
        </div>
      </div>

      {/* Sources summary */}
      {(savedCV ||
        selectedSavedIds.size > 0 ||
        tempFiles.length > 0 ||
        context) && (
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="text-muted-foreground">
            {language === "pt" ? "Fontes:" : "Sources:"}
          </span>
          {savedCV && (
            <span className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-2 py-0.5 rounded-full">
              ✅ CV: {savedCV.name}
            </span>
          )}
          {selectedSavedIds.size > 0 && (
            <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded-full">
              📁 {selectedSavedIds.size} doc
              {selectedSavedIds.size !== 1 ? "s" : ""} salvos
            </span>
          )}
          {tempFiles.length > 0 && (
            <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 px-2 py-0.5 rounded-full">
              📄 {tempFiles.length} arquivo{tempFiles.length !== 1 ? "s" : ""}{" "}
              temp
            </span>
          )}
          {context && (
            <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 px-2 py-0.5 rounded-full">
              📝 Contexto
            </span>
          )}
        </div>
      )}

      {error && (
        <div className="text-sm bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {loading && (
        <div className="border rounded-xl p-12 bg-card flex flex-col items-center gap-4 text-muted-foreground">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">
            {language === "pt"
              ? "Analisando contexto e gerando questões personalizadas…"
              : "Analysing context and generating personalised questions…"}
          </p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          <div className="border rounded-xl p-4 bg-card space-y-3">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="space-y-2 flex-1">
                <p className="text-sm font-medium">{result.summary}</p>
                {result.skills_detected.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {result.skills_detected.map((s) => (
                      <span
                        key={s}
                        className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={toggleAll}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  {selected.size === result.questions.length
                    ? language === "pt"
                      ? "Desmarcar todos"
                      : "Deselect all"
                    : language === "pt"
                      ? "Selecionar todos"
                      : "Select all"}
                </button>
                <button
                  onClick={handleSave}
                  disabled={selected.size === 0 || saving}
                  className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
                >
                  <Save size={14} />
                  {saving
                    ? language === "pt"
                      ? "Salvando…"
                      : "Saving…"
                    : language === "pt"
                      ? `Salvar ${selected.size}`
                      : `Save ${selected.size}`}
                </button>
              </div>
            </div>

            {difficulty === "mixed" && result.questions.length > 0 && (
              <div className="flex items-center gap-3 pt-1 border-t">
                <span className="text-xs text-muted-foreground">
                  {language === "pt" ? "Distribuição:" : "Mix:"}
                </span>
                {(["easy", "medium", "hard"] as Difficulty[]).map((d) => {
                  const n = result.questions.filter(
                    (q) => q.difficulty === d,
                  ).length;
                  return n > 0 ? (
                    <span key={d} className="flex items-center gap-1">
                      <DifficultyBadge difficulty={d} />
                      <span className="text-xs text-muted-foreground">
                        ×{n}
                      </span>
                    </span>
                  ) : null;
                })}
              </div>
            )}
          </div>

          {savedCount > 0 && (
            <div className="flex items-center gap-2 text-sm bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border border-green-200 rounded-lg px-4 py-3">
              <Check size={15} />
              {language === "pt"
                ? `${savedCount} questão(ões) salva(s) na biblioteca.`
                : `${savedCount} question(s) saved.`}
            </div>
          )}

          <div className="space-y-3">
            {result.questions.map((q, i) => {
              const isSel = selected.has(i);
              const isExp = expanded.has(i);
              return (
                <div
                  key={i}
                  className={`border rounded-xl bg-card transition-all ${isSel ? "border-primary/50 shadow-sm" : "opacity-60"}`}
                >
                  <div className="p-4 flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={isSel}
                      onChange={() => toggleSelect(i)}
                      className="mt-0.5 rounded shrink-0 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <DifficultyBadge difficulty={q.difficulty} />
                        {q.is_behavioral && (
                          <span className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 px-2 py-0.5 rounded-full">
                            Comportamental
                          </span>
                        )}
                        {q.detected_skills?.slice(0, 3).map((s) => (
                          <span
                            key={s}
                            className="text-xs bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                      <p className="text-sm font-medium leading-relaxed">
                        {q.title}
                      </p>
                      {q.body && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {q.body}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => toggleExpand(i)}
                      className="text-muted-foreground hover:text-foreground shrink-0 p-1"
                    >
                      {isExp ? (
                        <ChevronUp size={15} />
                      ) : (
                        <ChevronDown size={15} />
                      )}
                    </button>
                  </div>
                  {isExp && (
                    <div className="border-t px-4 py-4 bg-muted/30 rounded-b-xl">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        {language === "pt" ? "Resposta ideal" : "Ideal answer"}
                      </p>
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">
                        {q.ideal_answer}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
