/* Correção de cor final, em espaço de tela (depois do ACES e do sRGB): curva de contraste suave, saturação,
   tonalização dividida (sombras frias, luzes quentes, conforme a hora), vinheta e grão fino de filme.
   Sem grão no modo de teste (uGrain = 0) para as fotos serem comparáveis entre execuções. */
import * as THREE from 'three';

export const GradeShader = {
  name: 'GradeShader',
  uniforms: {
    tDiffuse: { value: null },
    uContrast: { value: 1.06 },
    uSaturation: { value: 1.04 },
    uShadowTint: { value: new THREE.Vector3(.98, 1, 1.04) },
    uHighTint: { value: new THREE.Vector3(1.03, 1.005, .97) },
    uVignette: { value: .28 },
    uGrain: { value: .018 },
    uTime: { value: 0 },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float uContrast, uSaturation, uVignette, uGrain, uTime;
    uniform vec3 uShadowTint, uHighTint;
    varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233)) + uTime) * 43758.5453); }
    void main() {
      vec4 tex = texture2D(tDiffuse, vUv);
      vec3 c = tex.rgb;
      float l = dot(c, vec3(.2126, .7152, .0722));
      // contraste em S em volta do meio-tom: preserva pretos e brancos
      c = clamp((c - .5) * uContrast + .5, 0., 1.);
      c = mix(c, c * c * (3. - 2. * c), (uContrast - 1.) * 1.5);
      c = mix(vec3(dot(c, vec3(.2126, .7152, .0722))), c, uSaturation);
      c *= mix(uShadowTint, uHighTint, smoothstep(.15, .85, l));
      vec2 q = vUv - .5;
      c *= 1. - uVignette * smoothstep(.25, .85, dot(q, q) * 2.2);
      c += (hash(vUv * 1024.) - .5) * uGrain;
      gl_FragColor = vec4(clamp(c, 0., 1.), tex.a);
    }`,
};
