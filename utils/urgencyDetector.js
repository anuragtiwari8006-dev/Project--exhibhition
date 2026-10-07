// utils/urgencyDetector.js

const detectUrgency = (text) => {
  if (!text) return 'Medium';
  const clean = text.toLowerCase();

  // High Urgency: immediate safety hazards, flooding, sparks, lockouts
  const highUrgencyRegex = /\b(spark|sparking|shock|short circuit|smoke|fire|burst|overflow|flooding|urgent|emergency|danger|cannot lock|locked out|electric shock|gas)\b/i;

  // Medium Urgency: functional disruptions without immediate danger
  const mediumUrgencyRegex = /\b(leak|leaking|not working|stopped|broken|damaged|no power|no water|clogged|stuck|smell|stench|dripping)\b/i;

  if (highUrgencyRegex.test(clean)) {
    return 'High';
  }
  if (mediumUrgencyRegex.test(clean)) {
    return 'Medium';
  }

  return 'Low';
};

module.exports = { detectUrgency };