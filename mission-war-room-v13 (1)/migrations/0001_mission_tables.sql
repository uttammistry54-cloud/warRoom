CREATE TABLE mission_tasks (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  area TEXT NOT NULL DEFAULT 'Personal Discipline',
  priority TEXT NOT NULL DEFAULT 'P2',
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'planned',
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_mission_tasks_status ON mission_tasks(status);
CREATE TABLE mission_reflections (
  id BIGSERIAL PRIMARY KEY,
  reflection_date DATE NOT NULL DEFAULT CURRENT_DATE,
  truth_observed TEXT NOT NULL,
  action_taken TEXT NOT NULL DEFAULT '',
  next_step TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE TABLE mission_goals (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  area TEXT NOT NULL DEFAULT 'Mission',
  horizon TEXT NOT NULL DEFAULT '30 days',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT now()
);