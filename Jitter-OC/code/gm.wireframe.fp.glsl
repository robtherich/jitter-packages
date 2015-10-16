#version 120

uniform vec4 line_color;
uniform float width;
varying vec3 distance;

${tex.decl}

void main (void)
{
    vec3 dist_vec = distance * gl_FragCoord.w;

    // determine frag distance to closest edge
    float fNearest = min(min(dist_vec[0],dist_vec[1]),dist_vec[2]);
    float fEdgeIntensity = exp2(-(1.0/width)*fNearest*fNearest);
    vec4 solidC = gl_Color;
    vec4 lineC = line_color;

    ${tex.op}

    gl_FragColor = mix(solidC, lineC, fEdgeIntensity);
}