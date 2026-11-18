/* Desgaste procedural em coordenadas do mundo, injetado nos materiais PBR por onBeforeCompile:
   - 'wall': variação de tom em grande escala, sujeira subindo do chão (respingo) e escorridos verticais finos;
   - 'stone': o mesmo mais juntas de cantaria (fiadas de 0,55 m com juntas verticais alternadas) abaixo de `rusticTop`;
   - 'grass': manchas de grama mais seca e mais escura, que quebram a repetição da textura no gramado.
   Funciona em malhas comuns e instanciadas (usa instanceMatrix quando existe). */
import * as THREE from 'three';

const NOISE = /* glsl */`
  float wHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float wNoise(vec2 p) {
    vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
    return mix(mix(wHash(i), wHash(i + vec2(1, 0)), f.x), mix(wHash(i + vec2(0, 1)), wHash(i + vec2(1, 1)), f.x), f.y);
  }
  float wFbm(vec2 p) { float s = 0., a = .5; for (int i = 0; i < 4; i++) { s += a * wNoise(p); p *= 2.03; a *= .5; } return s; }`;

export function weather(mat, { mode = 'wall', strength = 1, rusticTop = 5.6 } = {}) {
  const uniforms = { uWStrength: { value: strength }, uRusticTop: { value: rusticTop } };
  mat.userData.weather = uniforms;
  mat.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;\nvarying vec3 vWNrm;')
      .replace('#include <project_vertex>', `#include <project_vertex>
        {
          mat4 wm = modelMatrix;
          #ifdef USE_INSTANCING
            wm = modelMatrix * instanceMatrix;
          #endif
          vWPos = (wm * vec4(transformed, 1.0)).xyz;
          vWNrm = normalize(mat3(wm) * objectNormal);
        }`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vWPos;\nvarying vec3 vWNrm;\nuniform float uWStrength, uRusticTop;\n${NOISE}`)
      .replace('#include <map_fragment>', `#include <map_fragment>\n${FRAGMENT[mode]}`);
  };
  mat.customProgramCacheKey = () => `weather:${mode}`;
  mat.needsUpdate = true;
  return mat;
}

const WALL = /* glsl */`
  {
    // eixo horizontal da face: x nas fachadas frontais, z nas laterais
    float u = abs(vWNrm.x) > .5 ? vWPos.z : vWPos.x;
    float tone = wFbm(vec2(u, vWPos.y) * .06) - .5;
    float splash = (1. - smoothstep(0., 1.4, vWPos.y)) * (.55 + .45 * wNoise(vec2(u * 2.3, 0.)));
    float streakMask = pow(wNoise(vec2(u * 1.7, 3.1)), 4.) * smoothstep(.0, .6, wNoise(vec2(u * 1.7, vWPos.y * .12)));
    float streak = streakMask * (.55 + .45 * wNoise(vec2(u * 9., vWPos.y * .7)));
    float up = step(.5, vWNrm.y);                       // topos de cornija acumulam sujeira
    float dirt = clamp(splash * .22 + streak * .16 + up * .1 * wFbm(vWPos.xz * .8), 0., .4) * uWStrength;
    diffuseColor.rgb *= (1. + tone * .1 * uWStrength) * (1. - dirt);
    diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(.92, .9, .86), dirt);
  }`;

export const FRAGMENT = {
  wall: WALL,
  stone: WALL + /* glsl */`
  if (vWPos.y < uRusticTop && abs(vWNrm.y) < .5) {
    float u = abs(vWNrm.x) > .5 ? vWPos.z : vWPos.x;
    float row = floor(vWPos.y / .55);
    float jy = fract(vWPos.y / .55), jx = fract(u / 1.1 + .5 * mod(row, 2.));
    float joint = max(1. - smoothstep(.0, .045, min(jy, 1. - jy)), 1. - smoothstep(.0, .022, min(jx, 1. - jx)));
    float block = wHash(vec2(floor(u / 1.1 + .5 * mod(row, 2.)), row));
    diffuseColor.rgb *= (1. - .07 * block) * (1. - .45 * joint);
  }`,
  grass: /* glsl */`
  {
    float big = wFbm(vWPos.xz * .018), mid = wFbm(vWPos.xz * .11 + 7.3);
    vec3 dry = vec3(1.18, 1.08, .62), lush = vec3(.78, .92, .7);
    diffuseColor.rgb *= mix(lush, dry, smoothstep(.35, .75, big * .7 + mid * .45));
    diffuseColor.rgb *= .88 + .24 * wNoise(vWPos.xz * .9);
  }`,
};

/* Vidro com Fresnel: quase transparente olhando de frente, espelhado em ângulo raso (como vidro real) */
export function fresnelGlass(mat, { edge = .9, power = 4 } = {}) {
  mat.onBeforeCompile = shader => {
    shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `
      {
        float fr = pow(1. - saturate(dot(normalize(normal), normalize(vViewPosition))), ${power.toFixed(1)});
        diffuseColor.a = mix(diffuseColor.a, ${edge.toFixed(2)}, fr);
      }
      #include <opaque_fragment>`);
  };
  mat.customProgramCacheKey = () => `fresnel:${edge}:${power}`;
  return mat;
}
