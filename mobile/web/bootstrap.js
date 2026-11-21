import { configureTextBuilder } from 'troika-three-text';
import fontUrl from './fonts/HypedPotAndroid.ttf?url';

// Android-only entry: all glyphs used by the stable game's 3D labels are local.
configureTextBuilder({ defaultFontURL: fontUrl });
