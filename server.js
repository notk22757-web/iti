require('dotenv').config();
const express = require('express');
const path = require('path');
const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  })
});

const db = admin.firestore();
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  res.json({ ok: username === 'admin' && password === 'admin123' });
});

app.get('/api/questions', async (req, res) => {
  const snap = await db.collection('config').doc('questions').get();
  res.json(snap.exists ? snap.data().questions || [] : []);
});

app.post('/api/questions', async (req, res) => {
  await db.collection('config').doc('questions').set({
    questions: req.body.questions || []
  });
  res.json({ ok: true });
});

app.post('/api/submit', async (req, res) => {
  const { student, answers } = req.body;
  const snap = await db.collection('config').doc('questions').get();
  const questions = snap.exists ? snap.data().questions || [] : [];
  let score = 0;
  questions.forEach((q, i) => {
    if (answers[i] === q.answer) score++;
  });
  await db.collection('results').add({
    student, score, total: questions.length,
    submittedAt: new Date().toISOString()
  });
  res.json({ score, total: questions.length });
});

app.get('/api/results', async (req, res) => {
  const snap = await db.collection('results').orderBy('submittedAt', 'desc').get();
  res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log('Server running on port ' + port));
