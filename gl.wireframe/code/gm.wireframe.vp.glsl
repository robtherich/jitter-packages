#version 120

${tex.decl}
${light.decl}

void main(void)
{
	gl_Position = gl_ModelViewProjectionMatrix*gl_Vertex;
	gl_FrontColor = gl_Color;

    ${tex.op}
    ${light.op}
}