import config from '../../static/sounds.json' with { type: 'json' };
import { soundAssetUrls } from './soundAssets.js';
import { AudioManager } from './audioEngine.js';

export const audioManager = new AudioManager({ config, assetUrls: soundAssetUrls });

if (import.meta.hot) import.meta.hot.dispose(() => { void audioManager.dispose(); });
