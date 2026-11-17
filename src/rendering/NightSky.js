/* Cúpula do céu noturno: degradê do horizonte ao zênite, estrelas procedurais que cintilam e lua com halo.
   Fica por cima do Sky (Preetham) e entra com o fator noite; de dia a opacidade é zero e a cúpula some. */
import * as THREE from 'three';

const vertex = /* glsl */`
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_Position = p.xyww;                 // sempre no fundo do buffer de profundidade
  }`;

const fragment = /* glsl */`
  uniform float uNight, uTime;
  uniform vec3 uMoonDir, uZenith, uHorizon, uGlow;
  varying vec3 vDir;
  float hash(vec3 p) { p = fract(p * vec3(443.897, 441.423, 437.195)); p += dot(p, p.yzx + 19.19); return fract((p.x + p.y) * p.z); }
  /* Estrela numa célula de uma grade sobre a esfera: um ponto por célula, com brilho e cor sorteados */
  vec3 stars(vec3 d, float scale, float density) {
    vec3 c = d * scale, cell = floor(c), f = fract(c) - .5;
    float h = hash(cell);
    if (h > density) return vec3(0.);
    vec3 off = vec3(hash(cell + 1.7), hash(cell + 3.1), hash(cell + 5.3)) - .5;
    float r = length(f - off * .7);
    float mag = pow(hash(cell + 9.2), 6.);
    float tw = .75 + .25 * sin(uTime * (1.5 + 3. * hash(cell + 2.2)) + h * 50.);
    vec3 tint = mix(vec3(.75, .85, 1.), vec3(1., .88, .7), hash(cell + 7.7));
    return tint * smoothstep(.09, 0., r) * (.35 + 2.2 * mag) * tw;
  }
  void main() {
    vec3 d = normalize(vDir);
    float up = clamp(d.y, 0., 1.);
    vec3 col = mix(uHorizon, uZenith, pow(up, .45));
    // brilho da cidade no horizonte (poluição luminosa)
    col += uGlow * exp(-max(d.y, 0.) * 9.) * .9;
    float fadeLow = smoothstep(.02, .22, d.y);
    col += (stars(d, 140., .09) + stars(d, 320., .05) * .6) * fadeLow;
    // lua: disco com terminador suave, manchas e halo largo
    float m = dot(d, uMoonDir);
    float disc = smoothstep(.99955, .99975, m);
    float spots = .82 + .18 * hash(floor(d * 900.));
    col = mix(col, vec3(1., .97, .9) * 1.9 * spots, disc);
    col += vec3(.55, .62, .8) * (pow(max(m, 0.), 900.) * .5 + pow(max(m, 0.), 60.) * .12);
    gl_FragColor = vec4(col, uNight);
    #include <colorspace_fragment>
  }`;

export class NightSky {
  constructor(radius = 2400) {
    this.uniforms = {
      uNight: { value: 0 }, uTime: { value: 0 },
      uMoonDir: { value: new THREE.Vector3(-.35, .55, -.76).normalize() },
      uZenith: { value: new THREE.Color(0x02040c) },
      uHorizon: { value: new THREE.Color(0x0d1630) },
      uGlow: { value: new THREE.Color(0x2a2338) },
    };
    this.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 48, 24),
      new THREE.ShaderMaterial({
        uniforms: this.uniforms, vertexShader: vertex, fragmentShader: fragment,
        side: THREE.BackSide, transparent: true, depthWrite: false, fog: false,
      }),
    );
    this.mesh.name = 'ceu:noite';
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -1;                // depois do Sky (renderOrder -2), antes de tudo o mais
  }

  set(night) {
    this.uniforms.uNight.value = night;
    this.mesh.visible = night > .01;
  }

  update(dt, camera) {
    this.uniforms.uTime.value += dt;
    if (camera) this.mesh.position.copy(camera.position);
  }

  dispose() { this.mesh.geometry.dispose(); this.mesh.material.dispose(); }
}
