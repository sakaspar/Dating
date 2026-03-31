#!/usr/bin/env python3
"""Thomas Task Board — simple web UI + API for task management."""
import json, os, time, http.server, socketserver, threading
from datetime import datetime
from pathlib import Path

TASKS_FILE = Path(__file__).parent / "tasks.json"
PORT = 8787

def load_tasks():
    return json.loads(TASKS_FILE.read_text())

def save_tasks(data):
    data["lastUpdated"] = datetime.now().isoformat()
    TASKS_FILE.write_text(json.dumps(data, indent=2))

HTML = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>🔧 Thomas Task Board</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
         background: #0f0f0f; color: #e0e0e0; min-height: 100vh; padding: 20px; }
  .header { text-align: center; margin-bottom: 30px; }
  .header h1 { font-size: 2em; color: #fff; }
  .header .subtitle { color: #888; font-size: 0.9em; margin-top: 5px; }
  .stats { display: flex; gap: 15px; justify-content: center; margin-bottom: 30px; flex-wrap: wrap; }
  .stat { padding: 12px 24px; border-radius: 10px; text-align: center; min-width: 100px; }
  .stat .count { font-size: 1.8em; font-weight: bold; }
  .stat .label { font-size: 0.8em; text-transform: uppercase; letter-spacing: 1px; }
  .stat.open { background: #1a1a2e; border: 1px solid #4a4ae8; }
  .stat.open .count { color: #7b7bff; }
  .stat.in-progress { background: #1a1a0e; border: 1px solid #8a8a2e; }
  .stat.in-progress .count { color: #e8e87b; }
  .stat.done { background: #0e1a0e; border: 1px solid #2e8a2e; }
  .stat.done .count { color: #7be87b; }
  .columns { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
  .column { background: #1a1a1a; border-radius: 12px; padding: 20px; }
  .column h2 { font-size: 1.1em; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #333; }
  .column h2.open-title { color: #7b7bff; border-color: #4a4ae8; }
  .column h2.progress-title { color: #e8e87b; border-color: #8a8a2e; }
  .column h2.done-title { color: #7be87b; border-color: #2e8a2e; }
  .task { background: #252525; border-radius: 8px; padding: 15px; margin-bottom: 10px;
          border-left: 4px solid #444; transition: transform 0.2s; }
  .task:hover { transform: translateX(4px); }
  .task.open { border-left-color: #4a4ae8; }
  .task.in-progress { border-left-color: #e8e87b; }
  .task.done { border-left-color: #2e8a2e; }
  .task .title { font-weight: 600; font-size: 1em; margin-bottom: 5px; }
  .task .desc { color: #999; font-size: 0.85em; margin-bottom: 8px; }
  .task .meta { display: flex; gap: 10px; font-size: 0.75em; color: #666; }
  .task .errors { margin-top: 8px; }
  .task .error { background: #2a1515; color: #ff6b6b; padding: 6px 10px; border-radius: 4px;
                 font-size: 0.8em; margin-top: 4px; font-family: monospace; }
  .add-form { background: #1a1a1a; border-radius: 12px; padding: 20px; margin-top: 20px; }
  .add-form h2 { margin-bottom: 15px; color: #fff; }
  .add-form input, .add-form textarea, .add-form select {
    width: 100%; padding: 10px; margin-bottom: 10px; border-radius: 6px;
    border: 1px solid #333; background: #252525; color: #e0e0e0; font-size: 0.95em; }
  .add-form textarea { min-height: 60px; resize: vertical; }
  .add-form button { background: #4a4ae8; color: #fff; border: none; padding: 12px 24px;
    border-radius: 6px; cursor: pointer; font-size: 1em; font-weight: 600; }
  .add-form button:hover { background: #5a5af8; }
  .actions { display: flex; gap: 5px; margin-top: 8px; }
  .actions button { padding: 4px 10px; border: 1px solid #444; border-radius: 4px;
    background: #333; color: #ccc; cursor: pointer; font-size: 0.75em; }
  .actions button:hover { background: #444; }
  .actions button.next { border-color: #4a4ae8; color: #7b7bff; }
  .actions button.next:hover { background: #2a2a4e; }
  .actions button.complete { border-color: #2e8a2e; color: #7be87b; }
  .actions button.complete:hover { background: #1a2e1a; }
  .actions button.reopen { border-color: #8a8a2e; color: #e8e87b; }
  .actions button.reopen:hover { background: #2e2e1a; }
  .actions button.delete { border-color: #8a2e2e; color: #e87b7b; }
  .actions button.delete:hover { background: #2e1a1a; }
  .last-updated { text-align: center; color: #555; font-size: 0.8em; margin-top: 20px; }
</style>
</head>
<body>
<div class="header">
  <h1>🔧 Thomas Task Board</h1>
  <div class="subtitle">Dating App Development</div>
</div>
<div class="stats" id="stats"></div>
<div class="columns">
  <div class="column"><h2 class="open-title">📋 Open</h2><div id="open-tasks"></div></div>
  <div class="column"><h2 class="progress-title">🔨 In Progress</h2><div id="progress-tasks"></div></div>
  <div class="column"><h2 class="done-title">✅ Done</h2><div id="done-tasks"></div></div>
</div>
<div class="add-form">
  <h2>➕ Add Task</h2>
  <input id="new-title" placeholder="Task title" />
  <textarea id="new-desc" placeholder="Description (optional)"></textarea>
  <button onclick="addTask()">Add Task</button>
</div>
<div class="last-updated" id="updated"></div>
<script>
const API = '';
async function fetchTasks() {
  const r = await fetch(API + '/api/tasks');
  return r.json();
}
async function addTask() {
  const title = document.getElementById('new-title').value.trim();
  if (!title) return;
  const desc = document.getElementById('new-desc').value.trim();
  await fetch(API + '/api/tasks', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({title, description: desc})
  });
  document.getElementById('new-title').value = '';
  document.getElementById('new-desc').value = '';
  render();
}
async function updateStatus(id, status) {
  await fetch(API + '/api/tasks/' + id, {
    method: 'PATCH',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({status})
  });
  render();
}
async function deleteTask(id) {
  if (!confirm('Delete this task?')) return;
  await fetch(API + '/api/tasks/' + id, {method: 'DELETE'});
  render();
}
function renderTask(t) {
  const errHtml = t.errors.length ? '<div class="errors">' + t.errors.map(e =>
    '<div class="error">⚠ ' + e + '</div>').join('') + '</div>' : '';
  let actions = '';
  if (t.status === 'open') actions = `<button class="next" onclick="updateStatus(${t.id},'in-progress')">→ Start</button>`;
  else if (t.status === 'in-progress') actions = `<button class="complete" onclick="updateStatus(${t.id},'done')">✓ Done</button><button class="reopen" onclick="updateStatus(${t.id},'open')">↩ Open</button>`;
  else actions = `<button class="reopen" onclick="updateStatus(${t.id},'open')">↩ Reopen</button>`;
  actions += `<button class="delete" onclick="deleteTask(${t.id})">✕</button>`;
  return `<div class="task ${t.status}">
    <div class="title">${t.title}</div>
    ${t.description ? '<div class="desc">' + t.description + '</div>' : ''}
    <div class="meta"><span>#${t.id}</span><span>${new Date(t.updated).toLocaleString()}</span></div>
    ${errHtml}
    <div class="actions">${actions}</div>
  </div>`;
}
async function render() {
  const data = await fetchTasks();
  const tasks = data.tasks;
  const open = tasks.filter(t => t.status === 'open');
  const prog = tasks.filter(t => t.status === 'in-progress');
  const done = tasks.filter(t => t.status === 'done');
  document.getElementById('stats').innerHTML =
    `<div class="stat open"><div class="count">${open.length}</div><div class="label">Open</div></div>` +
    `<div class="stat in-progress"><div class="count">${prog.length}</div><div class="label">In Progress</div></div>` +
    `<div class="stat done"><div class="count">${done.length}</div><div class="label">Done</div></div>`;
  document.getElementById('open-tasks').innerHTML = open.map(renderTask).join('') || '<p style="color:#555">No open tasks</p>';
  document.getElementById('progress-tasks').innerHTML = prog.map(renderTask).join('') || '<p style="color:#555">Nothing in progress</p>';
  document.getElementById('done-tasks').innerHTML = done.map(renderTask).join('') || '<p style="color:#555">No completed tasks</p>';
  document.getElementById('updated').textContent = 'Last updated: ' + new Date(data.lastUpdated).toLocaleString();
}
render();
setInterval(render, 30000);
</script>
</body>
</html>"""

class Handler(http.server.BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass  # quiet

    def _json(self, code, data):
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def _cors(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_OPTIONS(self):
        self._cors()

    def do_GET(self):
        if self.path == "/" or self.path == "/index.html":
            self.send_response(200)
            self.send_header("Content-Type", "text/html")
            self.end_headers()
            self.wfile.write(HTML.encode())
        elif self.path == "/api/tasks":
            self._json(200, load_tasks())
        else:
            self.send_error(404)

    def do_POST(self):
        if self.path == "/api/tasks":
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length))
            data = load_tasks()
            new_id = max((t["id"] for t in data["tasks"]), default=0) + 1
            now = datetime.now().isoformat()
            task = {
                "id": new_id,
                "title": body.get("title", "Untitled"),
                "description": body.get("description", ""),
                "status": "open",
                "created": now,
                "updated": now,
                "errors": []
            }
            data["tasks"].append(task)
            save_tasks(data)
            self._json(201, task)
        else:
            self.send_error(404)

    def do_PATCH(self):
        if self.path.startswith("/api/tasks/"):
            tid = int(self.path.split("/")[-1])
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length))
            data = load_tasks()
            for t in data["tasks"]:
                if t["id"] == tid:
                    if "status" in body:
                        t["status"] = body["status"]
                    if "errors" in body:
                        t["errors"] = body["errors"]
                    if "error" in body:
                        t["errors"].append(body["error"])
                    t["updated"] = datetime.now().isoformat()
                    save_tasks(data)
                    self._json(200, t)
                    return
            self.send_error(404)
        else:
            self.send_error(404)

    def do_DELETE(self):
        if self.path.startswith("/api/tasks/"):
            tid = int(self.path.split("/")[-1])
            data = load_tasks()
            data["tasks"] = [t for t in data["tasks"] if t["id"] != tid]
            save_tasks(data)
            self._json(200, {"deleted": tid})
        else:
            self.send_error(404)

if __name__ == "__main__":
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"🔧 Thomas Task Board running on http://localhost:{PORT}")
        httpd.serve_forever()
