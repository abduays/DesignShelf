(function(root){'use strict';
function getStorageWarning(bytes,budget=7.5*1024*1024){
  if(!Number.isFinite(bytes)||bytes<0||!Number.isFinite(budget)||budget<=0)return {level:'ok',message:'Storage estimate unavailable.'};
  const ratio=bytes/budget;
  if(ratio>=0.95)return {level:'critical',message:'Critical: estimated storage is at or above 95% of DesignShelf’s conservative budget. Export a recovery backup and remove unneeded captures.'};
  if(ratio>=0.8)return {level:'warning',message:'Warning: estimated storage is at or above 80%. Export a backup and review large captures before saving more.'};
  if(ratio>=0.6)return {level:'notice',message:'Heads-up: estimated storage is at or above 60%. Consider exporting a backup.'};
  return {level:'ok',message:'Storage estimate is below the warning thresholds.'};
}
const api={getStorageWarning};root.DesignShelfStorageUsage=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);
