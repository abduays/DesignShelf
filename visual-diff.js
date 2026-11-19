/* Local pixel comparison helper. No browser APIs or network access. */
(function(root){'use strict';
function comparePixelData(width,height,a,b,threshold=20){
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width*height>1440000)throw new Error('Invalid image dimensions.');
  const expected=width*height*4;if(!a||!b||a.length!==expected||b.length!==expected)throw new Error('Pixel arrays must match dimensions.');
  if(!Number.isFinite(threshold)||threshold<0||threshold>255)throw new Error('Invalid difference threshold.');
  const diff=new Uint8ClampedArray(expected);let changed=0,sum=0;
  for(let i=0;i<expected;i+=4){let delta=0;for(let channel=0;channel<3;channel++){const d=Math.abs(a[i+channel]-b[i+channel]);delta=Math.max(delta,d);sum+=d;}const alphaDelta=Math.abs(a[i+3]-b[i+3]);delta=Math.max(delta,alphaDelta);if(delta>threshold){changed++;diff[i]=255;diff[i+1]=0;diff[i+2]=0;diff[i+3]=Math.min(220,Math.max(40,delta*3));}}
  const total=width*height;return {width,height,totalPixels:total,changedPixels:changed,changedPercent:changed/total*100,meanAbsoluteError:sum/(total*3),threshold,diff};
}
const api={comparePixelData};root.DesignShelfVisualDiff=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);
