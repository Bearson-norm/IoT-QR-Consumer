// Daily reset scheduler - runs at 6 AM WIB every day
const { getIndonesiaDate, getNextResetTime, isResetTime } = require('./utils/timezone');

let resetCheckInterval = null;
let lastResetDate = null;

function startScheduler() {
  console.log('Scheduler started - Daily reset at 6:00 AM WIB');
  
  // Check every minute if it's reset time
  resetCheckInterval = setInterval(() => {
    const indonesiaDate = getIndonesiaDate();
    const today = indonesiaDate.toISOString().split('T')[0];
    
    // Check if it's 6 AM and we haven't reset today
    if (isResetTime() && lastResetDate !== today) {
      performDailyReset();
      lastResetDate = today;
    }
  }, 60000); // Check every minute

  // Also check immediately on startup
  const indonesiaDate = getIndonesiaDate();
  const today = indonesiaDate.toISOString().split('T')[0];
  if (isResetTime() && lastResetDate !== today) {
    performDailyReset();
    lastResetDate = today;
  }

  // Log next reset time
  const nextReset = getNextResetTime();
  console.log(`Next reset scheduled at: ${nextReset.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`);
}

function performDailyReset() {
  console.log('Performing daily reset at 6:00 AM WIB...');
  // The reset is automatic - new day means new scan_date
  // No need to delete records, just log the reset
  const indonesiaDate = getIndonesiaDate();
  console.log(`Reset completed at ${indonesiaDate.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`);
}

function stopScheduler() {
  if (resetCheckInterval) {
    clearInterval(resetCheckInterval);
    resetCheckInterval = null;
    console.log('Scheduler stopped');
  }
}

module.exports = {
  startScheduler,
  stopScheduler
};







