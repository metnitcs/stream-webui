const cron = require('node-cron');

function startScheduler(pool, startJob){
  console.log('[Scheduler] Initializing scheduler...');
  // run every minute
  cron.schedule('* * * * *', async () => {
    const now = new Date().toISOString();
    console.log(`[Scheduler] Checking at ${now}`);
    
    const { rows } = await pool.query(
      "SELECT * FROM schedules WHERE status='pending' AND start_at <= $1 ORDER BY start_at ASC LIMIT 5",
      [now]
    );
    
    console.log(`[Scheduler] Found ${rows.length} pending schedules`);
    
    for (const s of rows){
      try{
        console.log(`[Scheduler] Starting schedule ${s.id} at ${s.start_at}`);
        await pool.query("UPDATE schedules SET status='running' WHERE id=$1", [s.id]);
        const res = await startJob(s); // should start stream and return activeStreamId
        console.log(`[Scheduler] Schedule ${s.id} started with stream ID: ${res}`);
        // Don't set to 'done' immediately - let it run
        // Status will be updated when stream actually finishes
      }catch(err){
        console.error(`[Scheduler] Schedule ${s.id} failed:`, err.message);
        await pool.query("UPDATE schedules SET status='failed' WHERE id=$1", [s.id]);
      }
    }
  });
  
  console.log('[Scheduler] Started - checking every minute');
}

module.exports = { startScheduler };
