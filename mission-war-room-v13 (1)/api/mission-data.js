import { db } from 'hatchable';
export const access = 'admin';
export default async function (req, res) {
  if (req.method === 'GET') {
    const [tasks, goals, reflections] = await Promise.all([
      db.query("SELECT id, title, area, priority, due_date, status, created_at FROM mission_tasks ORDER BY CASE priority WHEN 'P0' THEN 0 WHEN 'P1' THEN 1 ELSE 2 END, created_at DESC LIMIT 100"),
      db.query("SELECT id, title, area, horizon, status, created_at FROM mission_goals ORDER BY CASE status WHEN 'active' THEN 0 ELSE 1 END, created_at DESC LIMIT 30"),
      db.query('SELECT id, reflection_date, truth_observed, action_taken, next_step, created_at FROM mission_reflections ORDER BY reflection_date DESC, created_at DESC LIMIT 7')
    ]);
    return res.json({ tasks: tasks.rows, goals: goals.rows, reflections: reflections.rows });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const body = req.body || {};
  const action = String(body.action || '');
  if (action === 'createTask') {
    const title = String(body.title || '').trim().slice(0, 180);
    if (!title) return res.status(400).json({ error: 'Task title is required.' });
    const area = String(body.area || 'Personal Discipline').slice(0, 80);
    const priority = ['P0', 'P1', 'P2'].includes(body.priority) ? body.priority : 'P2';
    const dueDate = /^\d{4}-\d{2}-\d{2}$/.test(String(body.due_date || '')) ? body.due_date : null;
    const result = await db.query('INSERT INTO mission_tasks (title, area, priority, due_date) VALUES ($1, $2, $3, $4) RETURNING id, title, area, priority, due_date, status, created_at', [title, area, priority, dueDate]);
    return res.status(201).json({ task: result.rows[0] });
  }
  if (action === 'toggleTask') {
    const id = Number(body.id);
    if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid task id.' });
    const result = await db.query("UPDATE mission_tasks SET status = CASE WHEN status = 'done' THEN 'planned' ELSE 'done' END, updated_at = now() WHERE id = $1 RETURNING id, status", [id]);
    if (!result.rowCount) return res.status(404).json({ error: 'Task not found.' });
    return res.json({ task: result.rows[0] });
  }
  if (action === 'deleteTask') {
    const id = Number(body.id);
    if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid task id.' });
    await db.query('DELETE FROM mission_tasks WHERE id = $1', [id]);
    return res.json({ ok: true });
  }
  if (action === 'createGoal') {
    const title = String(body.title || '').trim().slice(0, 180);
    if (!title) return res.status(400).json({ error: 'Goal title is required.' });
    const area = String(body.area || 'Mission').slice(0, 80);
    const horizon = String(body.horizon || '30 days').slice(0, 40);
    const result = await db.query('INSERT INTO mission_goals (title, area, horizon) VALUES ($1, $2, $3) RETURNING id, title, area, horizon, status', [title, area, horizon]);
    return res.status(201).json({ goal: result.rows[0] });
  }
  if (action === 'toggleGoal') {
    const id = Number(body.id);
    if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid goal id.' });
    const result = await db.query("UPDATE mission_goals SET status = CASE WHEN status = 'active' THEN 'paused' ELSE 'active' END WHERE id = $1 RETURNING id, status", [id]);
    if (!result.rowCount) return res.status(404).json({ error: 'Goal not found.' });
    return res.json({ goal: result.rows[0] });
  }
  if (action === 'saveReflection') {
    const truth = String(body.truth_observed || '').trim().slice(0, 3000);
    if (!truth) return res.status(400).json({ error: 'Write one honest observation first.' });
    const actionTaken = String(body.action_taken || '').trim().slice(0, 1500);
    const nextStep = String(body.next_step || '').trim().slice(0, 1500);
    const result = await db.query('INSERT INTO mission_reflections (truth_observed, action_taken, next_step) VALUES ($1, $2, $3) RETURNING id, reflection_date, truth_observed, action_taken, next_step, created_at', [truth, actionTaken, nextStep]);
    return res.status(201).json({ reflection: result.rows[0] });
  }
  return res.status(400).json({ error: 'Unknown action.' });
}