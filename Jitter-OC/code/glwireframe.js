outlets=2;

include("String.prototype.template");

var curob;
var testname;
var vname;
var path_to_code_folder;

// object properties
var isgrid=true;
var hastex=false;
var lighting=false;
var texrect=true;

// build options
var overlay=0;
var texture_lines=0;
var quad=0;
declareattribute("overlay",null,"setoverlay",0);
declareattribute("texture_lines",null,"settexture_lines",0);
declareattribute("quad",null,"setquad",0);
	
// shader attributes
var line_color = [1.,0.,0.,1.];
var line_width=1.;
declareattribute("line_color",null,"setline_color",0);
declareattribute("line_width",null,"setline_width",0);

var debug = 1;

var shaderob = new JitterObject("jit.gl.shader");

function testjson()
{
	//var d = new Dict();
	//d.import_json("shader-parts.json");
	//var str = d.stringify();				// convert dict to string
	//var json = JSON.parse(str);				// parse the string as a JS Object
	//var params = json["jxs-parts"]["param"]["common"];
	//post(params[0]+"\n");
	//post('test1 ${1 + 2} test2 ${3 + 4}'.template());		
	//post(greetings({name:'Andrea'}));
	var json = getjson();
	var tex = json["wireframe-glsl"]["gp-tex"];
	var quad = json["wireframe-glsl"]["gp-quad"];
	var gps = applytemplate_tex(tex, quad, "gm.wireframe.gp.glsl");	
	//post(applytemplate_quad(gps, json["wireframe-glsl"]["gp-quad"]));
	//post(applytemplate_tex(json["wireframe-glsl"]["vp-tex"], "gm.wireframe.vp.glsl"));
	//post(applytemplate_tex(0, "gm.wireframe.vp.glsl"));
}

function postln(arg) {
	if(debug)
		post(arg+"\n");
}

function bang() {
	reset();
	outlet(0,"getname");	
}

function reset() {
	isgrid=true;
	hastex=false;
	lighting=false;
	texrect=true;
}

function build_shader(ob) {
	var p = new File(this.patcher.filepath,"read");
	path_to_code_folder = p.foldername+"/../code/";
	
	isgrid = !(ob.maxclass === "jit.gl.model");
	
	outlet(0,"getlighting_enable");	
	if(ob.maxclass === "jit.gl.model") {
		texrect = false;
		//outlet(0, "material_mode", 0);
		outlet(0, "gettexnames");
	}
	outlet(0, "gettexture");	
	
	var	jxsname = build_shader_name();
	var fullpath = path_to_code_folder+jxsname;
	var f = new File(fullpath);
	if (f.isopen) {
		f.close();
		//postln("deleting "+fullpath);
		//outlet(1, "rm", fullpath);
		//return;
	}
	else {
		write_jxs(fullpath);
	}
	shaderob.read(fullpath);
	
	outlet(0, "getdrawto");	
}

function build_shader_name() {
	var jxsname = "wireframe";
	if(overlay) jxsname+="_overlay";
	if(hastex) {
		jxsname+="_texture";
		if(texrect)jxsname+="_rect";
	}
	if(texture_lines) jxsname+="_texlines";
	if(lighting) jxsname+="_lighting";
	if(!isgrid) jxsname+="_triangles";
	else jxsname+="_trigrid";
	if(quad)jxsname+="_quad";
	return jxsname+".jxs"
}

function getjson(){
	var d = new Dict();
	d.import_json("shader-parts.json");
	var str = d.stringify();				// convert dict to string
	var json = JSON.parse(str);				// parse the string as a JS Object
	return json;
}

function applytemplate_tex(tex, file) {
	postln("applying tex template to "+path_to_code_folder+file);
	var f = new File(path_to_code_folder+file,"read");
	return(f.readtext().template({tex : tex})).replace(/\s*undefined/g, "\n");
}

function applytemplate_tex_quad(tex, quad, file) {
	postln("applying tex_quad template to "+path_to_code_folder+file);
	var f = new File(path_to_code_folder+file,"read");
	return(f.readtext().template({tex : tex, quad : quad})).replace(/\s*undefined/g, "\n");
}

function applytemplate_sampler(s, tex) {
	postln("applying sampler template on string "+s);
	return(s.template({tex : tex}));
}

function applytemplate_quad(s, quad) {
	postln("applying quad template on string "+s);
	return(s.template({quad : quad}).replace(/\s*undefined/g, "\n"));
}

function writelines(f, lines) {
	for (l in lines)
		f.writestring(lines[l]+"\n");
}

function open_program(f, s) {
	f.writestring(s+"\n<![CDATA[\n");
}

function close_program(f) {
	f.writestring("\n]]>\n</program>\n");
}

function write_jxs(s) {
	var f = new File(s,"write","TEXT"); 
	var json = getjson();
	if (f.isopen && json) {
		
		postln("writing jxs to : " + s);
		
		var parts = json["wireframe-jxs"];
		
		f.writestring("<jittershader>\n");
		
		writelines(f, parts["param"]["common"]);
		if(hastex)
			writelines(f, parts["param"]["texture"]);
			
		f.writestring("<language name=\"glsl\" version=\"1.2\">\n");
			
		writelines(f, parts["bind"]["common"]);
		if(hastex)
			writelines(f, parts["bind"]["texture"]);
		
		var glsljson = json["wireframe-glsl"];
		
		// vertex program
		open_program(f, parts["program"]["vp"]);	
		f.writestring(applytemplate_tex((hastex ? glsljson["vp-tex"] : 0), "gm.wireframe.vp.glsl"));
		close_program(f);
		
		// geometry program
		if(!isgrid)	open_program(f, parts["program"]["gp-triangles"]);
		else open_program(f, parts["program"]["gp-trigrid"]);
		f.writestring(
			applytemplate_tex_quad(
				(hastex ? glsljson["gp-tex"] : 0), 
				(quad ? (isgrid ? glsljson["gp-quad-grid"] : glsljson["gp-quad"]) : 0),
				"gm.wireframe.gp.glsl"
			)
		);
		close_program(f);
		
		// fragment program
		open_program(f, parts["program"]["fp"]);
		var fpjson = (hastex ? (texture_lines ? glsljson["fp-tex-lines"] : glsljson["fp-tex-solid"]) : 0);
		f.writestring(
			applytemplate_sampler(
				applytemplate_tex(fpjson, "gm.wireframe.fp.glsl"), (texrect ? glsljson["texture-rect"] : glsljson["texture"])
			)
		);
		close_program(f);
		
		f.writestring("</language>\n");
		f.writestring("</jittershader>\n");
		
		f.close();
	} else {
		post("could not create file: " + s + "\n");
	}
}

//////////////////////////////////////////////
// build options
//////////////////////////////////////////////

function setoverlay(arg) {
	overlay = (arg);
	bang();
}

function settexture_lines(arg) {
	texture_lines = (arg);
	bang();
}

function setquad(arg) {
	quad = (arg);
	bang();
}

//////////////////////////////////////////////
// shader attributes
//////////////////////////////////////////////

function resend_shader_params() {
	shaderob.param(["line_width"].concat([line_width]));
	shaderob.param(["line_color"].concat(line_color));
}

function do_shader_param(a) {
	var pname = a[0] = a[0].substring(3,a[0].length);
	shaderob.param(a);
}

function setline_color() {
	var a = arrayfromargs(messagename,arguments);
	for(i=1; i<a.length; i++) line_color[i-1]=a[i];
	do_shader_param(a);
}

function setline_width() {
	var a = arrayfromargs(messagename,arguments);
	if(a.length>1) {
		line_width = a[1];
		do_shader_param(a);
	}
}

//////////////////////////////////////////////
// from attached object
//////////////////////////////////////////////
function name(n) {
	vname = n+"_vname";
	outlet(0,"sendbox", "varname", vname);
	build_shader(this.patcher.getnamed(vname));
}

function lighting_enable(arg) {
	lighting = arg;
}

function texnames(args) {
	texname = arguments[0];
	postln("setting texture "+texname);
	outlet(0,"texture", texname);
	hastex = true;
}

function texture(arg) {
	//texname = arguments[0];
	if(arg) {
		postln("texture is"+arg);
		hastex = true;
	}
}

function drawto(arg) {
	shaderob.drawto = arg;
	outlet(0, "shader", shaderob.name);
	resend_shader_params();
}

function anything() {

}