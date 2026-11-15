"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { Priority, Task, TaskInput, TaskStatus } from "@/lib/types";

const emptyForm: TaskInput = {
  title: "", description: "", start_date: "", due_date: "",
  priority: "Medium", status: "Not started", progress: 0
};

const statuses: TaskStatus[] = ["Not started", "In progress", "Completed", "On hold"];
const priorities: Priority[] = ["Low", "Medium", "High"];

function prettyDate(value: string | null) {
  if (!value) return "No date set";
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    day: "numeric", month: "short", year: "numeric"
  });
}
function daysLeft(value: string | null) {
  if (!value) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(`${value}T00:00:00`);
  return Math.ceil((due.getTime() - today.getTime()) / 86400000);
}

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [authMessage, setAuthMessage] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TaskInput>(emptyForm);

  useEffect(() => {
    if (!supabase) { setAuthReady(true); return; }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session); setAuthReady(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => listener.subscription.unsubscribe();
  }, []);

  async function loadTasks() {
    if (!supabase || !session?.user) return;
    setLoading(true);
    const { data, error } = await supabase.from("tasks").select("*")
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });
    if (error) setMessage(error.message);
    else setTasks((data || []) as Task[]);
    setLoading(false);
  }

  useEffect(() => { if (session) loadTasks(); }, [session]);

  async function authenticate(e: FormEvent) {
    e.preventDefault(); setAuthMessage("");
    if (!supabase) return;
    const result = authMode === "signin"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    if (result.error) setAuthMessage(result.error.message);
    else if (authMode === "signup" && !result.data.session)
      setAuthMessage("Account created. Check your email to confirm, then sign in.");
  }

  async function saveTask(e: FormEvent) {
    e.preventDefault(); setMessage("");
    if (!supabase || !session?.user) return;
    if (!form.title.trim()) { setMessage("Please enter a task title."); return; }
    const payload = {
      ...form,
      title: form.title.trim(),
      description: form.description?.trim() || null,
      start_date: form.start_date || null,
      due_date: form.due_date || null,
      progress: form.status === "Completed" ? 100 : form.progress
    };
    const result = editingId
      ? await supabase.from("tasks").update(payload).eq("id", editingId).select().single()
      : await supabase.from("tasks").insert({ ...payload, user_id: session.user.id }).select().single();
    if (result.error) { setMessage(result.error.message); return; }
    setShowForm(false); setEditingId(null); setForm(emptyForm);
    await loadTasks();
  }

  function editTask(task: Task) {
    setEditingId(task.id);
    setForm({
      title: task.title, description: task.description || "",
      start_date: task.start_date || "", due_date: task.due_date || "",
      priority: task.priority, status: task.status, progress: task.progress
    });
    setShowForm(true);
  }

  async function updateProgress(task: Task, progress: number) {
    if (!supabase) return;
    const status: TaskStatus = progress === 100 ? "Completed" : progress > 0 ? "In progress" : "Not started";
    const { error } = await supabase.from("tasks").update({ progress, status }).eq("id", task.id);
    if (error) setMessage(error.message); else await loadTasks();
  }

  async function deleteTask(id: string) {
    if (!supabase || !window.confirm("Delete this task? This cannot be undone.")) return;
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) setMessage(error.message); else await loadTasks();
  }

  const visibleTasks = useMemo(() => tasks.filter(task => {
    const matchesFilter = filter === "All" || task.status === filter;
    const q = search.toLowerCase();
    return matchesFilter && (!q || task.title.toLowerCase().includes(q) || (task.description || "").toLowerCase().includes(q));
  }), [tasks, filter, search]);

  const stats = useMemo(() => ({
    total: tasks.length,
    active: tasks.filter(t => t.status === "In progress").length,
    completed: tasks.filter(t => t.status === "Completed").length,
    overdue: tasks.filter(t => t.status !== "Completed" && daysLeft(t.due_date) !== null && daysLeft(t.due_date)! < 0).length
  }), [tasks]);

  if (!authReady) return <main className="min-h-screen grid place-items-center text-slate-500">Loading TaskFlow…</main>;

  if (!isSupabaseConfigured) return (
    <main className="min-h-screen grid place-items-center p-6">
      <section className="panel max-w-xl p-8">
        <div className="text-sm font-bold tracking-widest text-indigo-600">TASKFLOW SETUP</div>
        <h1 className="mt-2 text-3xl font-bold">Connect your database</h1>
        <p className="mt-3 leading-7 text-slate-600">This app uses Supabase to securely store your tasks and sync them when you sign in from another device.</p>
        <ol className="mt-5 list-decimal space-y-2 pl-5 text-sm text-slate-700">
          <li>Create a free project at <a className="text-indigo-600 underline" href="https://supabase.com" target="_blank">supabase.com</a>.</li>
          <li>Run the SQL in <code>supabase/schema.sql</code> in the Supabase SQL Editor.</li>
          <li>Copy your Project URL and anon key into a local <code>.env.local</code> file using <code>.env.example</code>.</li>
          <li>Restart the development server. Add the same environment variables in Vercel before deploying.</li>
        </ol>
      </section>
    </main>
  );

  if (!session) return (
    <main className="min-h-screen grid place-items-center p-6">
      <section className="panel w-full max-w-md p-8">
        <div className="text-sm font-bold tracking-widest text-indigo-600">TASKFLOW</div>
        <h1 className="mt-2 text-3xl font-bold">Your work, in focus.</h1>
        <p className="mt-2 text-slate-500">Plan clearly. Track progress. Finish on time.</p>
        <form onSubmit={authenticate} className="mt-7 space-y-4">
          <label className="block text-sm font-medium">Email<input className="field mt-1" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></label>
          <label className="block text-sm font-medium">Password<input className="field mt-1" type="password" minLength={6} required value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" /></label>
          {authMessage && <p className="text-sm text-amber-700">{authMessage}</p>}
          <button className="btn btn-primary w-full" type="submit">{authMode === "signin" ? "Sign in" : "Create account"}</button>
        </form>
        <p className="mt-5 text-center text-sm text-slate-500">
          {authMode === "signin" ? "New to TaskFlow?" : "Already have an account?"}{" "}
          <button className="font-semibold text-indigo-600" onClick={() => { setAuthMode(authMode === "signin" ? "signup" : "signin"); setAuthMessage(""); }}>
            {authMode === "signin" ? "Create an account" : "Sign in"}
          </button>
        </p>
      </section>
    </main>
  );

  return (
    <main className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <div><div className="text-xs font-bold tracking-[.2em] text-indigo-600">TASKFLOW</div><div className="text-lg font-bold">Personal task manager</div></div>
          <div className="flex items-center gap-3"><span className="hidden text-sm text-slate-500 sm:block">{session.user.email}</span><button className="btn btn-muted text-sm" onClick={() => supabase?.auth.signOut()}>Sign out</button></div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div><p className="text-sm font-medium text-indigo-600">YOUR OVERVIEW</p><h1 className="mt-1 text-3xl font-bold">Good to see you.</h1><p className="mt-2 text-slate-500">A clear view of what needs to get done.</p></div>
          <button className="btn btn-primary" onClick={() => { setEditingId(null); setForm(emptyForm); setShowForm(true); }}>＋ Add new task</button>
        </div>

        <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            ["Total tasks", stats.total, "All tasks"],
            ["In progress", stats.active, "Currently active"],
            ["Completed", stats.completed, "Finished tasks"],
            ["Overdue", stats.overdue, "Past due date"]
          ].map(([label, value, hint]) => <div className="panel p-5" key={label}><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold">{value}</p><p className="mt-1 text-xs text-slate-400">{hint}</p></div>)}
        </div>

        {showForm && <div className="panel mt-7 p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between"><h2 className="text-xl font-bold">{editingId ? "Edit task" : "Create a task"}</h2><button className="text-slate-400 hover:text-slate-700" onClick={() => setShowForm(false)}>✕</button></div>
          <form onSubmit={saveTask} className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium sm:col-span-2">Task title *<input className="field mt-1" required maxLength={140} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Finalise quarterly business review" /></label>
            <label className="block text-sm font-medium sm:col-span-2">Description<textarea className="field mt-1" rows={2} value={form.description || ""} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Add context, next steps or notes…" /></label>
            <label className="block text-sm font-medium">Start date<input className="field mt-1" type="date" value={form.start_date || ""} onChange={e => setForm({ ...form, start_date: e.target.value })} /></label>
            <label className="block text-sm font-medium">Due date / deadline<input className="field mt-1" type="date" min={form.start_date || undefined} value={form.due_date || ""} onChange={e => setForm({ ...form, due_date: e.target.value })} /></label>
            <label className="block text-sm font-medium">Priority<select className="field mt-1" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as Priority })}>{priorities.map(p => <option key={p}>{p}</option>)}</select></label>
            <label className="block text-sm font-medium">Status<select className="field mt-1" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as TaskStatus, progress: e.target.value === "Completed" ? 100 : form.progress })}>{statuses.map(s => <option key={s}>{s}</option>)}</select></label>
            <label className="block text-sm font-medium sm:col-span-2">Progress: {form.status === "Completed" ? 100 : form.progress}%<input className="mt-3 w-full accent-indigo-600" type="range" min="0" max="100" step="5" value={form.status === "Completed" ? 100 : form.progress} onChange={e => setForm({ ...form, progress: Number(e.target.value), status: Number(e.target.value) === 100 ? "Completed" : Number(e.target.value) > 0 ? "In progress" : "Not started" })} /></label>
            <div className="flex gap-2 sm:col-span-2"><button className="btn btn-primary" type="submit">{editingId ? "Save changes" : "Create task"}</button><button className="btn btn-muted" type="button" onClick={() => setShowForm(false)}>Cancel</button></div>
          </form>
        </div>}

        <div className="mt-8 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <h2 className="text-xl font-bold">Your tasks <span className="text-sm font-normal text-slate-400">({visibleTasks.length})</span></h2>
          <div className="flex flex-col gap-2 sm:flex-row"><input className="field sm:w-56" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks…" /><select className="field sm:w-44" value={filter} onChange={e => setFilter(e.target.value)}><option>All</option>{statuses.map(s => <option key={s}>{s}</option>)}</select></div>
        </div>

        {message && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{message}</p>}
        {loading ? <p className="py-12 text-center text-slate-500">Loading your tasks…</p> : visibleTasks.length === 0 ? (
          <div className="panel mt-4 py-14 text-center"><div className="text-4xl">✓</div><h3 className="mt-3 font-semibold">No tasks found</h3><p className="mt-1 text-sm text-slate-500">Add a task to start planning your work.</p></div>
        ) : <div className="mt-4 grid gap-3">
          {visibleTasks.map(task => {
            const left = daysLeft(task.due_date);
            const overdue = left !== null && left < 0 && task.status !== "Completed";
            return <article key={task.id} className="panel p-5">
              <div className="flex flex-col justify-between gap-4 sm:flex-row">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-semibold">{task.title}</h3><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${task.priority === "High" ? "bg-rose-50 text-rose-700" : task.priority === "Medium" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{task.priority} priority</span><span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">{task.status}</span></div>
                  {task.description && <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{task.description}</p>}
                  <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500"><span>Start: {prettyDate(task.start_date)}</span><span className={overdue ? "font-semibold text-rose-600" : ""}>Due: {prettyDate(task.due_date)}{overdue ? ` · ${Math.abs(left!)} days overdue` : left === 0 && task.status !== "Completed" ? " · Due today" : left !== null && left > 0 && task.status !== "Completed" ? ` · ${left} days left` : ""}</span></div>
                  <div className="mt-4 max-w-xl"><div className="mb-2 flex justify-between text-xs"><span className="font-medium text-slate-600">Progress</span><span className="font-semibold text-slate-700">{task.progress}%</span></div><div className="progress-track"><div className="progress-fill" style={{ width: `${task.progress}%` }} /></div></div>
                </div>
                <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end sm:justify-start"><button className="btn btn-muted text-sm" onClick={() => editTask(task)}>Edit</button><button className="btn btn-muted text-sm text-rose-600" onClick={() => deleteTask(task.id)}>Delete</button></div>
              </div>
              {task.status !== "Completed" && <div className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-3"><span className="whitespace-nowrap text-xs text-slate-500">Quick update</span><input aria-label={`Update progress for ${task.title}`} className="w-full max-w-xs accent-indigo-600" type="range" min="0" max="100" step="5" value={task.progress} onChange={e => updateProgress(task, Number(e.target.value))} /><span className="w-10 text-right text-xs font-semibold text-slate-600">{task.progress}%</span></div>}
            </article>;
          })}
        </div>}
        <p className="mt-8 text-center text-xs text-slate-400">TaskFlow · Keep moving forward, one task at a time.</p>
      </div>
    </main>
  );
}
