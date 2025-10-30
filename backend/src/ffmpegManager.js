const { spawn } = require('child_process');

class FFmpegManager {
  constructor(io){
    this.io = io; // socket.io instance
    this.jobs = new Map(); // id -> { mode, proc|procs[], userId }
  }
  setIO(io){ this.io = io; }

  startPerChannel(activeStreamId, userId, inputPaths, rtmpUrls, baseArgs){
    if (this.jobs.has(activeStreamId)) throw new Error('Job already exists');
    const input = Array.isArray(inputPaths) ? this.createPlaylist(activeStreamId, inputPaths) : inputPaths;
    const procs = rtmpUrls.map((url) => {
      const args = [
        '-re','-f', Array.isArray(inputPaths) ? 'concat' : 'auto', '-safe', '0', '-i', input,
        '-vcodec','libx264','-preset','veryfast',
        '-b:v','1000k','-maxrate','1500k','-bufsize','3000k','-g','60',
        '-r','30','-vsync','1',
        '-acodec','aac','-ar','44100','-b:a','128k',
        '-f','flv', url
      ];
      const p = spawn('ffmpeg', baseArgs ? baseArgs.concat(args) : args);
      p.stderr.on('data', d => this.emitLog(userId, activeStreamId, d.toString()));
      return p;
    });
    procs.forEach(p => p.on('close', (c,s) => this.emitLog(userId, activeStreamId, `proc closed code=${c} sig=${s}\n`)));
    this.jobs.set(activeStreamId, { mode:'per_channel', procs, userId });
  }

  startTee(activeStreamId, userId, inputPaths, rtmpUrls, baseArgs){
    if (this.jobs.has(activeStreamId)) throw new Error('Job already exists');
    const input = Array.isArray(inputPaths) ? this.createPlaylist(activeStreamId, inputPaths) : inputPaths;
    const teeTargets = rtmpUrls.map(u => `[f=flv]${u}`).join('|');
    const args = [
      '-re','-f', Array.isArray(inputPaths) ? 'concat' : 'auto', '-safe', '0', '-i', input,
      '-vcodec','libx264','-preset','veryfast',
      '-b:v','1000k','-maxrate','1500k','-bufsize','3000k','-g','60',
      '-r','30','-vsync','1',
      '-acodec','aac','-ar','44100','-b:a','128k',
      '-f','tee', teeTargets
    ];
    const proc = spawn('ffmpeg', baseArgs ? baseArgs.concat(args) : args);
    proc.stderr.on('data', d => this.emitLog(userId, activeStreamId, d.toString()));
    proc.on('close', (c,s)=> this.emitLog(userId, activeStreamId, `tee closed code=${c} sig=${s}\n`));
    this.jobs.set(activeStreamId, { mode:'tee', proc, userId });
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

  stop(activeStreamId){
    const job = this.jobs.get(activeStreamId);
    if (!job) return false;
    if (job.mode === 'tee') job.proc.kill('SIGINT');
    else job.procs.forEach(p => p.kill('SIGINT'));
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

  emitLog(userId, jobId, line){
    if (!this.io) return;
    this.io.to(`user:${userId}`).emit('ffmpeg_log', { jobId, line });
  }
}
module.exports = FFmpegManager;
