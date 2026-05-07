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

// Get Indonesia "business date" string (YYYY-MM-DD)
// The business day resets at 6 AM WIB, not midnight.
// Before 6 AM WIB -> still counts as previous day
// After/at 6 AM WIB -> counts as current day
function getIndonesiaBusinessDateString() {
  const now = new Date();
  const RESET_HOUR = 6; // 6 AM WIB
  
  try {
    // Get current Indonesia time components
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    
    const parts = formatter.formatToParts(now);
    const year = parseInt(parts.find(p => p.type === 'year').value);
    const month = parseInt(parts.find(p => p.type === 'month').value);
    const day = parseInt(parts.find(p => p.type === 'day').value);
    const hour = parseInt(parts.find(p => p.type === 'hour').value);
    
    // If before reset hour (6 AM), use previous day's date
    if (hour < RESET_HOUR) {
      const prevDate = new Date(year, month - 1, day);
      prevDate.setDate(prevDate.getDate() - 1);
      const pYear = prevDate.getFullYear();
      const pMonth = String(prevDate.getMonth() + 1).padStart(2, '0');
      const pDay = String(prevDate.getDate()).padStart(2, '0');
      return `${pYear}-${pMonth}-${pDay}`;
    }
    
    // At or after reset hour, use current date
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  } catch (error) {
    // Fallback: manual UTC+7 calculation
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const indonesiaTime = new Date(utc + (7 * 3600000));
    
    if (indonesiaTime.getHours() < RESET_HOUR) {
      indonesiaTime.setDate(indonesiaTime.getDate() - 1);
    }
    
    return indonesiaTime.toISOString().split('T')[0];
  }
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

/** YYYY-MM-DD + delta calendar days (UTC date math, no DST). */
function addCalendarDaysYmd(ymd, deltaDays) {
  const part = String(ymd || '').split('T')[0].split(' ')[0];
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(part);
  if (!m) return part;
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10) - 1;
  const d = parseInt(m[3], 10);
  const dt = new Date(Date.UTC(y, mo, d));
  if (isNaN(dt.getTime())) return part;
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  return dt.toISOString().slice(0, 10);
}

function pgDateOrStringToYmd(value) {
  if (value == null || value === '') return '';
  if (typeof value === 'string') {
    const m = value.match(/^(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : value.split('T')[0].split(' ')[0];
  }
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return '';
    // Sama seperti routes/report.js pgDateToYyyyMmDd: jangan pakai toISOString() untuk DATE dari pg
    // (sering jadi shift satu hari vs kalender kolom reporting).
    const y = value.getFullYear();
    const mo = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${mo}-${d}`;
  }
  const s = String(value);
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : s.split('T')[0].split(' ')[0];
}

/**
 * Kalender & jam di Asia/Jakarta untuk satu instant (scan_time dari DB).
 */
function getWibCalendarYmdAndHour(scanTime) {
  const d = scanTime instanceof Date ? scanTime : new Date(scanTime);
  if (isNaN(d.getTime())) return null;
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false
  });
  const parts = formatter.formatToParts(d);
  const y = parts.find((p) => p.type === 'year').value;
  const mo = parts.find((p) => p.type === 'month').value.padStart(2, '0');
  const day = parts.find((p) => p.type === 'day').value.padStart(2, '0');
  const hour = parseInt(parts.find((p) => p.type === 'hour').value, 10);
  return { ymd: `${y}-${mo}-${day}`, hour };
}

/**
 * Apakah satu baris scan overtime memenuhi izin untuk permission_date P.
 * - scan_date === P: selalu dihitung.
 * - scan_date === P−1 (kalender) dan waktu scan di WIB jatuh pada tanggal kalender P dengan jam < 6:
 *   ini jendela yang sama dengan aturan bisnis (scan masuk hari operasional P−1 sementara izin dicatat untuk P),
 *   mis. scan 02:00 06/05 WIB → scan_date 05/05, izin permission_date 06/05.
 */
function overtimeFulfillsPermissionDate(permissionYmd, scanDateYmd, scanTime) {
  const p = pgDateOrStringToYmd(permissionYmd);
  const sd = pgDateOrStringToYmd(scanDateYmd);
  if (!p || !sd) return false;
  if (sd === p) return true;
  const prevP = addCalendarDaysYmd(p, -1);
  if (sd !== prevP || scanTime == null) return false;
  const w = getWibCalendarYmdAndHour(scanTime);
  if (!w) return false;
  return w.ymd === p && w.hour < 6;
}

module.exports = {
  getIndonesiaDate,
  getIndonesiaDateString,
  getIndonesiaBusinessDateString,
  getIndonesiaDateTime,
  isResetTime,
  getNextResetTime,
  addCalendarDaysYmd,
  overtimeFulfillsPermissionDate
};

