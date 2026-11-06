// Only compressed copies are imported into the application. The original WAV
// sources remain available for editing without increasing the runtime bundle.
export const soundAssetUrls = Object.freeze({
  'getcoin.ogg': new URL('../../assets/sounds/optimized/getcoin.ogg', import.meta.url).href,
  'spincoin.ogg': new URL('../../assets/sounds/optimized/spincoin.ogg', import.meta.url).href,
  'spell1fire.ogg': new URL('../../assets/sounds/optimized/spell1fire.ogg', import.meta.url).href,
  'spell2frost.ogg': new URL('../../assets/sounds/optimized/spell2frost.ogg', import.meta.url).href,
  'spell3standart.ogg': new URL('../../assets/sounds/optimized/spell3standart.ogg', import.meta.url).href,
  'spell4standart.ogg': new URL('../../assets/sounds/optimized/spell4standart.ogg', import.meta.url).href,
  'spell5.ogg': new URL('../../assets/sounds/optimized/spell5.ogg', import.meta.url).href,
  'spell6electric.ogg': new URL('../../assets/sounds/optimized/spell6electric.ogg', import.meta.url).href,
  'spell7rise.ogg': new URL('../../assets/sounds/optimized/spell7rise.ogg', import.meta.url).href,
  'spell8pulse.ogg': new URL('../../assets/sounds/optimized/spell8pulse.ogg', import.meta.url).href,
  'spell9wind.ogg': new URL('../../assets/sounds/optimized/spell9wind.ogg', import.meta.url).href,
  'spell10cascade.ogg': new URL('../../assets/sounds/optimized/spell10cascade.ogg', import.meta.url).href,
  'yessound.ogg': new URL('../../assets/sounds/optimized/yessound.ogg', import.meta.url).href,
  'ambientpotions.ogg': new URL('../../assets/sounds/optimized/ambientpotions.ogg', import.meta.url).href,
  'potiongood.ogg': new URL('../../assets/sounds/optimized/potiongood.ogg', import.meta.url).href,
});

export default soundAssetUrls;
