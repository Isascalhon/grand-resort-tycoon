/* Configuração do WebGLRenderer (three 0.187): espaço de cor sRGB, ACES, sombras PCF
   (PCFSoftShadowMap foi removido no three 0.187) e redimensionamento seguro. */
import * as THREE from 'three';

export function createRenderer(canvas, quality) {
  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: false, powerPreference: 'high-performance', stencil: false, preserveDrawingBuffer: false,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality.pixelRatio));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = quality.shadows;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  return renderer;
}

/* Mantém o canvas, a câmera e os efeitos do tamanho da janela */
export function bindResize(renderer, camera, onResize) {
  const resize = () => {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    onResize?.(w, h);
  };
  window.addEventListener('resize', resize);
  resize();
  return () => window.removeEventListener('resize', resize);
}
