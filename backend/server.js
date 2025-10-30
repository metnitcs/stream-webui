require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const { encrypt, decrypt } = require('./src/crypto');
const FFmpegManager = require('./src/ffmpegManager');
const { startScheduler } = require('./src/scheduler');

const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server, { cors: { origin: (process.env.CORS_ORIGIN||'').split(',') || true } });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const ff = new FFmpegManager(io);

app.use(cors({ origin: (process.env.CORS_ORIGIN||'').split(',') || true }));
app.use(express.json());

// --- Auth helpers ---
function auth(req,res,next){
  const hdr = req.headers.authorization || '';
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
  if (!token) return res.status(401).send('No token');
  try{
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.sub;
    next();
  }catch(e){ return res.status(401).send('Invalid token'); }
}

// --- Socket.io auth (room per user) ---
io.on('connection', socket => {
  socket.on('auth', token => {
    try{
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      const room = `user:${payload.sub}`;
      socket.join(room);
      socket.emit('authed', { ok: true, room });
    }catch{
      socket.emit('authed', { ok: false });
    }
  });
});

// --- Upload (auth) ---
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: (Number(process.env.MAX_UPLOAD_MB)||1024) * 1024 * 1024 },
  fileFilter: (_req, file, cb) => ((file.mimetype||'').startsWith('video/')) ? cb(null,true) : cb(new Error('Only video files'))
});

// --- Auth endpoints ---
app.post('/auth/register', async (req,res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).send('email & password required');
  const hash = await bcrypt.hash(password, 10);
  try{
    const { rows } = await pool.query('INSERT INTO users (email, password_hash) VALUES ($1,$2) RETURNING id,email', [email, hash]);
    const user = rows[0];
    const token = jwt.sign({ sub: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token });
  }catch(e){
    res.status(400).send('email already used');
  }
});

app.post('/auth/login', async (req,res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).send('email & password required');
  const { rows } = await pool.query('SELECT id,email,password_hash FROM users WHERE email=$1', [email]);
  if (!rows[0]) return res.status(401).send('invalid credentials');
  const ok = await bcrypt.compare(password, rows[0].password_hash);
  if (!ok) return res.status(401).send('invalid credentials');
  const token = jwt.sign({ sub: rows[0].id, email: rows[0].email }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token });
});

// --- Protected APIs ---

// upload video
app.post('/upload', auth, upload.single('video'), (req,res)=>{
  if (!req.file) return res.status(400).send('No file uploaded.');
  res.json({ filename: req.file.filename, path: req.file.path });
});

// channels
app.get('/channels', auth, async (req,res)=>{
  const { rows } = await pool.query('SELECT id,name,platform,rtmp_url,created_at FROM channels WHERE user_id=$1 ORDER BY id DESC',[req.userId]);
  res.json(rows);
});

app.post('/channels', auth, async (req,res)=>{
  const { name, rtmpUrl, streamKey } = req.body || {};
  if (!name || !streamKey) return res.status(400).send('name and streamKey required');
  const url = rtmpUrl || process.env.DEFAULT_RTMP_URL;
  const { rows: cntRows } = await pool.query('SELECT COUNT(*)::int c FROM channels WHERE user_id=$1',[req.userId]);
  if (cntRows[0].c >= 10) return res.status(400).send('Channel limit reached (10).');
  const enc = encrypt(streamKey);
  const { rows } = await pool.query(
    'INSERT INTO channels (user_id,name,platform,rtmp_url,stream_key_encrypted) VALUES ($1,$2,\'youtube\',$3,$4) RETURNING id,name,platform,rtmp_url,created_at',
    [req.userId, name, url, enc]
  );
  res.json(rows[0]);
});

app.put('/channels/:id', auth, async (req,res)=>{
  const id = Number(req.params.id);
  const { name, rtmpUrl, streamKey } = req.body || {};
  const { rows: own } = await pool.query('SELECT id,user_id FROM channels WHERE id=$1',[id]);
  if (!own[0] || own[0].user_id !== req.userId) return res.status(404).send('Channel not found');
  const sets=[]; const args=[]; let i=1;
  if (name){ sets.push(`name=$${i++}`); args.push(name); }
  if (rtmpUrl){ sets.push(`rtmp_url=$${i++}`); args.push(rtmpUrl); }
  if (streamKey){ sets.push(`stream_key_encrypted=$${i++}`); args.push(encrypt(streamKey)); }
  if (!sets.length) return res.status(400).send('No changes');
  args.push(id);
  const sql = `UPDATE channels SET ${sets.join(',')} WHERE id=$${i} RETURNING id,name,platform,rtmp_url,created_at`;
  const { rows } = await pool.query(sql, args);
  res.json(rows[0]);
});

// stream start/stop
app.post('/stream/start', auth, async (req,res)=>{
  const { file, channelIds, mode } = req.body || {};
  if (!file || !Array.isArray(channelIds) || channelIds.length===0) return res.status(400).send('file and channelIds[] required');
  const inputPath = path.join(__dirname, 'uploads', file);
  if (!fs.existsSync(inputPath)) return res.status(404).send('File not found');
  const { rows: chans } = await pool.query(
    'SELECT id,rtmp_url,stream_key_encrypted FROM channels WHERE user_id=$1 AND id = ANY($2::bigint[])',[req.userId, channelIds]
  );
  if (!chans.length) return res.status(400).send('No valid channels');
  const rtmpUrls = chans.map(c => `${c.rtmp_url}/${decrypt(c.stream_key_encrypted)}`);
  const runMode = (mode==='tee') ? 'tee' : 'per_channel';
  const { rows: act } = await pool.query(
    'INSERT INTO active_streams (user_id, mode, input_file, channel_ids) VALUES ($1,$2,$3,$4) RETURNING id',
    [req.userId, runMode, inputPath, channelIds]
  );
  const activeStreamId = act[0].id;
  try{
    if (runMode==='tee'){
      const pid = ff.startTee(activeStreamId, req.userId, inputPath, rtmpUrls);
      await pool.query('UPDATE active_streams SET pid=$1 WHERE id=$2',[pid, activeStreamId]);
    } else {
      ff.startPerChannel(activeStreamId, req.userId, inputPath, rtmpUrls);
    }
  }catch(e){
    await pool.query('DELETE FROM active_streams WHERE id=$1',[activeStreamId]);
    return res.status(500).send('Failed to start ffmpeg: '+e.message);
  }
  res.json({ ok:true, activeStreamId });
});

app.post('/stream/stop', auth, async (req,res)=>{
  const { activeStreamId } = req.body || {};
  if (!activeStreamId) return res.status(400).send('activeStreamId required');
  const { rows: act } = await pool.query('SELECT id,user_id,input_file FROM active_streams WHERE id=$1',[activeStreamId]);
  if (!act[0] || act[0].user_id !== req.userId) return res.status(404).send('Stream not found');
  ff.stop(activeStreamId);
  await pool.query('UPDATE active_streams SET stopped_at=now() WHERE id=$1',[activeStreamId]);
  res.json({ ok:true });
});

// schedules
app.get('/schedules', auth, async (req,res)=>{
  const { rows } = await pool.query('SELECT * FROM schedules WHERE user_id=$1 ORDER BY start_at DESC',[req.userId]);
  res.json(rows);
});

app.post('/schedules', auth, async (req,res)=>{
  const { file, channelIds, mode, startAt } = req.body || {};
  if (!file || !Array.isArray(channelIds) || !startAt) return res.status(400).send('file, channelIds[], startAt required');
  const inputPath = path.join(__dirname, 'uploads', file);
  const runMode = (mode==='tee') ? 'tee' : 'per_channel';
  const { rows } = await pool.query(
    'INSERT INTO schedules (user_id,input_file,channel_ids,mode,start_at) VALUES ($1,$2,$3,$4,$5) RETURNING *',
    [req.userId, inputPath, channelIds, runMode, startAt]
  );
  res.json(rows[0]);
});

// start scheduler
startScheduler(pool, async (s) => {
  // emulate starting a job from schedule record
  const { rows: chans } = await pool.query(
    'SELECT id,rtmp_url,stream_key_encrypted FROM channels WHERE user_id=$1 AND id = ANY($2::bigint[])',[s.user_id, s.channel_ids]
  );
  if (!chans.length) throw new Error('no channels');
  const rtmpUrls = chans.map(c => `${c.rtmp_url}/${decrypt(c.stream_key_encrypted)}`);
  const { rows: act } = await pool.query(
    'INSERT INTO active_streams (user_id, mode, input_file, channel_ids) VALUES ($1,$2,$3,$4) RETURNING id',
    [s.user_id, s.mode, s.input_file, s.channel_ids]
  );
  const activeStreamId = act[0].id;
  if (s.mode==='tee') {
    const pid = ff.startTee(activeStreamId, s.user_id, s.input_file, rtmpUrls);
    await pool.query('UPDATE active_streams SET pid=$1 WHERE id=$2',[pid, activeStreamId]);
  } else {
    ff.startPerChannel(activeStreamId, s.user_id, s.input_file, rtmpUrls);
  }
  return activeStreamId;
});

const PORT = Number(process.env.PORT)||5000;
server.listen(PORT, ()=> console.log(`Backend listening on http://0.0.0.0:${PORT}`));
