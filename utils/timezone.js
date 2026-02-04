// Timezone utility for Indonesia (WIB = UTC+7)
function getIndonesiaDate() {
  const now = new Date();
  // Get current time in Indonesia timezone (Asia/Jakarta = UTC+7)
  // Format: YYYY-MM-DD HH:mm:ss in Indonesia timezone
  const options = { 
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  };
  const dateString = now.toLocaleString('en-CA', options); // en-CA gives YYYY-MM-DD format
  // Parse the date string properly
  const parts = now.toLocaleString('en-US', options).split(', ');
  if (parts.length === 2) {
    const datePart = parts[0]; // MM/DD/YYYY
    const timePart = parts[1]; // HH:mm:ss
    const [month, day, year] = datePart.split('/');
    return new Date(`${year}-${month}-${day}T${timePart}`);
  }
  // Fallback: manual calculation
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const indonesiaTime = new Date(utc + (7 * 3600000)); // UTC+7
  return indonesiaTime;
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
  const nextReset = new Date(indonesiaDate);
  nextReset.setHours(6, 0, 0, 0);
  
  // If already past 6 AM today, set to 6 AM tomorrow
  if (indonesiaDate.getHours() >= 6) {
    nextReset.setDate(nextReset.getDate() + 1);
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

