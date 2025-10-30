const cron = require('node-cron');
const dayjs = require('dayjs');

function startScheduler(pool, startJob){
  // run every minute
  cron.schedule('* * * * *', async () => {
    const now = dayjs().toISOString();
    const { rows } = await pool.query(
      "SELECT * FROM schedules WHERE status='pending' AND start_at <= now() ORDER BY start_at ASC LIMIT 5"
    );
    for (const s of rows){
      try{
        await pool.query("UPDATE schedules SET status='running' WHERE id=$1", [s.id]);
        const res = await startJob(s); // should start stream and return activeStreamId
        await pool.query("UPDATE schedules SET status='done' WHERE id=$1", [s.id]);
      }catch(err){
        await pool.query("UPDATE schedules SET status='failed' WHERE id=$1", [s.id]);
      }
    }
  });
}

module.exports = { startScheduler };
