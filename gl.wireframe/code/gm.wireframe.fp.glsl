#version 120

uniform vec4 line_color;
uniform float line_width;
varying vec3 distance;

${tex.decl}
${light.decl}
${depthfade.decl}

float lambertian(vec3 Nn, vec3 L) {
    return max(dot(Nn, L), 0.);
}

float blinn(vec3 Vn, vec3 Nn, vec3 L, float Ns) {
    vec3 H = normalize(L+Vn);
    return pow(max(dot(Nn, H), 0.), Ns);
}

void main (void)
{
    ${depthfade.op}

    vec3 dist_vec = distance * gl_FragCoord.w;
    float lw = line_width;
    ${depthfade.width}

    // determine frag distance to closest edge
    float nearest = min(min(dist_vec[0],dist_vec[1]),dist_vec[2]);
    float edgeIntensity = exp2(-(1.0/lw)*nearest*nearest);

    ${discard.op}

    vec4 solidC = gl_FrontMaterial.diffuse;
    vec4 lineC = line_color;

    ${tex.op}
    ${light.pre}
    ${light.op}
    ${light.post}
    ${depthfade.color}

    gl_FragColor = mix(solidC, lineC, edgeIntensity);
}