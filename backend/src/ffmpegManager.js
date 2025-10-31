const { spawn } = require('child_process');

class FFmpegManager {
  constructor(io){
    this.io = io; // socket.io instance
    this.jobs = new Map(); // id -> { mode, proc|procs[], userId, status, errors, startTime }
    this.healthChecks = new Map(); // id -> interval
  }
  setIO(io){ this.io = io; }

  startPerChannel(activeStreamId, userId, inputConfig, rtmpUrls, baseArgs){
    if (this.jobs.has(activeStreamId)) throw new Error('Job already exists');
    const procs = rtmpUrls.map((url, index) => {
      const args = this.buildFFmpegArgs(inputConfig, url);
      
      // Debug: Log FFmpeg command
      console.log(`FFmpeg command for channel ${index + 1}:`, 'ffmpeg', args.join(' '));
      
      const p = spawn('ffmpeg', baseArgs ? baseArgs.concat(args) : args);
      p.stderr.on('data', d => this.handleFFmpegOutput(userId, activeStreamId, d.toString(), index));
      p.on('close', (c,s) => this.handleProcessClose(userId, activeStreamId, c, s, index));
      p.on('error', (err) => this.handleProcessError(userId, activeStreamId, err, index));
      return p;
    });
    
    const job = { 
      mode:'per_channel', 
      procs, 
      userId, 
      status: 'starting',
      errors: [],
      startTime: Date.now(),
      channels: rtmpUrls.length
    };
    this.jobs.set(activeStreamId, job);
    this.startHealthCheck(activeStreamId);
  }

  startTee(activeStreamId, userId, inputConfig, rtmpUrls, baseArgs){
    if (this.jobs.has(activeStreamId)) throw new Error('Job already exists');
    const teeTargets = rtmpUrls.map(u => `[f=flv]${u}`).join('|');
    const args = this.buildFFmpegArgs(inputConfig, null, teeTargets);
    
    // Debug: Log FFmpeg command
    console.log('FFmpeg tee command:', 'ffmpeg', args.join(' '));
    
    const proc = spawn('ffmpeg', baseArgs ? baseArgs.concat(args) : args);
    proc.stderr.on('data', d => this.handleFFmpegOutput(userId, activeStreamId, d.toString()));
    proc.on('close', (c,s)=> this.handleProcessClose(userId, activeStreamId, c, s));
    proc.on('error', (err) => this.handleProcessError(userId, activeStreamId, err));
    
    const job = { 
      mode:'tee', 
      proc, 
      userId, 
      status: 'starting',
      errors: [],
      startTime: Date.now(),
      channels: rtmpUrls.length
    };
    this.jobs.set(activeStreamId, job);
    this.startHealthCheck(activeStreamId);
    return proc.pid;
  }

  stop(activeStreamId){
    const job = this.jobs.get(activeStreamId);
    if (!job) return false;
    if (job.mode === 'tee') job.proc.kill('SIGINT');
    else job.procs.forEach(p => p.kill('SIGINT'));
    this.jobs.delete(activeStreamId);
    return true;
  }

  buildFFmpegArgs(inputConfig, rtmpUrl = null, teeTargets = null) {
    const args = ['-re'];
    
    // Handle different input types
    if (inputConfig.type === 'multi') {
      // Multi-input: multiple video and audio files
      if (inputConfig.videoPaths.length === 1 && inputConfig.audioPaths.length === 1) {
        // Simple case: single video + single audio
        args.push('-stream_loop', '-1', '-i', inputConfig.videoPaths[0]);
        args.push('-i', inputConfig.audioPaths[0]);
        args.push('-map', '0:v?', '-map', '1:a?');
        args.push('-shortest');
      } else {
        // Complex case: multiple files
        const videoPlaylist = this.createMultiPlaylist(inputConfig.activeStreamId, inputConfig.videoPaths, 'video');
        const audioPlaylist = this.createMultiPlaylist(inputConfig.activeStreamId, inputConfig.audioPaths, 'audio');
        
        args.push('-stream_loop', '-1', '-f', 'concat', '-safe', '0', '-i', videoPlaylist);
        args.push('-f', 'concat', '-safe', '0', '-i', audioPlaylist);
        args.push('-map', '0:v?', '-map', '1:a?');
        args.push('-shortest');
      }
    } else if (inputConfig.type === 'playlist') {
      // Playlist: multiple video files
      const playlistPath = this.createPlaylist(inputConfig.activeStreamId, inputConfig.paths);
      args.push('-f', 'concat', '-safe', '0', '-i', playlistPath);
    } else {
      // Single file
      args.push('-i', inputConfig.path);
    }
    
    // Video encoding settings
    args.push(
      '-vcodec', 'libx264', '-preset', 'veryfast',
      '-b:v', '800k', '-maxrate', '800k', '-bufsize', '1600k',
      '-g', '60', '-r', '30', '-vsync', '1'
    );
    
    // Audio encoding settings
    args.push('-acodec', 'aac', '-ar', '44100', '-b:a', '96k');
    
    // Output settings
    if (teeTargets) {
      args.push('-f', 'tee', teeTargets);
    } else if (rtmpUrl) {
      args.push('-f', 'flv', rtmpUrl);
    }
    
    return args;
  }
  
  createPlaylist(activeStreamId, inputPaths) {
    const fs = require('fs');
    const path = require('path');
    const playlistPath = path.join(__dirname, '..', 'temp', `playlist_${activeStreamId}.txt`);
    
    // Ensure temp directory exists
    const tempDir = path.dirname(playlistPath);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Create concat playlist file
    const playlistContent = inputPaths.map(p => `file '${p.replace(/'/g, "'\\''")}'
`).join('');
    fs.writeFileSync(playlistPath, playlistContent);
    
    return playlistPath;
  }
  
  createMultiPlaylist(activeStreamId, inputPaths, type) {
    const fs = require('fs');
    const path = require('path');
    const playlistPath = path.join(__dirname, '..', 'temp', `${type}_playlist_${activeStreamId}.txt`);
    
    // Ensure temp directory exists
    const tempDir = path.dirname(playlistPath);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Validate all input files exist
    const validPaths = [];
    for (const inputPath of inputPaths) {
      if (fs.existsSync(inputPath)) {
        validPaths.push(inputPath);
        console.log(`✓ ${type} file exists:`, inputPath);
      } else {
        console.error(`✗ ${type} file missing:`, inputPath);
        throw new Error(`${type} file not found: ${inputPath}`);
      }
    }
    
    if (validPaths.length === 0) {
      throw new Error(`No valid ${type} files found`);
    }
    
    // Create concat playlist file
    const playlistContent = validPaths.map(p => `file '${p.replace(/'/g, "'\\''")}'
`).join('');
    fs.writeFileSync(playlistPath, playlistContent);
    
    console.log(`Created ${type} playlist:`, playlistPath);
    console.log('Playlist content:', playlistContent);
    
    return playlistPath;
  }

  stop(activeStreamId){
    const job = this.jobs.get(activeStreamId);
    if (!job) return false;
    
    // Stop health check
    this.stopHealthCheck(activeStreamId);
    
    // Kill processes
    if (job.mode === 'tee') job.proc.kill('SIGINT');
    else job.procs.forEach(p => p.kill('SIGINT'));
    
    // Update status
    job.status = 'stopped';
    this.emitStatusUpdate(job.userId, activeStreamId, 'stopped', 'Stream stopped by user');
    
    this.jobs.delete(activeStreamId);
    
    // Clean up playlist file
    const fs = require('fs');
    const path = require('path');
    const playlistPath = path.join(__dirname, '..', 'temp', `playlist_${activeStreamId}.txt`);
    if (fs.existsSync(playlistPath)) {
      fs.unlinkSync(playlistPath);
    }
    
    return true;
  }

  handleFFmpegOutput(userId, activeStreamId, data, channelIndex = null) {
    const job = this.jobs.get(activeStreamId);
    if (!job) return;
    
    // Emit log
    this.emitLog(userId, activeStreamId, data);
    
    // Analyze output for errors and status
    this.analyzeFFmpegOutput(userId, activeStreamId, data, channelIndex);
  }
  
  analyzeFFmpegOutput(userId, activeStreamId, data, channelIndex) {
    const job = this.jobs.get(activeStreamId);
    if (!job) return;
    
    const line = data.toLowerCase();
    
    // Check for connection success
    if (line.includes('stream #0:0') && line.includes('video')) {
      if (job.status === 'starting') {
        job.status = 'streaming';
        this.emitStatusUpdate(userId, activeStreamId, 'streaming', 'Stream started successfully');
      }
    }
    
    // Check for errors
    if (line.includes('connection refused') || line.includes('network is unreachable')) {
      const error = `Connection failed${channelIndex !== null ? ` (Channel ${channelIndex + 1})` : ''}: Network error`;
      job.errors.push({ time: Date.now(), error, type: 'network' });
      this.emitStatusUpdate(userId, activeStreamId, 'error', error);
    }
    
    if (line.includes('rtmp') && (line.includes('failed') || line.includes('error'))) {
      const error = `RTMP error${channelIndex !== null ? ` (Channel ${channelIndex + 1})` : ''}: ${data.trim()}`;
      job.errors.push({ time: Date.now(), error, type: 'rtmp' });
      this.emitStatusUpdate(userId, activeStreamId, 'error', error);
    }
    
    if (line.includes('invalid') && line.includes('stream key')) {
      const error = `Invalid stream key${channelIndex !== null ? ` (Channel ${channelIndex + 1})` : ''}`;
      job.errors.push({ time: Date.now(), error, type: 'auth' });
      this.emitStatusUpdate(userId, activeStreamId, 'error', error);
    }
    
    if (line.includes('no space left') || line.includes('disk full')) {
      const error = 'Disk space full';
      job.errors.push({ time: Date.now(), error, type: 'disk' });
      this.emitStatusUpdate(userId, activeStreamId, 'error', error);
    }
  }
  
  handleProcessClose(userId, activeStreamId, code, signal, channelIndex = null) {
    const job = this.jobs.get(activeStreamId);
    if (!job) return;
    
    const message = `Process closed${channelIndex !== null ? ` (Channel ${channelIndex + 1})` : ''}: code=${code} signal=${signal}`;
    this.emitLog(userId, activeStreamId, message + '\n');
    
    if (code !== 0 && signal !== 'SIGINT') {
      const error = `Stream ended unexpectedly${channelIndex !== null ? ` (Channel ${channelIndex + 1})` : ''}: Exit code ${code}`;
      job.errors.push({ time: Date.now(), error, type: 'crash' });
      job.status = 'failed';
      this.emitStatusUpdate(userId, activeStreamId, 'failed', error);
    }
  }
  
  handleProcessError(userId, activeStreamId, err, channelIndex = null) {
    const job = this.jobs.get(activeStreamId);
    if (!job) return;
    
    const error = `Process error${channelIndex !== null ? ` (Channel ${channelIndex + 1})` : ''}: ${err.message}`;
    job.errors.push({ time: Date.now(), error, type: 'system' });
    job.status = 'failed';
    this.emitStatusUpdate(userId, activeStreamId, 'failed', error);
  }
  
  startHealthCheck(activeStreamId) {
    const interval = setInterval(() => {
      const job = this.jobs.get(activeStreamId);
      if (!job) {
        clearInterval(interval);
        return;
      }
      
      // Check if stream has been running too long without success
      if (job.status === 'starting' && Date.now() - job.startTime > 30000) {
        job.status = 'timeout';
        const error = 'Stream startup timeout (30s)';
        job.errors.push({ time: Date.now(), error, type: 'timeout' });
        this.emitStatusUpdate(job.userId, activeStreamId, 'timeout', error);
      }
      
      // Emit health status
      this.emitHealthStatus(job.userId, activeStreamId, {
        status: job.status,
        uptime: Date.now() - job.startTime,
        errors: job.errors.slice(-5), // Last 5 errors
        channels: job.channels
      });
    }, 5000); // Check every 5 seconds
    
    this.healthChecks.set(activeStreamId, interval);
  }
  
  stopHealthCheck(activeStreamId) {
    const interval = this.healthChecks.get(activeStreamId);
    if (interval) {
      clearInterval(interval);
      this.healthChecks.delete(activeStreamId);
    }
  }
  
  emitLog(userId, jobId, line){
    if (!this.io) return;
    this.io.to(`user:${userId}`).emit('ffmpeg_log', { jobId, line });
  }
  
  emitStatusUpdate(userId, jobId, status, message) {
    if (!this.io) return;
    this.io.to(`user:${userId}`).emit('stream_status', { 
      jobId, 
      status, 
      message, 
      timestamp: Date.now() 
    });
  }
  
  emitHealthStatus(userId, jobId, health) {
    if (!this.io) return;
    this.io.to(`user:${userId}`).emit('stream_health', { 
      jobId, 
      health, 
      timestamp: Date.now() 
    });
  }
  
  getJobStatus(activeStreamId) {
    const job = this.jobs.get(activeStreamId);
    if (!job) return null;
    
    return {
      status: job.status,
      uptime: Date.now() - job.startTime,
      errors: job.errors,
      channels: job.channels,
      mode: job.mode
    };
  }
}
module.exports = FFmpegManager;
