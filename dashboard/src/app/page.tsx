"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { Plus, CheckCircle2, Circle, Clock, Loader2, Globe } from "lucide-react";
import { translations, Locale } from "@/lib/i18n";

export default function Home() {
  const { data: session, status } = useSession();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({ title: "", body: "", priority: "P1", skill: "answer" });
  const [locale, setLocale] = useState<Locale>("zh");
  const t = translations[locale];

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tasks");
      const data = await res.json();
      if (Array.isArray(data)) {
        setTasks(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchTasks();
    }
  }, [session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setIsCreating(false);
        setFormData({ title: "", body: "", priority: "P1", skill: "answer" });
        fetchTasks();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <h1 className="text-3xl font-bold">{t.welcome}</h1>
        <p className="text-gray-600">{t.please_sign_in}</p>
        <button
          onClick={() => signIn("github")}
          className="rounded-md bg-black px-6 py-2 text-white hover:bg-gray-800 transition-colors"
        >
          {t.sign_in}
        </button>
      </div>
    );
  }

  return (
    <main className="container mx-auto max-w-4xl p-6">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
          <p className="text-sm text-gray-500">
            {t.connected_to} {process.env.NEXT_PUBLIC_REPO_OWNER || (session.user as any)?.name}/{process.env.NEXT_PUBLIC_REPO_NAME || "multi-agent-tasks"}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setLocale(locale === "en" ? "zh" : "en")}
            className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            <Globe className="h-4 w-4" /> {locale === "en" ? "中文" : "English"}
          </button>
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" /> {t.new_task}
          </button>
          <button
            onClick={() => signOut()}
            className="text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            {t.sign_out}
          </button>
        </div>
      </header>

      {isCreating && (
        <section className="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">{t.create_title}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">{t.task_title}</label>
              <input
                type="text"
                required
                className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">{t.priority}</label>
                <select
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                >
                  <option value="P0">P0 (Critical)</option>
                  <option value="P1">P1 (High)</option>
                  <option value="P2">P2 (Normal)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">{t.skill}</label>
                <select
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm"
                  value={formData.skill}
                  onChange={(e) => setFormData({ ...formData, skill: e.target.value })}
                >
                  <option value="answer">Answer</option>
                  <option value="taizi">Taizi</option>
                  <option value="general">General</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">{t.instructions}</label>
              <textarea
                required
                rows={4}
                className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                value={formData.body}
                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              ></textarea>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {t.cancel}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? t.creating : t.create}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="space-y-4">
        {loading && !isCreating ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-12 text-gray-500">{t.no_tasks}</div>
        ) : (
          tasks.map((task) => (
            <div key={task.id} className="flex items-start justify-between rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:border-blue-300 transition-colors">
              <div className="flex items-start gap-3">
                {task.state === "open" ? (
                  <Circle className="mt-1 h-5 w-5 text-blue-500" />
                ) : (
                  <CheckCircle2 className="mt-1 h-5 w-5 text-green-500" />
                )}
                <div>
                  <h3 className="font-semibold text-gray-900">{task.title}</h3>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {task.labels.map((label: any) => (
                      <span
                        key={label.name}
                        className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 border border-gray-200"
                      >
                        {label.name}
                      </span>
                    ))}
                  </div>
                  <p className="mt-2 text-sm text-gray-500 line-clamp-2">{task.body}</p>
                </div>
              </div>
              <div className="text-right flex flex-col items-end gap-1">
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {new Date(task.created_at).toLocaleDateString()}
                </span>
                {task.assignee && (
                  <img
                    src={task.assignee.avatar_url}
                    alt={task.assignee.login}
                    className="h-6 w-6 rounded-full border border-gray-200"
                    title={`Assigned to ${task.assignee.login}`}
                  />
                )}
              </div>
            </div>
          ))
        )}
      </section>
    </main>
  );
}
