import express from 'express';
import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = 3001;
const SESSION_COOKIE = 'sid';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(rootDir, 'data');
fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(path.join(dataDir, 'game.db'));
db.exec('PRAGMA foreign_keys = ON;');
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    score INTEGER NOT NULL,
    treasure_found INTEGER NOT NULL,
    played_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS login_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    logged_in_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

const insertUser = db.prepare('INSERT INTO users (username, password_hash, salt) VALUES (?, ?, ?)');
const findUserByName = db.prepare('SELECT * FROM users WHERE username = ?');
const findUserById = db.prepare('SELECT id, username FROM users WHERE id = ?');
const insertLoginEvent = db.prepare('INSERT INTO login_events (user_id) VALUES (?)');
const insertScore = db.prepare('INSERT INTO scores (user_id, score, treasure_found) VALUES (?, ?, ?)');
const selectScores = db.prepare(
  'SELECT id, score, treasure_found, played_at FROM scores WHERE user_id = ? ORDER BY id DESC'
);
const selectScoreStats = db.prepare(
  'SELECT MAX(score) AS best, AVG(score) AS average, COUNT(*) AS games FROM scores WHERE user_id = ?'
);

// Session tokens live in memory, so a server restart logs everyone out.
const sessions = new Map();

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, userId);
  return token;
}

function readCookie(req, name) {
  const header = req.headers.cookie ?? '';
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

function currentUser(req) {
  const token = readCookie(req, SESSION_COOKIE);
  if (!token || !sessions.has(token)) return null;
  return findUserById.get(sessions.get(token)) ?? null;
}

function setSessionCookie(res, token) {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/`);
}

function requireUser(req, res, next) {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: '請先登入' });
  req.user = user;
  next();
}

const app = express();
app.use(express.json());

app.post('/api/register', (req, res) => {
  const username = String(req.body?.username ?? '').trim();
  const password = String(req.body?.password ?? '');

  if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) {
    return res.status(400).json({ error: '帳號需為 3-20 個英數字或底線' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: '密碼至少 6 個字元' });
  }
  if (findUserByName.get(username)) {
    return res.status(409).json({ error: '此帳號已被使用' });
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const result = insertUser.run(username, hashPassword(password, salt), salt);
  const userId = Number(result.lastInsertRowid);
  insertLoginEvent.run(userId);
  setSessionCookie(res, createSession(userId));
  res.status(201).json({ id: userId, username });
});

app.post('/api/login', (req, res) => {
  const username = String(req.body?.username ?? '').trim();
  const password = String(req.body?.password ?? '');
  const user = findUserByName.get(username);

  if (!user) {
    return res.status(401).json({ error: '帳號或密碼錯誤' });
  }
  const given = Buffer.from(hashPassword(password, user.salt), 'hex');
  const stored = Buffer.from(user.password_hash, 'hex');
  if (given.length !== stored.length || !crypto.timingSafeEqual(given, stored)) {
    return res.status(401).json({ error: '帳號或密碼錯誤' });
  }

  insertLoginEvent.run(user.id);
  setSessionCookie(res, createSession(user.id));
  res.json({ id: user.id, username: user.username });
});

app.post('/api/logout', (req, res) => {
  const token = readCookie(req, SESSION_COOKIE);
  if (token) sessions.delete(token);
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
  res.json({ ok: true });
});

app.get('/api/me', (req, res) => {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: '未登入' });
  res.json({ id: user.id, username: user.username });
});

app.post('/api/scores', requireUser, (req, res) => {
  const score = req.body?.score;
  const treasureFound = req.body?.treasureFound;

  // Treasure is +150 and skeleton is -80. Reachable scores are multiples of 10
  // between -10 (skeleton, skeleton, treasure) and 150. The range check allows
  // a little more room in case the scoring rules are changed later.
  if (!Number.isInteger(score) || score % 10 !== 0 || score < -160 || score > 150) {
    return res.status(400).json({ error: '分數不合法' });
  }
  if (typeof treasureFound !== 'boolean') {
    return res.status(400).json({ error: 'treasureFound 必須是布林值' });
  }

  insertScore.run(req.user.id, score, treasureFound ? 1 : 0);
  res.status(201).json({ ok: true });
});

app.get('/api/scores', requireUser, (req, res) => {
  const scores = selectScores.all(req.user.id).map(row => ({
    id: row.id,
    score: row.score,
    treasureFound: row.treasure_found === 1,
    playedAt: row.played_at,
  }));
  const stats = selectScoreStats.get(req.user.id);
  res.json({
    scores,
    games: Number(stats.games),
    best: stats.best ?? null,
    average: stats.average === null ? null : Math.round(stats.average),
  });
});

app.listen(PORT, () => {
  console.log(`API server running at http://localhost:${PORT}`);
});
