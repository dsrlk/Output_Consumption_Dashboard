/**
 * ETA Calculation Engine
 */

export const calculateTimings = (
  sequence, 
  baseStartTime = new Date(), 
  speedMPerMin = 165, 
  setupSeconds = 30
) => {
  const timings = [];
  
  // Clone the base start time
  let currentTime = new Date(baseStartTime.getTime());
  
  for (let i = 0; i < sequence.length; i++) {
    const job = sequence[i];
    
    // LMTR is typically Linear Meters, ensuring it's a number
    const linearMeters = parseFloat(job.LMTR || job.linearMeters || 0);
    
    // Calculate production minutes
    const prodMin = speedMPerMin > 0 ? linearMeters / speedMPerMin : 0;
    const prodSec = Math.round(prodMin * 60);
    
    // Start Time is the current time
    const startTime = new Date(currentTime.getTime());
    
    // End time includes setup + production time
    const totalDurationSec = setupSeconds + prodSec;
    const endTime = new Date(currentTime.getTime() + totalDurationSec * 1000);
    
    timings.push({
      ...job,
      plannedStartTime: startTime,
      estimatedEndTime: endTime,
      setupSeconds: setupSeconds,
      productionMinutes: prodMin,
      status: 'PENDING' // PENDING, ASSUMED_COMPLETE, CONFIRMED_COMPLETE
    });
    
    // Update current time for the next job
    currentTime = endTime;
  }
  
  return timings;
};
