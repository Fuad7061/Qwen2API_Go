"use client";

import { useTranslation } from "react-i18next";
import { Input } from "@heroui/react";
import { useState } from "react";
import { RefreshCw, Search, BrainCircuit, TrendingUp, Database, Plus, Trash2, X, Check, Sparkles } from "lucide-react";
import type { ModelItem } from "../types";
import { apiRequest } from "../api";
import { formatCompactNumber } from "./dashboard-charts";
import { SectionTitle } from "./primitives";

export function ModelsTab({
  models,
  keyword,
  setKeyword,
  refreshingModels,
  refreshModels,
  apiKey,
}: {
  models: ModelItem[];
  keyword: string;
  setKeyword: (value: string) => void;
  refreshingModels: boolean;
  refreshModels: () => Promise<void>;
  apiKey?: string;
}) {
  const { t } = useTranslation();
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  // Form state
  const [modelId, setModelId] = useState("");
  const [upstreamId, setUpstreamId] = useState("qwen3.7-plus");
  const [displayName, setDisplayName] = useState("");
  const [chatType, setChatType] = useState<"t2t" | "t2i" | "t2v">("t2t");
  const [enableSearch, setEnableSearch] = useState(true);
  const [enableThinking, setEnableThinking] = useState(true);

  const activeModels = models.filter((model) => (model.usage?.totalTokens || 0) > 0).length;
  const customModelsCount = models.filter((model) => model.custom).length;
  const totals = models.reduce(
    (acc, model) => {
      acc.prompt += model.usage?.promptTokens || 0;
      acc.completion += model.usage?.completionTokens || 0;
      acc.total += model.usage?.totalTokens || 0;
      return acc;
    },
    { prompt: 0, completion: 0, total: 0 },
  );

  async function handleSaveCustomModel(e: React.FormEvent) {
    e.preventDefault();
    const id = modelId.trim();
    const upstream = upstreamId.trim() || "qwen3.7-plus";
    if (!id) {
      setFormError("Model ID is required");
      return;
    }

    try {
      setSaving(true);
      setFormError("");
      setFormSuccess("");
      await apiRequest(
        "/api/custom-models",
        {
          method: "POST",
          body: JSON.stringify({
            id,
            name: displayName.trim() || id,
            upstream_id: upstream,
            chat_type: chatType,
            search: enableSearch,
            thinking: enableThinking,
          }),
        },
        apiKey,
      );
      setFormSuccess(`Custom model '${id}' added successfully!`);
      setModelId("");
      setDisplayName("");
      setUpstreamId("qwen3.7-plus");
      setShowAddForm(false);
      await refreshModels();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save custom model");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteCustomModel(id: string) {
    if (!confirm(`Are you sure you want to delete custom model '${id}'?`)) return;
    try {
      setDeletingId(id);
      await apiRequest(
        "/api/custom-models/delete",
        {
          method: "POST",
          body: JSON.stringify({ id }),
        },
        apiKey,
      );
      await refreshModels();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete custom model");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="admin-card">
      <div className="admin-card-header">
        <SectionTitle
          title={t("models.title")}
          description={t("models.subtitle")}
          action={
            <div className="flex flex-wrap items-center justify-end gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <Input
                  placeholder={t("models.searchModel")}
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  className="w-64 pl-9"
                />
              </div>
              <button
                className="admin-btn admin-btn-secondary flex items-center gap-1.5"
                onClick={() => {
                  setShowAddForm(!showAddForm);
                  setFormError("");
                  setFormSuccess("");
                }}
              >
                {showAddForm ? <X size={16} /> : <Plus size={16} />}
                Add Custom Model
              </button>
              <button
                className="admin-btn admin-btn-primary"
                disabled={refreshingModels}
                onClick={() => void refreshModels()}
                title="Refresh models from upstream"
              >
                <RefreshCw size={16} className={refreshingModels ? "animate-spin" : ""} />
                {t("models.refreshModels")}
              </button>
            </div>
          }
        />
      </div>

      <div className="admin-card-body">
        {/* Custom Model Form */}
        {showAddForm ? (
          <div className="mb-6 rounded-xl border border-[var(--primary)] bg-[var(--surface-hover)] p-5 shadow-sm animate-in fade-in">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-[var(--primary)]" />
                <h4 className="font-semibold text-[var(--text)]">Add Custom Model</h4>
              </div>
              <button
                type="button"
                className="text-[var(--text-muted)] hover:text-[var(--text)]"
                onClick={() => setShowAddForm(false)}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveCustomModel} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase">
                    Model ID (API Request Name) *
                  </label>
                  <Input
                    value={modelId}
                    onChange={(e) => setModelId(e.target.value)}
                    placeholder="e.g. qwen3-max, gpt-4o, my-model"
                    required
                  />
                  <p className="text-[11px] text-[var(--text-muted)]">The model name clients specify in OpenAI API calls.</p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase">
                    Upstream Model ID *
                  </label>
                  <Input
                    value={upstreamId}
                    onChange={(e) => setUpstreamId(e.target.value)}
                    placeholder="e.g. qwen3.7-plus"
                    required
                  />
                  <p className="text-[11px] text-[var(--text-muted)]">Actual model ID sent to Qwen backend (default: qwen3.7-plus).</p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase">
                    Display Name
                  </label>
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Qwen 3 Max (Custom)"
                  />
                  <p className="text-[11px] text-[var(--text-muted)]">Friendly label shown in dashboard.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase">
                    Chat Type
                  </label>
                  <select
                    className="admin-select w-full"
                    value={chatType}
                    onChange={(e) => setChatType(e.target.value as "t2t" | "t2i" | "t2v")}
                  >
                    <option value="t2t">Text Chat (t2t)</option>
                    <option value="t2i">Image Generation (t2i)</option>
                    <option value="t2v">Video Generation (t2v)</option>
                  </select>
                </div>

                <div className="flex items-center gap-6 pt-5">
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={enableSearch}
                      onChange={(e) => setEnableSearch(e.target.checked)}
                      className="rounded border-[var(--border)] text-[var(--primary)]"
                    />
                    <span>Enable Search</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={enableThinking}
                      onChange={(e) => setEnableThinking(e.target.checked)}
                      className="rounded border-[var(--border)] text-[var(--primary)]"
                    />
                    <span>Enable Thinking</span>
                  </label>
                </div>
              </div>

              {formError ? (
                <div className="rounded-lg bg-[var(--danger-light)] p-2.5 text-xs font-medium text-[var(--danger)]">
                  {formError}
                </div>
              ) : null}

              {formSuccess ? (
                <div className="rounded-lg bg-[var(--success-light)] p-2.5 text-xs font-medium text-[var(--success)]">
                  {formSuccess}
                </div>
              ) : null}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="admin-btn admin-btn-ghost text-xs"
                  onClick={() => setShowAddForm(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-btn admin-btn-primary text-xs flex items-center gap-1.5"
                  disabled={saving}
                >
                  {saving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                  {saving ? "Saving..." : "Save Model"}
                </button>
              </div>
            </form>
          </div>
        ) : null}

        <div className="admin-stat-grid mb-6">
          <div className="admin-stat-card primary">
            <div className="label flex items-center gap-1"><Database size={14} />{t("models.currentCount")}</div>
            <div className="value">{formatCompactNumber(models.length)}</div>
          </div>
          <div className="admin-stat-card success">
            <div className="label flex items-center gap-1"><BrainCircuit size={14} />Custom Models</div>
            <div className="value">{formatCompactNumber(customModelsCount)}</div>
          </div>
          <div className="admin-stat-card warning">
            <div className="label flex items-center gap-1"><TrendingUp size={14} />{t("models.totalPrompt")}</div>
            <div className="value">{formatCompactNumber(totals.prompt)}</div>
          </div>
          <div className="admin-stat-card danger">
            <div className="label flex items-center gap-1"><TrendingUp size={14} />{t("models.totalCompletion")}</div>
            <div className="value">{formatCompactNumber(totals.completion)}</div>
          </div>
        </div>

        <div className="admin-model-grid">
          {models.map((model) => (
            <div
              className={`admin-model-card relative ${model.custom ? "border-[var(--primary)] shadow-sm" : ""}`}
              key={model.id}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-1.5">
                    <h4 className="truncate">{model.id}</h4>
                    {model.custom ? (
                      <span className="rounded bg-purple-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-purple-600 dark:text-purple-400">
                        Custom
                      </span>
                    ) : null}
                  </div>
                  <p className="id truncate">{model.display_name || model.name || model.upstream_id || "-"}</p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="text-xs text-[var(--text-muted)]">{t("models.totalTokens")}</span>
                  <strong className="text-lg">{formatCompactNumber(model.usage?.totalTokens)}</strong>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 mb-4">
                {model.id.includes("thinking") || model.thinking ? <span className="admin-tag success">Thinking</span> : null}
                {model.id.includes("search") || model.search ? <span className="admin-tag warning">Search</span> : null}
                {model.id.includes("image") || model.chat_type === "t2i" ? <span className="admin-tag primary">Image</span> : null}
                {model.id.includes("video") || model.chat_type === "t2v" ? <span className="admin-tag danger">Video</span> : null}
                {model.usage?.totalTokens ? <span className="admin-tag success">{t("common.success")}</span> : null}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">{t("models.requestName")}</span>
                  <strong>{model.name || model.id}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">{t("models.upstreamId")}</span>
                  <strong className="mono">{model.upstream_id || "-"}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">{t("models.displayName")}</span>
                  <strong>{model.display_name || "-"}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">{t("models.inputTokens")}</span>
                  <strong>{formatCompactNumber(model.usage?.promptTokens)}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">{t("models.outputTokens")}</span>
                  <strong>{formatCompactNumber(model.usage?.completionTokens)}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">{t("models.totalTokens")}</span>
                  <strong>{formatCompactNumber(model.usage?.totalTokens)}</strong>
                </div>
              </div>

              {model.custom ? (
                <div className="mt-4 pt-3 border-t border-[var(--border)] flex justify-end">
                  <button
                    type="button"
                    className="text-xs text-[var(--danger)] hover:bg-[var(--danger-light)] px-2 py-1 rounded transition-colors flex items-center gap-1"
                    disabled={deletingId === model.id}
                    onClick={() => void handleDeleteCustomModel(model.id)}
                  >
                    {deletingId === model.id ? (
                      <RefreshCw size={12} className="animate-spin" />
                    ) : (
                      <Trash2 size={12} />
                    )}
                    Delete Custom Model
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
