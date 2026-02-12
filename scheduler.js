// Daily reset scheduler - runs at 6 AM WIB every day
const { getIndonesiaDate, getNextResetTime, isResetTime } = require('./utils/timezone');

let resetCheckInterval = null;
let lastResetDate = null;

function startScheduler() {
  console.log('Scheduler started - Daily reset at 6:00 AM WIB');
  
  // Check every minute if it's reset time
  resetCheckInterval = setInterval(() => {
    try {
      const indonesiaDate = getIndonesiaDate();
      
      // Validate date before using
      if (isNaN(indonesiaDate.getTime())) {
        console.error('Invalid date returned from getIndonesiaDate(), skipping reset check');
        return;
      }
      
      const today = indonesiaDate.toISOString().split('T')[0];
      
      // Check if it's 6 AM and we haven't reset today
      if (isResetTime() && lastResetDate !== today) {
        performDailyReset();
        lastResetDate = today;
      }
    } catch (error) {
      console.error('Error in scheduler interval:', error);
    }
  }, 60000); // Check every minute

  // Also check immediately on startup
  try {
    const indonesiaDate = getIndonesiaDate();
    
    // Validate date before using
    if (!isNaN(indonesiaDate.getTime())) {
      const today = indonesiaDate.toISOString().split('T')[0];
      if (isResetTime() && lastResetDate !== today) {
        performDailyReset();
        lastResetDate = today;
      }
    } else {
      console.error('Invalid date returned from getIndonesiaDate() on startup');
    }
  } catch (error) {
    console.error('Error in scheduler startup check:', error);
  }

  // Log next reset time
  try {
    const nextReset = getNextResetTime();
    if (!isNaN(nextReset.getTime())) {
      console.log(`Next reset scheduled at: ${nextReset.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`);
    } else {
      console.error('Invalid next reset time calculated');
    }
  } catch (error) {
    console.error('Error calculating next reset time:', error);
  }
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







