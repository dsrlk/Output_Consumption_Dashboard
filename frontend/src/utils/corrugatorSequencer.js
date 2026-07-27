/**
 * Corrugator Sequencing Logic
 * Ported directly from the original VBA Macro
 */

// Helpers
export const extractGrammage = (token) => {
  if (!token) return 0;
  const matches = String(token).match(/[0-9]+/g);
  if (matches) {
    return parseInt(matches.join(''), 10);
  }
  return 0;
};

export const isHighGrammageToken = (token) => {
  if (!token) return false;
  const t = String(token).trim().toUpperCase();
  if (t.startsWith('KLB') && extractGrammage(t) >= 135) {
    return true;
  }
  if (t === 'LIN200') {
    return true;
  }
  return false;
};

export const comboDiff = (a, b, plyCols) => {
  let diff = 0;
  for (const col of plyCols) {
    if (String(a[col] || '') !== String(b[col] || '')) {
      diff++;
    }
  }
  return diff;
};

export const rowTotalGrammage = (row, plyCols) => {
  let g = 0;
  for (const col of plyCols) {
    g += extractGrammage(row[col]);
  }
  return g;
};

export const isStrictNormalLinFlt = (row, plyCols) => {
  for (const col of plyCols) {
    const v = String(row[col] || '').trim().toUpperCase();
    if (v !== '' && !v.startsWith('LIN') && !v.startsWith('FLT')) {
      return false;
    }
  }
  return true;
};

/**
 * Sequences a block of orders (grouped by Reel Size)
 * @param {Array} block - Array of order objects
 * @param {Boolean} isFirstReel - True if this is the first reel of the day
 * @param {String} plyCol - Key name for Ply count
 * @param {String} fluteCol - Key name for Flute type
 * @param {Array} plyCols - Array of key names for the specific ply papers (C1, C2, etc.)
 */
export const sequenceBlock = (block, isFirstReel, plyCol, fluteCol, plyCols) => {
  const n = block.length;
  if (n === 0) return [];
  
  const used = new Array(n).fill(false);
  const seq = [];
  
  let starterIdx = -1;
  
  // Choose Starter
  if (isFirstReel) {
    let bestG = 999999;
    // Look for 3-ply strict normal
    for (let i = 0; i < n; i++) {
      if (isStrictNormalLinFlt(block[i], plyCols) && parseInt(block[i][plyCol], 10) === 3) {
        const g = rowTotalGrammage(block[i], plyCols);
        if (g < bestG) { bestG = g; starterIdx = i; }
      }
    }
    // Fallback to 5-ply strict normal
    if (starterIdx === -1) {
      bestG = 999999;
      for (let i = 0; i < n; i++) {
        if (isStrictNormalLinFlt(block[i], plyCols) && parseInt(block[i][plyCol], 10) === 5) {
          const g = rowTotalGrammage(block[i], plyCols);
          if (g < bestG) { bestG = g; starterIdx = i; }
        }
      }
    }
    if (starterIdx === -1) starterIdx = 0; // Absolute fallback
  } else {
    // Not first reel, prioritize High Grammage
    let bestG = -1;
    for (let i = 0; i < n; i++) {
      let hasHigh = false;
      for (const col of plyCols) {
        if (isHighGrammageToken(block[i][col])) hasHigh = true;
      }
      if (hasHigh) {
        const g = rowTotalGrammage(block[i], plyCols);
        if (g > bestG) { bestG = g; starterIdx = i; }
      }
    }
    // Fallback highest grammage
    if (starterIdx === -1) {
      bestG = -1;
      for (let i = 0; i < n; i++) {
        const g = rowTotalGrammage(block[i], plyCols);
        if (g > bestG) { bestG = g; starterIdx = i; }
      }
    }
    if (starterIdx === -1) starterIdx = 0;
  }
  
  seq.push(block[starterIdx]);
  used[starterIdx] = true;
  
  // Greedy Chaining
  let pos = 1;
  while (pos < n) {
    let bestIdx = -1;
    let bestScore = 9999;
    let bestPlyDiff = 9999;
    let bestFluteDiff = 9999;
    
    const prev = seq[pos - 1];
    
    for (let i = 0; i < n; i++) {
      if (!used[i]) {
        const curr = block[i];
        const sc = comboDiff(prev, curr, plyCols);
        const pDiff = Math.abs(parseInt(prev[plyCol], 10) - parseInt(curr[plyCol], 10));
        const fDiff = (String(prev[fluteCol]) === String(curr[fluteCol])) ? 0 : 1;
        
        if (
          sc < bestScore ||
          (sc === bestScore && pDiff < bestPlyDiff) ||
          (sc === bestScore && pDiff === bestPlyDiff && fDiff < bestFluteDiff)
        ) {
          bestScore = sc;
          bestPlyDiff = pDiff;
          bestFluteDiff = fDiff;
          bestIdx = i;
        }
      }
    }
    
    if (bestIdx === -1) break;
    
    seq.push(block[bestIdx]);
    used[bestIdx] = true;
    pos++;
  }
  
  return seq;
};
