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
const io = require('socket.io')(server, { 
  cors: { 
    origin: process.env.CORS_ORIGIN || 'http://localhost:8080',
    methods: ['GET', 'POST'],
    credentials: true
  }
});
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const ff = new FFmpegManager(io);

app.use(cors({ 
  origin: process.env.CORS_ORIGIN || 'http://localhost:8080',
  credentials: true
}));
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
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const userDir = path.join('uploads', `user_${req.userId}`);
      if (!fs.existsSync(userDir)) {
        fs.mkdirSync(userDir, { recursive: true });
      }
      cb(null, userDir);
    },
    filename: (req, file, cb) => {
      const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
      cb(null, uniqueName);
    }
  }),
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

app.post('/auth/change-password', auth, async (req,res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) return res.status(400).send('currentPassword & newPassword required');
  if (newPassword.length < 6) return res.status(400).send('New password must be at least 6 characters');
  
  const { rows } = await pool.query('SELECT password_hash FROM users WHERE id=$1', [req.userId]);
  if (!rows[0]) return res.status(404).send('User not found');
  
  const validCurrent = await bcrypt.compare(currentPassword, rows[0].password_hash);
  if (!validCurrent) return res.status(401).send('Current password is incorrect');
  
  const newHash = await bcrypt.hash(newPassword, 10);
  await pool.query('UPDATE users SET password_hash=$1 WHERE id=$2', [newHash, req.userId]);
  
  res.json({ ok: true });
});

// --- Protected APIs ---

// upload video
app.post('/upload', auth, upload.single('video'), (req,res)=>{
  if (!req.file) return res.status(400).send('No file uploaded.');
  res.json({ 
    filename: req.file.filename, 
    path: req.file.path,
    originalName: req.file.originalname,
    size: req.file.size
  });
});

// get uploaded files
app.get('/uploaded-files', auth, (req,res)=>{
  try {
    const userDir = path.join(__dirname, 'uploads', `user_${req.userId}`);
    if (!fs.existsSync(userDir)) {
      return res.json([]);
    }
    
    const files = fs.readdirSync(userDir)
      .filter(file => {
        const filePath = path.join(userDir, file);
        return fs.statSync(filePath).isFile();
      })
      .map(file => {
        const filePath = path.join(userDir, file);
        const stats = fs.statSync(filePath);
        return {
          filename: file,
          originalName: file,
          size: stats.size,
          uploadedAt: stats.mtime
        };
      })
      .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
    
    res.json(files);
  } catch (error) {
    res.status(500).send('Failed to read uploaded files');
  }
});

// download file
app.get('/download-file/:filename', auth, (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'uploads', `user_${req.userId}`, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('File not found');
    }
    
    res.download(filePath, filename);
  } catch (error) {
    res.status(500).send('Failed to download file');
  }
});

// delete file
app.delete('/delete-file/:filename', auth, (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'uploads', `user_${req.userId}`, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('File not found');
    }
    
    fs.unlinkSync(filePath);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).send('Failed to delete file');
  }
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

app.delete('/channels/:id', auth, async (req,res)=>{
  const id = Number(req.params.id);
  const { rows: own } = await pool.query('SELECT id,user_id FROM channels WHERE id=$1',[id]);
  if (!own[0] || own[0].user_id !== req.userId) return res.status(404).send('Channel not found');
  await pool.query('DELETE FROM channels WHERE id=$1',[id]);
  res.json({ ok: true });
});

// stream start/stop
app.post('/stream/start', auth, async (req,res)=>{
  const { files, channelIds, mode } = req.body || {};
  // Support both single file (backward compatibility) and multiple files
  const fileList = Array.isArray(files) ? files : (files ? [files] : [req.body.file].filter(Boolean));
  if (!fileList.length || !Array.isArray(channelIds) || channelIds.length===0) return res.status(400).send('files[] and channelIds[] required');
  
  // Validate all files exist
  const inputPaths = [];
  for (const file of fileList) {
    const inputPath = path.join(__dirname, 'uploads', `user_${req.userId}`, file);
    if (!fs.existsSync(inputPath)) return res.status(404).send(`File not found: ${file}`);
    inputPaths.push(inputPath);
  }
  
  const { rows: chans } = await pool.query(
    'SELECT id,rtmp_url,stream_key_encrypted FROM channels WHERE user_id=$1 AND id = ANY($2::bigint[])',[req.userId, channelIds]
  );
  if (!chans.length) return res.status(400).send('No valid channels');
  const rtmpUrls = chans.map(c => `${c.rtmp_url}/${decrypt(c.stream_key_encrypted)}`);
  const runMode = (mode==='tee') ? 'tee' : 'per_channel';
  const { rows: act } = await pool.query(
    'INSERT INTO active_streams (user_id, mode, input_file, channel_ids) VALUES ($1,$2,$3,$4) RETURNING id',
    [req.userId, runMode, JSON.stringify(fileList), channelIds]
  );
  const activeStreamId = act[0].id;
  try{
    if (runMode==='tee'){
      const pid = ff.startTee(activeStreamId, req.userId, inputPaths, rtmpUrls);
      await pool.query('UPDATE active_streams SET pid=$1 WHERE id=$2',[pid, activeStreamId]);
    } else {
      ff.startPerChannel(activeStreamId, req.userId, inputPaths, rtmpUrls);
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
  
  // Update any running schedules to done status
  await pool.query("UPDATE schedules SET status='done' WHERE user_id=$1 AND status='running'", [req.userId]);
  
  res.json({ ok:true });
});

// get active streams
app.get('/active-streams', auth, async (req,res)=>{
  const { rows } = await pool.query('SELECT id,mode,input_file,channel_ids,started_at FROM active_streams WHERE user_id=$1 AND stopped_at IS NULL ORDER BY id DESC',[req.userId]);
  
  // Add health status from FFmpegManager
  const streamsWithHealth = rows.map(stream => {
    const health = ff.getJobStatus(stream.id);
    return {
      ...stream,
      health: health || { status: 'unknown', uptime: 0, errors: [], channels: 0 }
    };
  });
  
  res.json(streamsWithHealth);
});

// get stream health status
app.get('/stream-health/:id', auth, async (req,res)=>{
  const streamId = Number(req.params.id);
  const { rows } = await pool.query('SELECT user_id FROM active_streams WHERE id=$1', [streamId]);
  
  if (!rows[0] || rows[0].user_id !== req.userId) {
    return res.status(404).send('Stream not found');
  }
  
  const health = ff.getJobStatus(streamId);
  if (!health) {
    return res.status(404).send('Stream not active');
  }
  
  res.json(health);
});

// schedules
app.get('/schedules', auth, async (req,res)=>{
  const { rows } = await pool.query('SELECT * FROM schedules WHERE user_id=$1 ORDER BY start_at DESC',[req.userId]);
  res.json(rows);
});

app.post('/schedules', auth, async (req,res)=>{
  const { files, channelIds, mode, startAt } = req.body || {};
  // Support both single file (backward compatibility) and multiple files
  const fileList = Array.isArray(files) ? files : (files ? [files] : [req.body.file].filter(Boolean));
  if (!fileList.length || !Array.isArray(channelIds) || !startAt) return res.status(400).send('files[], channelIds[], startAt required');
  
  // Validate all files exist
  for (const file of fileList) {
    const inputPath = path.join(__dirname, 'uploads', `user_${req.userId}`, file);
    if (!fs.existsSync(inputPath)) return res.status(404).send(`File not found: ${file}`);
  }
  
  const runMode = (mode==='tee') ? 'tee' : 'per_channel';
  const { rows } = await pool.query(
    'INSERT INTO schedules (user_id,input_file,channel_ids,mode,start_at) VALUES ($1,$2,$3,$4,$5) RETURNING *',
    [req.userId, JSON.stringify(fileList), channelIds, runMode, startAt]
  );
  res.json(rows[0]);
});

app.delete('/schedules/:id', auth, async (req,res)=>{
  const id = Number(req.params.id);
  const { rows: own } = await pool.query('SELECT id,user_id,status FROM schedules WHERE id=$1',[id]);
  if (!own[0] || own[0].user_id !== req.userId) return res.status(404).send('Schedule not found');
  if (own[0].status === 'running') return res.status(400).send('Cannot delete running schedule');
  await pool.query('DELETE FROM schedules WHERE id=$1',[id]);
  res.json({ ok: true });
});

// start scheduler
startScheduler(pool, async (s) => {
  // emulate starting a job from schedule record
  const { rows: chans } = await pool.query(
    'SELECT id,rtmp_url,stream_key_encrypted FROM channels WHERE user_id=$1 AND id = ANY($2::bigint[])',[s.user_id, s.channel_ids]
  );
  if (!chans.length) throw new Error('no channels');
  const rtmpUrls = chans.map(c => `${c.rtmp_url}/${decrypt(c.stream_key_encrypted)}`);
  
  // Parse input_file - could be single file path or JSON array
  let inputPaths;
  try {
    inputPaths = JSON.parse(s.input_file).map(file => path.join(__dirname, 'uploads', `user_${s.user_id}`, file));
  } catch {
    inputPaths = s.input_file; // backward compatibility - single file path
  }
  
  const { rows: act } = await pool.query(
    'INSERT INTO active_streams (user_id, mode, input_file, channel_ids) VALUES ($1,$2,$3,$4) RETURNING id',
    [s.user_id, s.mode, s.input_file, s.channel_ids]
  );
  const activeStreamId = act[0].id;
  if (s.mode==='tee') {
    const pid = ff.startTee(activeStreamId, s.user_id, inputPaths, rtmpUrls);
    await pool.query('UPDATE active_streams SET pid=$1 WHERE id=$2',[pid, activeStreamId]);
  } else {
    ff.startPerChannel(activeStreamId, s.user_id, inputPaths, rtmpUrls);
  }
  return activeStreamId;
});

const PORT = Number(process.env.BACKEND_PORT)||3001;
server.listen(PORT, ()=> console.log(`Backend listening on http://0.0.0.0:${PORT}`));
