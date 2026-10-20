// Kept free of three.js imports so eager pages can feature-detect before loading a 3D chunk.
export const hasWebGL = () => {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
};
