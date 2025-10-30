const { spawn } = require('child_process');

class FFmpegManager {
  constructor(io){
    this.io = io; // socket.io instance
    this.jobs = new Map(); // id -> { mode, proc|procs[], userId }
  }
  setIO(io){ this.io = io; }

  startPerChannel(activeStreamId, userId, inputPath, rtmpUrls, baseArgs){
    if (this.jobs.has(activeStreamId)) throw new Error('Job already exists');
    const procs = rtmpUrls.map((url) => {
      const args = [
        '-re','-i', inputPath,
        '-vcodec','libx264','-preset','veryfast',
        '-maxrate','3500k','-bufsize','7000k','-g','60',
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

  startTee(activeStreamId, userId, inputPath, rtmpUrls, baseArgs){
    if (this.jobs.has(activeStreamId)) throw new Error('Job already exists');
    const teeTargets = rtmpUrls.map(u => `[f=flv]${u}`).join('|');
    const args = [
      '-re','-i', inputPath,
      '-vcodec','libx264','-preset','veryfast',
      '-maxrate','3500k','-bufsize','7000k','-g','60',
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

  emitLog(userId, jobId, line){
    if (!this.io) return;
    this.io.to(`user:${userId}`).emit('ffmpeg_log', { jobId, line });
  }
}
module.exports = FFmpegManager;
