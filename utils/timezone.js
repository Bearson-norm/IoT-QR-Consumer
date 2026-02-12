// Timezone utility for Indonesia (WIB = UTC+7)
function getIndonesiaDate() {
  const now = new Date();
  
  try {
    // Use Intl.DateTimeFormat for reliable timezone conversion
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    const parts = formatter.formatToParts(now);
    const year = parts.find(p => p.type === 'year').value;
    const month = parts.find(p => p.type === 'month').value;
    const day = parts.find(p => p.type === 'day').value;
    const hour = parts.find(p => p.type === 'hour').value;
    const minute = parts.find(p => p.type === 'minute').value;
    const second = parts.find(p => p.type === 'second').value;
    
    // Create date string in ISO format: YYYY-MM-DDTHH:mm:ss
    const dateString = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
    const indonesiaDate = new Date(dateString);
    
    // Validate the date
    if (isNaN(indonesiaDate.getTime())) {
      throw new Error('Invalid date created');
    }
    
    return indonesiaDate;
  } catch (error) {
    // Fallback: manual calculation using UTC offset
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const indonesiaTime = new Date(utc + (7 * 3600000)); // UTC+7
    
    // Validate fallback date
    if (isNaN(indonesiaTime.getTime())) {
      // Last resort: return current date (should never happen)
      console.error('Error creating Indonesia date, using current date as fallback');
      return new Date();
    }
    
    return indonesiaTime;
  }
}

function getIndonesiaDateString() {
  const now = new Date();
  // Get date components in Indonesia timezone (Asia/Jakarta)
  const options = { 
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  };
  const parts = now.toLocaleDateString('en-US', options).split('/');
  // Format: MM/DD/YYYY -> YYYY-MM-DD
  if (parts.length === 3) {
    const year = parts[2];
    const month = parts[0].padStart(2, '0');
    const day = parts[1].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  // Fallback: use UTC+7 calculation
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const indonesiaTime = new Date(utc + (7 * 3600000));
  return indonesiaTime.toISOString().split('T')[0];
}

function getIndonesiaDateTime() {
  return getIndonesiaDate();
}

function isResetTime() {
  const indonesiaDate = getIndonesiaDate();
  const hour = indonesiaDate.getHours();
  return hour === 6; // 6 AM WIB
}

function getNextResetTime() {
  const indonesiaDate = getIndonesiaDate();
  
  // Validate date
  if (isNaN(indonesiaDate.getTime())) {
    console.error('Invalid date in getNextResetTime, using fallback');
    // Return 6 AM tomorrow as fallback
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(6, 0, 0, 0);
    return tomorrow;
  }
  
  const nextReset = new Date(indonesiaDate);
  nextReset.setHours(6, 0, 0, 0);
  
  // If already past 6 AM today, set to 6 AM tomorrow
  if (indonesiaDate.getHours() >= 6) {
    nextReset.setDate(nextReset.getDate() + 1);
  }
  
  // Validate result
  if (isNaN(nextReset.getTime())) {
    console.error('Invalid nextReset date calculated, using fallback');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(6, 0, 0, 0);
    return tomorrow;
  }
  
  return nextReset;
}

module.exports = {
  getIndonesiaDate,
  getIndonesiaDateString,
  getIndonesiaDateTime,
  isResetTime,
  getNextResetTime
};

