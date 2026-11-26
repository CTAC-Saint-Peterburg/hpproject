import { createContext } from 'react';

// Pagination measures a second copy of the DOM, never a second WebGL scene.
export const MenuMeasureContext = createContext(false);
