precision mediump float;

#define uv(data) (vUv - 0.5) * data.coveredScale * 0.8 + 0.5

struct Texture {
  sampler2D unit;
  vec2 coveredScale;
};

uniform Texture uCurrent;
uniform Texture uNext;
uniform samplerCube tEnv;
uniform float uTime;
uniform float uProgress;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vEye;

#include './modules/snoise21.glsl'
#include './modules/blend.glsl'

const float aspect = 16.0 / 9.0;

float sdSegment(in vec2 p, in vec2 a, in vec2 b) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}

void main() {
  vec3 normal = normalize(vNormal);
  vec3 eye = normalize(vEye);
  vec3 reflection = reflect(eye, normal + vec3(0.2));

  vec3 current = texture2D(uCurrent.unit, uv(uCurrent) + normal.xy * 0.2).rgb;
  vec3 next = texture2D(uNext.unit, uv(uNext) + normal.xy * 0.2).rgb;

  vec3 color;
  float blendNoise;

  {
    float n1 = snoise(floor(vUv * vec2(7.0, 15.0))) * 0.5 + 0.5;
    float n2 = snoise(floor(vUv * vec2(3.0, 5.0))) * 0.5 + 0.5;
    float n3 = snoise(floor(vUv * vec2(4.0, 4.0))) * 0.5 + 0.5;
    float n = n1 * n2 * n3;
    blendNoise = step(vUv.x - uProgress * 1.5 + 0.5, n);
    color = mix(current, next, blendNoise);
  }

  {
    // grid shadow
    float move = 12.5;
    float line = smoothstep(0.995, 1.0, sin(vUv.x * 50.0 * aspect + 1.0 + normal.x * move * aspect));
    line += smoothstep(0.995, 1.0, sin(vUv.y * 50.0 + 1.0 + normal.y * move));
    line = clamp(line, 0.0, 1.0);
    color = mix(color * 0.92, color, 1.0 - line);
  }

  {
    // chromatic aberration
    float time = floor(uTime * 10.0);
    float n1 = snoise(floor(vUv * vec2(7.0, 15.0) + time)) * 0.5 + 0.5;
    float n2 = snoise(floor(vUv * vec2(3.0, 5.0) + time)) * 0.5 + 0.5;
    float n3 = snoise(floor(vUv * vec2(4.0, 4.0) + time)) * 0.5 + 0.5;
    float n = n1 * n2 * n3;
    n = step(0.2, n);

    vec3 currentAber;
    currentAber.r = texture2D(uCurrent.unit, uv(uCurrent) - 0.005).r;
    currentAber.g = texture2D(uCurrent.unit, uv(uCurrent)).g;
    currentAber.b = texture2D(uCurrent.unit, uv(uCurrent) + 0.005).b;

    vec3 nextAber;
    nextAber.r = texture2D(uNext.unit, uv(uNext) - 0.005).r;
    nextAber.g = texture2D(uNext.unit, uv(uNext)).g;
    nextAber.b = texture2D(uNext.unit, uv(uNext) + 0.005).b;

    vec3 aber = mix(currentAber, nextAber, blendNoise);
    aber = blendLighten(color, aber, 1.0);
    color = mix(color, aber, n);
  }

  {
    // grid line
    float line = smoothstep(0.997, 1.0, sin(vUv.x * 50.0 * aspect + 1.0));
    line += smoothstep(0.997, 1.0, sin(vUv.y * 50.0 + 1.0));
    line = clamp(line, 0.0, 1.0);
    color = mix(color, vec3(1), line * 0.2);
  }

  {
    // shadow
    vec2 shadow = vec2(1.0);
    vec2 minEdge = 0.05 - normal.xy * 0.2;
    vec2 maxEdge = 0.95 - normal.xy * 0.2;
    float sm = 0.1;
    shadow *= smoothstep(minEdge - sm, minEdge + sm, vUv);
    shadow *= 1.0 - smoothstep(maxEdge - sm, maxEdge + sm, vUv);
    color = mix(color * 0.3, color, shadow.x * shadow.y);
  }

  {
    // frame border
    float border = 0.0;
    vec2 th = vec2(0.008) * vec2(1.0, aspect);
    float left = 1.0 - smoothstep(th.x, th.x + 0.001, sdSegment(vUv, vec2(0, 0), vec2(0, 1)));
    float right = 1.0 - smoothstep(th.x, th.x + 0.001, sdSegment(vUv, vec2(1, 0), vec2(1, 1)));
    float top = 1.0 - smoothstep(th.y, th.y + 0.001, sdSegment(vUv, vec2(0, 1), vec2(1, 1)));
    float bottom = 1.0 - smoothstep(th.y, th.y + 0.001, sdSegment(vUv, vec2(0, 0), vec2(1, 0)));
    border = left + right + top + bottom;
    border = clamp(border, 0.0, 1.0);
    vec3 env = textureCube(tEnv, reflection).rgb;
    // color = mix(color, env * 0.9, border);
    color = mix(color, env * vec3(0.67, 0.54, 0.16), border);
  }

  gl_FragColor = vec4(color, 1.0);
}