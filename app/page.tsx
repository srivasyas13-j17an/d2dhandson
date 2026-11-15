"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Status = "Not started" | "In progress" | "Completed" | "On hold";
type Priority = "Low" | "Medium" | "High";
type Task = {
  id: string; title: string; description: string; startDate: string; dueDate: string;
  priority: Priority; status: Status; progress: number; createdAt: string;
};
type TaskForm = Omit<Task, "id" | "createdAt">;
const STORAGE_KEY = "taskflow-tasks-v1";
const blank: TaskForm = {
  title: "", description: "", startDate: "", dueDate: "",
  priority: "Medium", status: "Not started", progress: 0
};
const statuses: Status[] = ["Not started", "In progress", "Completed", "On hold"];
const priorities: Priority[] = ["Low", "Medium", "High"];

function dateLabel(value: string) {
  return value ? new Date(value + "T00:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "Not set";
}
function remaining(value: string) {
  if (!value) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(value + "T00:00:00").getTime() - today.getTime()) / 86400000);
}

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [ready, setReady] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TaskForm>(blank);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");

  // Load once from this browser, then persist every change locally.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setTasks(JSON.parse(saved) as Task[]);
    } catch { setNotice("Could not read saved tasks from this browser."); }
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks, ready]);

  const stats = useMemo(() => ({
    total: tasks.length,
    active: tasks.filter(t => t.status === "In progress").length,
    completed: tasks.filter(t => t.status === "Completed").length,
    overdue: tasks.filter(t => t.status !== "Completed" && remaining(t.dueDate) !== null && remaining(t.dueDate)! < 0).length
  }), [tasks]);

  const visible = useMemo(() => tasks.filter(t => {
    const matchesStatus = filter === "All" || t.status === filter;
    const q = search.trim().toLowerCase();
    return matchesStatus && (!q || t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
  }).sort((a, b) => (a.dueDate || "9999").localeCompare(b.dueDate || "9999")), [tasks, filter, search]);

  function openNew() { setEditingId(null); setForm(blank); setShowForm(true); setNotice(""); }
  function edit(task: Task) {
    setEditingId(task.id);
    const { id, createdAt, ...data } = task;
    setForm(data); setShowForm(true); setNotice("");
  }
  function save(e: FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    if (form.startDate && form.dueDate && form.dueDate < form.startDate) {
      setNotice("Due date cannot be earlier than the start date."); return;
    }
    const data = { ...form, title: form.title.trim(), progress: form.status === "Completed" ? 100 : form.progress };
    if (editingId) setTasks(current => current.map(t => t.id === editingId ? { ...t, ...data } : t));
    else setTasks(current => [{ ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString() }, ...current]);
    setShowForm(false); setEditingId(null); setForm(blank); setNotice("");
  }
  function quickProgress(task: Task, progress: number) {
    const status: Status = progress === 100 ? "Completed" : progress > 0 ? "In progress" : "Not started";
    setTasks(current => current.map(t => t.id === task.id ? { ...t, progress, status } : t));
  }
  function remove(id: string) {
    if (window.confirm("Delete this task?")) setTasks(current => current.filter(t => t.id !== id));
  }
  function exportTasks() {
    const blob = new Blob([JSON.stringify(tasks, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "taskflow-backup.json"; a.click();
    URL.revokeObjectURL(url);
  }
  function importTasks(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!Array.isArray(parsed) || parsed.some(t => !t.id || !t.title)) throw new Error();
        setTasks(parsed); setNotice("Tasks imported successfully.");
      } catch { setNotice("That file is not a valid TaskFlow JSON backup."); }
      e.target.value = "";
    };
    reader.readAsText(file);
  }

  if (!ready) return <main style={{ padding: 40, textAlign: "center" }}>Loading your tasks…</main>;

  return <main style={{ minHeight: "100vh" }}>
    <header style={{ background: "white", borderBottom: "1px solid #e6eaf1" }}>
      <div style={{ maxWidth: 1100, margin: "auto", padding: "17px 22px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div><div style={{ color: "#4358c9", fontSize: 12, fontWeight: 800, letterSpacing: 3 }}>TASKFLOW</div><strong style={{ fontSize: 19 }}>Personal task manager</strong></div>
        <div style={{ display: "flex", gap: 8 }}><button className="btn muted" onClick={exportTasks}>Export backup</button><label className="btn muted" style={{ display: "inline-flex", alignItems: "center" }}>Import<input type="file" accept="application/json,.json" onChange={importTasks} style={{ display: "none" }} /></label></div>
      </div>
    </header>

    <div style={{ maxWidth: 1100, margin: "auto", padding: "32px 22px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 16, flexWrap: "wrap" }}>
        <div><p style={{ color: "#4358c9", fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>YOUR OVERVIEW</p><h1 style={{ fontSize: 32, margin: "6px 0" }}>Get things done.</h1><p style={{ color: "#667085", margin: 0 }}>Plan your work and keep track of progress.</p></div>
        <button className="btn primary" onClick={openNew}>＋ Add new task</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(145px,1fr))", gap: 12, marginTop: 26 }}>
        {([["Total tasks", stats.total], ["In progress", stats.active], ["Completed", stats.completed], ["Overdue", stats.overdue]] as const).map(([label, value]) =>
          <div className="panel" key={label} style={{ padding: 18 }}><div style={{ color: "#667085", fontSize: 13 }}>{label}</div><div style={{ fontSize: 30, fontWeight: 750, marginTop: 7 }}>{value}</div></div>
        )}
      </div>

      {showForm && <section className="panel" style={{ padding: 22, marginTop: 24 }}>
        <h2 style={{ marginTop: 0 }}>{editingId ? "Edit task" : "Create a task"}</h2>
        <form onSubmit={save} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
          <label style={{ gridColumn: "1 / -1", fontSize: 13, fontWeight: 600 }}>Task title *
            <input className="field" style={{ marginTop: 6 }} required maxLength={140} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Prepare monthly review" />
          </label>
          <label style={{ gridColumn: "1 / -1", fontSize: 13, fontWeight: 600 }}>Description
            <textarea className="field" style={{ marginTop: 6 }} rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Notes, deliverables or next steps…" />
          </label>
          <label style={{ fontSize: 13, fontWeight: 600 }}>Start date<input className="field" style={{ marginTop: 6 }} type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} /></label>
          <label style={{ fontSize: 13, fontWeight: 600 }}>Due date<input className="field" style={{ marginTop: 6 }} type="date" min={form.startDate || undefined} value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} /></label>
          <label style={{ fontSize: 13, fontWeight: 600 }}>Priority<select className="field" style={{ marginTop: 6 }} value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as Priority })}>{priorities.map(p => <option key={p}>{p}</option>)}</select></label>
          <label style={{ fontSize: 13, fontWeight: 600 }}>Status<select className="field" style={{ marginTop: 6 }} value={form.status} onChange={e => setForm({ ...form, status: e.target.value as Status, progress: e.target.value === "Completed" ? 100 : form.progress })}>{statuses.map(s => <option key={s}>{s}</option>)}</select></label>
          <label style={{ gridColumn: "1 / -1", fontSize: 13, fontWeight: 600 }}>Progress: {form.status === "Completed" ? 100 : form.progress}%
            <input style={{ display: "block", width: "100%", marginTop: 10, accentColor: "#4358c9" }} type="range" min="0" max="100" step="5" value={form.status === "Completed" ? 100 : form.progress} onChange={e => { const progress = Number(e.target.value); setForm({ ...form, progress, status: progress === 100 ? "Completed" : progress > 0 ? "In progress" : "Not started" }); }} />
          </label>
          <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8 }}><button className="btn primary" type="submit">{editingId ? "Save changes" : "Create task"}</button><button className="btn muted" type="button" onClick={() => setShowForm(false)}>Cancel</button></div>
        </form>
      </section>}

      {notice && <p style={{ marginTop: 16, padding: 12, borderRadius: 9, background: "#fff7e6", color: "#895b00", fontSize: 13 }}>{notice}</p>}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 32 }}>
        <h2 style={{ margin: 0 }}>Your tasks <span style={{ color: "#98a2b3", fontSize: 14, fontWeight: 400 }}>({visible.length})</span></h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input className="field" style={{ width: 210 }} placeholder="Search tasks…" value={search} onChange={e => setSearch(e.target.value)} />
          <select className="field" style={{ width: 160 }} value={filter} onChange={e => setFilter(e.target.value)}><option>All</option>{statuses.map(s => <option key={s}>{s}</option>)}</select>
        </div>
      </div>

      {visible.length === 0 ? <div className="panel" style={{ marginTop: 14, padding: 45, textAlign: "center" }}><div style={{ fontSize: 34 }}>✓</div><strong>No tasks found</strong><p style={{ color: "#667085", fontSize: 13 }}>Add a task to start organising your work.</p></div> :
        <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
          {visible.map(task => {
            const days = remaining(task.dueDate);
            const overdue = days !== null && days < 0 && task.status !== "Completed";
            return <article className="panel" key={task.id} style={{ padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 18, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 230 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><strong style={{ fontSize: 17 }}>{task.title}</strong><span style={{ borderRadius: 20, padding: "4px 9px", fontSize: 11, background: task.priority === "High" ? "#fff0f0" : task.priority === "Medium" ? "#fff7e6" : "#f0f2f5", color: task.priority === "High" ? "#b42318" : "#475467" }}>{task.priority} priority</span><span style={{ borderRadius: 20, padding: "4px 9px", fontSize: 11, background: "#eef1ff", color: "#4358c9" }}>{task.status}</span></div>
                  {task.description && <p style={{ color: "#667085", fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{task.description}</p>}
                  <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginTop: 12, color: overdue ? "#c43232" : "#667085", fontSize: 12 }}>
                    <span>Start: {dateLabel(task.startDate)}</span><span>Due: {dateLabel(task.dueDate)}{overdue ? ` · ${Math.abs(days!)} days overdue` : days === 0 && task.status !== "Completed" ? " · Due today" : days !== null && days > 0 && task.status !== "Completed" ? ` · ${days} days left` : ""}</span>
                  </div>
                  <div style={{ maxWidth: 560, marginTop: 17 }}><div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 7 }}><span style={{ color: "#667085" }}>Progress</span><strong>{task.progress}%</strong></div><div className="track"><div className="fill" style={{ width: task.progress + "%" }} /></div></div>
                </div>
                <div style={{ display: "flex", gap: 7, alignItems: "start" }}><button className="btn muted" onClick={() => edit(task)}>Edit</button><button className="btn muted" style={{ color: "#b42318" }} onClick={() => remove(task.id)}>Delete</button></div>
              </div>
              {task.status !== "Completed" && <div style={{ display: "flex", gap: 12, alignItems: "center", borderTop: "1px solid #f0f2f5", marginTop: 16, paddingTop: 13 }}><span style={{ fontSize: 12, color: "#667085", whiteSpace: "nowrap" }}>Update progress</span><input aria-label={"Progress for " + task.title} style={{ width: "100%", maxWidth: 350, accentColor: "#4358c9" }} type="range" min="0" max="100" step="5" value={task.progress} onChange={e => quickProgress(task, Number(e.target.value))} /><strong style={{ fontSize: 12 }}>{task.progress}%</strong></div>}
            </article>;
          })}
        </div>}
      <p style={{ color: "#98a2b3", fontSize: 11, textAlign: "center", marginTop: 30 }}>TaskFlow · Your tasks are saved in this browser.</p>
    </div>
  </main>;
}
