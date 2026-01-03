export const round5 = (num) => Math.round(num / 5) * 5;

export const parseMoney = (str) => {
    if (!str) return 0;
    return parseFloat(String(str).replace(/[^0-9.-]+/g,"")) || 0;
};

export const calculateSD = (data, key) => {
    if (!data || data.length === 0) return 0;
    const values = data.map(d => parseFloat(d[key]) || 0);
    const n = values.length;
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
    return Math.sqrt(variance);
};

// FIX: Ensure dates are handled in local time, not UTC
export const getLocalDate = (dateObj = new Date()) => {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// NEW: Get the start (Mon) and end (Sun) of the PREVIOUS week
export const getPreviousWeekRange = () => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 (Sun) - 6 (Sat)
    
    // Calculate how many days to go back to get to LAST Monday
    // If today is Mon (1), go back 7 days. If Sun (0), go back 6 days.
    const daysToLastMonday = dayOfWeek === 0 ? 6 : (dayOfWeek - 1) + 7;
    const daysToLastSunday = daysToLastMonday - 6;

    const start = new Date(today);
    start.setDate(today.getDate() - daysToLastMonday);
    start.setHours(0, 0, 0, 0);

    const end = new Date(today);
    end.setDate(today.getDate() - daysToLastSunday);
    end.setHours(23, 59, 59, 999);

    return { start, end, id: getLocalDate(start) }; // ID used to track claims
};

export const getTierDetails = (tierScore, currentTierLevel = 0) => {
  let calculatedTier = 0;
  const score = parseFloat(tierScore) || 0; 
  if (score >= 120000) calculatedTier = 3;      
  else if (score >= 80000) calculatedTier = 2; 
  else if (score >= 40000) calculatedTier = 1; 
  
  const finalTier = Math.max(calculatedTier, currentTierLevel);
  let nextGoal = 0; let prevGoal = 0;
  if (finalTier === 0) { nextGoal = 40000; prevGoal = 0; }
  else if (finalTier === 1) { nextGoal = 80000; prevGoal = 40000; }
  else if (finalTier === 2) { nextGoal = 120000; prevGoal = 80000; }
  else { nextGoal = 200000; prevGoal = 120000; } 

  const progress = Math.min(100, Math.max(0, ((score - prevGoal) / (nextGoal - prevGoal)) * 100));

  const tiers = {
    0: { name: 'Bronze', playerKeep: 0.60, color: 'bg-orange-700', text: 'text-white' },
    1: { name: 'Silver', playerKeep: 0.65, color: 'bg-gray-500', text: 'text-white' },
    2: { name: 'Gold', playerKeep: 0.70, color: 'bg-yellow-600', text: 'text-black' },
    3: { name: 'Platinum', playerKeep: 0.75, color: 'bg-cyan-600', text: 'text-black' },
  };
  return { level: finalTier, ...tiers[finalTier], nextGoal, progress, remaining: nextGoal - score };
};