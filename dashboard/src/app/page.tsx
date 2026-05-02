"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useEffect, useState, useMemo } from "react";
import { Plus, CheckCircle2, Circle, Clock, Loader2, Globe, Settings, Terminal, ListTodo, Copy, Check, Filter, Send, MessageSquare } from "lucide-react";
import { translations, Locale } from "@/lib/i18n";

export default function Home() {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState<"tasks" | "agents" | "skills" | "telegram" | "setup">("tasks");
  const [taskFilter, setTaskFilter] = useState<"all" | "open" | "processing" | "done">("all");
  const [tasks, setTasks] = useState<any[]>([]);
  const [availableSkills, setAvailableSkills] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({ title: "", body: "", priority: "P1", skill: "" });
  const [locale, setLocale] = useState<Locale>("zh");
  const [copied, setCopied] = useState<string | null>(null);
  const [tgConfig, setTgConfig] = useState({ botToken: "", chatId: "" });
  const [isSavingTg, setIsSavingTg] = useState(false);
  const [isTestingTg, setIsTestingTg] = useState(false);
  
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
      if (Array.isArray(data) && data.length > 0) {
        setAvailableSkills(data);
        setFormData(prev => ({ ...prev, skill: prev.skill || data[0] }));
      }
    } catch (err) { console.error(err); }
  };

  const fetchTgConfig = async () => {
    try {
      const res = await fetch("/api/telegram");
      const data = await res.json();
      if (data && !data.error) {
        setTgConfig({ botToken: data.botToken || "", chatId: data.chatId || "" });
      }
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    if (session) {
      fetchTasks();
      fetchSkills();
      fetchTgConfig();
    }
  }, [session]);

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      if (taskFilter === "all") return true;
      const labels = task.labels.map((l: any) => l.name);
      if (taskFilter === "open") return labels.includes("task") && task.state === "open";
      if (taskFilter === "processing") return labels.includes("task/processing");
      if (taskFilter === "done") return labels.includes("task/done");
      return true;
    });
  }, [tasks, taskFilter]);

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
        setFormData({ title: "", body: "", priority: "P1", skill: availableSkills[0] || "" });
        fetchTasks();
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSaveTgConfig = async () => {
    setIsSavingTg(true);
    try {
      const res = await fetch("/api/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tgConfig),
      });
      if (res.ok) {
        alert(locale === "en" ? "Telegram configuration saved!" : "Telegram 配置已保存！");
      } else {
        const data = await res.json();
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to save configuration");
    } finally {
      setIsSavingTg(false);
    }
  };

  const handleTestTgMessage = async () => {
    setIsTestingTg(true);
    try {
      const res = await fetch("/api/telegram/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tgConfig),
      });
      if (res.ok) {
        alert(locale === "en" ? "Test message sent!" : "测试消息已发送！");
      } else {
        const data = await res.json();
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to send test message");
    } finally {
      setIsTestingTg(false);
    }
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
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-gray-50">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">{t.welcome}</h1>
          <p className="mt-2 text-lg text-gray-600">{t.please_sign_in}</p>
        </div>
        <button
          onClick={() => signIn("github")}
          className="mt-4 flex items-center gap-3 rounded-xl bg-gray-900 px-8 py-4 text-lg font-bold text-white hover:bg-black transition-all shadow-xl hover:scale-105"
        >
          <Copy className="h-6 w-6" /> {t.sign_in}
        </button>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto max-w-5xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg text-white">
              <ListTodo className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 leading-tight">{t.title}</h1>
              <p className="text-xs text-gray-500">
                {t.connected_to} <span className="font-mono bg-gray-100 px-1 rounded">{process.env.NEXT_PUBLIC_REPO_OWNER || (session.user as any)?.name}/{process.env.NEXT_PUBLIC_REPO_NAME || "multi-agent-tasks"}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setLocale(locale === "en" ? "zh" : "en")}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              <Globe className="h-4 w-4" /> {locale === "en" ? "中文" : "English"}
            </button>
            <div className="h-8 w-px bg-gray-200"></div>
            <button onClick={() => signOut()} className="text-sm font-medium text-red-600 hover:underline">{t.sign_out}</button>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-5xl px-6 mt-8">
        <nav className="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-200 shadow-sm inline-flex">
          {[
            { id: "tasks", icon: ListTodo, label: t.tabs.tasks },
            { id: "agents", icon: Settings, label: t.tabs.agents },
            { id: "skills", icon: Terminal, label: t.tabs.skills },
            { id: "telegram", icon: MessageSquare, label: t.tabs.telegram },
            { id: "setup", icon: Globe, label: t.tabs.setup }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === tab.id ? "bg-blue-50 text-blue-600" : "text-gray-500 hover:bg-gray-50"}`}
            >
              <tab.icon className="h-4 w-4" /> {tab.label}
            </button>
          ))}
        </nav>

        <div className="mt-8">
          {activeTab === "tasks" && (
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-gray-200">
                  {["all", "open", "processing", "done"].map(f => (
                    <button
                      key={f}
                      onClick={() => setTaskFilter(f as any)}
                      className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${taskFilter === f ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-50"}`}
                    >
                      {t.tabs.sub[f as keyof typeof t.tabs.sub]}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setIsCreating(true)}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-blue-700 shadow-lg shadow-blue-200"
                >
                  <Plus className="h-4 w-4" /> {t.new_task}
                </button>
              </div>

              {isCreating && (
                <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-xl animate-in fade-in slide-in-from-top-4 duration-300">
                  <h2 className="text-xl font-bold mb-6">{t.create_title}</h2>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">{t.task_title}</label>
                        <input
                          type="text" required
                          className="w-full rounded-xl border border-gray-200 p-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-gray-700">{t.priority}</label>
                          <select
                            className="w-full rounded-xl border border-gray-200 p-3 bg-gray-50 outline-none"
                            value={formData.priority}
                            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                          >
                            <option value="P0">P0 (Critical)</option>
                            <option value="P1">P1 (High)</option>
                            <option value="P2">P2 (Normal)</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-gray-700">{t.skill}</label>
                          <select
                            className="w-full rounded-xl border border-gray-200 p-3 bg-gray-50 outline-none"
                            value={formData.skill}
                            onChange={(e) => setFormData({ ...formData, skill: e.target.value })}
                          >
                            {availableSkills.length > 0 ? (
                              availableSkills.map(s => <option key={s} value={s}>{s}</option>)
                            ) : (
                              <option value="">No skills found</option>
                            )}
                          </select>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700">{t.instructions}</label>
                      <textarea
                        required rows={5}
                        className="w-full rounded-xl border border-gray-200 p-4 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                        value={formData.body}
                        onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                      ></textarea>
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                      <button type="button" onClick={() => setIsCreating(false)} className="px-6 py-2.5 rounded-xl border border-gray-200 font-bold hover:bg-gray-50">{t.cancel}</button>
                      <button type="submit" disabled={loading} className="px-8 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-50">
                        {loading ? t.creating : t.create}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="space-y-4">
                {loading && !isCreating ? (
                  <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-blue-500" /></div>
                ) : filteredTasks.length === 0 ? (
                  <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
                    <Filter className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 font-medium">{t.no_tasks}</p>
                  </div>
                ) : (
                  filteredTasks.map((task) => {
                    const isDone = task.labels.some((l: any) => l.name === "task/done");
                    const isProcessing = task.labels.some((l: any) => l.name === "task/processing");
                    
                    return (
                      <div key={task.id} className="group relative flex items-start justify-between rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-blue-200 transition-all">
                        <div className="flex items-start gap-4">
                          <div className="mt-1">
                            {isDone ? (
                              <div className="bg-green-100 p-1.5 rounded-full"><CheckCircle2 className="h-5 w-5 text-green-600" /></div>
                            ) : isProcessing ? (
                              <div className="bg-blue-100 p-1.5 rounded-full"><Loader2 className="h-5 w-5 text-blue-600 animate-spin" /></div>
                            ) : (
                              <div className="bg-gray-100 p-1.5 rounded-full"><Circle className="h-5 w-5 text-gray-400" /></div>
                            )}
                          </div>
                          <div className="space-y-1">
                            <h3 className={`font-bold text-gray-900 ${isDone ? "line-through text-gray-400" : ""}`}>{task.title}</h3>
                            <div className="flex flex-wrap gap-2">
                              {task.labels.map((label: any) => (
                                <span key={label.name} className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider border ${
                                  label.name.includes("p0") ? "bg-red-50 text-red-600 border-red-100" :
                                  label.name.includes("p1") ? "bg-orange-50 text-orange-600 border-orange-100" :
                                  label.name.includes("processing") ? "bg-blue-50 text-blue-600 border-blue-100" :
                                  label.name.includes("done") ? "bg-green-50 text-green-600 border-green-100" :
                                  "bg-gray-50 text-gray-500 border-gray-100"
                                }`}>
                                  {label.name.replace('priority/', '').replace('skill/', '')}
                                </span>
                              ))}
                            </div>
                            <p className="text-sm text-gray-500 line-clamp-2 pt-1">{task.body}</p>
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end gap-2">
                          <span className="text-[11px] font-bold text-gray-400 flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(task.created_at).toLocaleDateString()}</span>
                        </div>
                        <a href={task.html_url} target="_blank" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-100 rounded transition-all">
                          <Globe className="h-4 w-4 text-gray-400" />
                        </a>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          )}

          {activeTab === "setup" && (
            <section className="space-y-6">
              <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-green-600 p-2 rounded-xl text-white">
                    <Globe className="h-6 w-6" />
                  </div>
                  <h2 className="text-xl font-bold">{t.setup.title}</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="p-6 rounded-2xl border border-gray-100 bg-gray-50 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-gray-900">{t.setup.webhook_status}</h3>
                        <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                      </div>
                      <p className="text-sm text-gray-600">{t.setup.webhook_desc}</p>
                      <button 
                        onClick={async () => {
                          setLoading(true);
                          try {
                            const res = await fetch("/api/setup", { method: "POST" });
                            if (res.ok) alert(t.setup.setup_success);
                          } catch (e) { console.error(e); }
                          finally { setLoading(false); }
                        }}
                        disabled={loading}
                        className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                      >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        {t.setup.auto_setup}
                      </button>
                    </div>

                    <div className="p-6 rounded-2xl border border-gray-100 bg-gray-50 space-y-4">
                      <h3 className="font-bold text-gray-900">{t.setup.security}</h3>
                      <div className={`flex items-center gap-2 text-sm font-medium ${locale === 'en' ? 'text-green-600' : 'text-orange-600'}`}>
                        <div className={`h-2 w-2 rounded-full bg-green-500`}></div>
                        {t.setup.secret_active}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="p-6 rounded-2xl border border-gray-100 bg-blue-50 space-y-4">
                      <h3 className="font-bold text-blue-900">GitHub Native Inbox</h3>
                      <p className="text-sm text-blue-800">Use GitHub's native notification system to monitor agent activities and mentions across all repositories.</p>
                      <a 
                        href="https://github.com/notifications" 
                        target="_blank"
                        className="w-full bg-white text-blue-600 border border-blue-200 font-bold py-3 rounded-xl hover:bg-blue-100 transition-all flex items-center justify-center gap-2"
                      >
                        <MessageSquare className="h-4 w-4" />
                        {t.setup.inbox_link}
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeTab === "telegram" && (
            <section className="space-y-6">
              <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-blue-600 p-2 rounded-xl text-white">
                    <Send className="h-6 w-6" />
                  </div>
                  <h2 className="text-xl font-bold">{t.telegram.title}</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="md:col-span-2 space-y-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700">{t.telegram.bot_token}</label>
                      <input 
                        type="password" 
                        placeholder="123456:ABC-DEF..." 
                        className="w-full rounded-xl border border-gray-200 p-3 bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500"
                        value={tgConfig.botToken}
                        onChange={(e) => setTgConfig({ ...tgConfig, botToken: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700">{t.telegram.channel_id}</label>
                      <input 
                        type="text" 
                        placeholder="-100123456789" 
                        className="w-full rounded-xl border border-gray-200 p-3 bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500"
                        value={tgConfig.chatId}
                        onChange={(e) => setTgConfig({ ...tgConfig, chatId: e.target.value })}
                      />
                    </div>
                    <div className="flex gap-4">
                      <button 
                        onClick={handleSaveTgConfig}
                        disabled={isSavingTg}
                        className="flex-1 bg-gray-900 text-white font-bold py-3 rounded-xl hover:bg-black transition-all flex items-center justify-center gap-2"
                      >
                        {isSavingTg ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        {t.agents.save}
                      </button>
                      <button 
                        onClick={handleTestTgMessage}
                        disabled={isTestingTg}
                        className="px-6 py-3 border border-gray-200 rounded-xl font-bold hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                      >
                        {isTestingTg ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        {t.telegram.test}
                      </button>
                    </div>
                  </div>

                  <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
                    <h3 className="font-bold text-blue-900 mb-4">{t.telegram.guide}</h3>
                    <ul className="space-y-4 text-sm text-blue-800">
                      <li className="flex gap-2">
                        <span className="font-black">1.</span>
                        <span>{t.telegram.step1}</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="font-black">2.</span>
                        <span>{t.telegram.step2}</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="font-black">3.</span>
                        <span>{t.telegram.step3}</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeTab === "agents" && (
            <section className="space-y-6">
              <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
                <h2 className="text-xl font-bold mb-2">{t.agents.title}</h2>
                <p className="text-sm text-gray-500 mb-8 font-medium">此配置将存储于仓库的 <code className="bg-gray-100 px-1 rounded">agents.json</code> 中。</p>
                <form className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700">{t.agents.name}</label>
                      <input type="text" placeholder="e.g. 小溪" className="w-full rounded-xl border border-gray-200 p-3 bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700">{t.agents.role}</label>
                      <select className="w-full rounded-xl border border-gray-200 p-3 bg-gray-50 outline-none">
                        <option value="commander">指挥官 (Commander)</option>
                        <option value="executor">执行者 (Executor)</option>
                        <option value="collector">汇总者 (Collector)</option>
                      </select>
                    </div>
                  </div>
                  <button disabled className="px-8 py-3 rounded-xl bg-gray-900 text-white font-bold opacity-50 cursor-not-allowed transition-all">
                    {t.agents.save} (Coming Soon)
                  </button>
                </form>
              </div>
            </section>
          )}

          {activeTab === "skills" && (
            <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {availableSkills.map(skill => (
                <div key={skill} className="group rounded-2xl border border-gray-200 bg-white p-8 shadow-sm hover:shadow-lg hover:border-blue-200 transition-all flex flex-col">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-blue-50 p-2 rounded-xl">
                      <Terminal className="h-6 w-6 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-black text-gray-900 capitalize tracking-tight">{skill.replace(/-/g, ' ')}</h3>
                  </div>
                  
                  <p className="text-xs text-gray-400 mb-6 font-mono bg-gray-50 p-2 rounded">/skills/{skill}</p>
                  
                  <div className="mt-auto space-y-4">
                    <div className="p-4 bg-gray-900 rounded-xl">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">{t.skills.install}</span>
                        <button 
                          onClick={() => copyToClipboard(`curl -sSL https://${window.location.host}/install.sh | bash -s -- ${skill}`, skill)}
                          className="text-gray-400 hover:text-white p-1 hover:bg-gray-800 rounded transition-all"
                        >
                          {copied === skill ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        </button>
                      </div>
                      <code className="text-[11px] text-blue-400 break-all block font-mono leading-relaxed">
                        curl -sSL https://{typeof window !== 'undefined' ? window.location.host : '...'}/install.sh | bash -s -- ${skill}
                      </code>
                    </div>
                  </div>
                </div>
              ))}
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
