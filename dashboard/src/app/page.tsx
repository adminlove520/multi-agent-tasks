"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { Plus, CheckCircle2, Circle, Clock, Loader2, Globe, Settings, Terminal, ListTodo, Copy, Check } from "lucide-react";
import { translations, Locale } from "@/lib/i18n";

export default function Home() {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState<"tasks" | "agents" | "skills">("tasks");
  const [tasks, setTasks] = useState<any[]>([]);
  const [availableSkills, setAvailableSkills] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({ title: "", body: "", priority: "P1", skill: "answer" });
  const [locale, setLocale] = useState<Locale>("zh");
  const [copied, setCopied] = useState<string | null>(null);
  
  const t = translations[locale];

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tasks");
      const data = await res.json();
      if (Array.isArray(data)) setTasks(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchSkills = async () => {
    try {
      const res = await fetch("/api/skills");
      const data = await res.json();
      if (Array.isArray(data)) setAvailableSkills(data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    if (session) {
      fetchTasks();
      fetchSkills();
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
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
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
            onClick={() => signOut()}
            className="text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            {t.sign_out}
          </button>
        </div>
      </header>

      {/* Tabs */}
      <nav className="mb-8 flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab("tasks")}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${activeTab === "tasks" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
        >
          <ListTodo className="h-4 w-4" /> {t.tabs.tasks}
        </button>
        <button
          onClick={() => setActiveTab("agents")}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${activeTab === "agents" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
        >
          <Settings className="h-4 w-4" /> {t.tabs.agents}
        </button>
        <button
          onClick={() => setActiveTab("skills")}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${activeTab === "skills" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
        >
          <Terminal className="h-4 w-4" /> {t.tabs.skills}
        </button>
      </nav>

      {/* Tasks Tab */}
      {activeTab === "tasks" && (
        <section>
          <div className="mb-6 flex justify-end">
            <button
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" /> {t.new_task}
            </button>
          </div>

          {isCreating && (
            <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold">{t.create_title}</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t.task_title}</label>
                  <input
                    type="text" required
                    className="mt-1 block w-full rounded-md border border-gray-300 p-2"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">{t.priority}</label>
                    <select
                      className="mt-1 block w-full rounded-md border border-gray-300 p-2"
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
                      className="mt-1 block w-full rounded-md border border-gray-300 p-2"
                      value={formData.skill}
                      onChange={(e) => setFormData({ ...formData, skill: e.target.value })}
                    >
                      {availableSkills.map(s => <option key={s} value={s}>{s}</option>)}
                      {!availableSkills.includes("answer") && <option value="answer">Answer</option>}
                      {!availableSkills.includes("taizi") && <option value="taizi">Taizi</option>}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t.instructions}</label>
                  <textarea
                    required rows={4}
                    className="mt-1 block w-full rounded-md border border-gray-300 p-2"
                    value={formData.body}
                    onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                  ></textarea>
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setIsCreating(false)} className="rounded-md border border-gray-300 px-4 py-2 text-sm">{t.cancel}</button>
                  <button type="submit" disabled={loading} className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50">
                    {loading ? t.creating : t.create}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="space-y-4">
            {loading && !isCreating ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-12 text-gray-500">{t.no_tasks}</div>
            ) : (
              tasks.map((task) => (
                <div key={task.id} className="flex items-start justify-between rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:border-blue-300 transition-colors">
                  <div className="flex items-start gap-3">
                    {task.state === "open" ? <Circle className="mt-1 h-5 w-5 text-blue-500" /> : <CheckCircle2 className="mt-1 h-5 w-5 text-green-500" />}
                    <div>
                      <h3 className="font-semibold text-gray-900">{task.title}</h3>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {task.labels.map((label: any) => (
                          <span key={label.name} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 border border-gray-200">{label.name}</span>
                        ))}
                      </div>
                      <p className="mt-2 text-sm text-gray-500 line-clamp-2">{task.body}</p>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    <span className="text-xs text-gray-400 flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(task.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {/* Agents Tab */}
      {activeTab === "agents" && (
        <section className="space-y-6">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">{t.agents.title}</h2>
            <p className="mb-6 text-sm text-gray-500">此配置将存储于仓库的 `agents.json` 中，供 Agent 启动时自动读取。</p>
            <form className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t.agents.name}</label>
                  <input type="text" placeholder="e.g. 小溪" className="mt-1 block w-full rounded-md border border-gray-300 p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t.agents.role}</label>
                  <select className="mt-1 block w-full rounded-md border border-gray-300 p-2">
                    <option value="commander">指挥官 (Commander)</option>
                    <option value="executor">执行者 (Executor)</option>
                    <option value="collector">汇总者 (Collector)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">{t.agents.tg_token}</label>
                <input type="password" placeholder="123456:ABC-DEF..." className="mt-1 block w-full rounded-md border border-gray-300 p-2" />
              </div>
              <button disabled className="rounded-md bg-gray-800 px-4 py-2 text-sm text-white opacity-50 cursor-not-allowed">
                {t.agents.save} (Coming Soon)
              </button>
            </form>
          </div>
        </section>
      )}

      {/* Skills Tab */}
      {activeTab === "skills" && (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {availableSkills.map(skill => (
            <div key={skill} className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-2 capitalize">{skill.replace(/-/g, ' ')}</h3>
              <p className="text-sm text-gray-500 mb-4 font-mono">/skills/{skill}</p>
              
              <div className="mt-4 p-3 bg-gray-900 rounded-md">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-gray-400 font-mono">Install via curl</span>
                  <button 
                    onClick={() => copyToClipboard(`curl -sSL https://${window.location.host}/install.sh | bash -s -- ${skill}`, skill)}
                    className="text-gray-400 hover:text-white"
                  >
                    {copied === skill ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
                <code className="text-xs text-blue-400 break-all block font-mono">
                  curl -sSL https://{typeof window !== 'undefined' ? window.location.host : '...'}/install.sh | bash -s -- {skill}
                </code>
              </div>
              
              <a 
                href={`/api/skills?name=${skill}`} 
                target="_blank"
                className="mt-4 inline-block text-sm text-blue-600 hover:underline"
              >
                View SKILL.md Raw
              </a>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
