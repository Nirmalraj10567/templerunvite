const SYNODIC_MONTH_DAYS = 29.530588853;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const REFERENCE_NEW_MOON_UTC = Date.UTC(2000, 0, 6, 18, 14, 0, 0);

const PHASES = [
  { name: 'NEW', label: 'New Moon', offset: 0 },
  { name: 'FIRST_QUARTER', label: 'First Quarter', offset: 0.25 },
  { name: 'FULL', label: 'Full Moon', offset: 0.5 },
  { name: 'LAST_QUARTER', label: 'Last Quarter', offset: 0.75 }
];

async function getMoonPhases(startDate, endDate) {
  const startMs = startDate.getTime();
  const endMs = endDate.getTime();
  
  const daysSinceRef = (startMs - REFERENCE_NEW_MOON_UTC) / MS_PER_DAY;
  let k = Math.floor(daysSinceRef / SYNODIC_MONTH_DAYS) - 1;

  const phases = [];
  while (true) {
    for (const phase of PHASES) {
      const phaseUtcMs = REFERENCE_NEW_MOON_UTC + 
        (k + phase.offset) * SYNODIC_MONTH_DAYS * MS_PER_DAY;
      
      if (phaseUtcMs > endMs + MS_PER_DAY) return phases;
      
      if (phaseUtcMs >= startMs - MS_PER_DAY) {
        phases.push({
          date: new Date(phaseUtcMs).toISOString(),
          phase: phase.name,
          label: phase.label
        });
      }
    }
    k += 1;
  }
}

module.exports = { getMoonPhases };
