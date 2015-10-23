include("String.prototype.template");

// build options
var texture_lines=0;
var quad=0;
var discard=0;
var light_type="directional";
var texture_rect=-1;
var depthfade_width=0;
var depthfade_alpha=0;
var depthfade_color=0;
declareattribute("texture_lines",null,"settexture_lines",1);
declareattribute("quad",null,"setquad",1);
declareattribute("discard",null,"setdiscard",1);
declareattribute("light_type",null,"setlight_type",1);
declareattribute("texture_rect",null,"settexture_rect",1);
declareattribute("depthfade_width",null,"setdepthfade_width",1);
declareattribute("depthfade_alpha",null,"setdepthfade_alpha",1);
declareattribute("depthfade_color",null,"setdepthfade_color",1);
	
// shader attributes
var line_color = [1.,0.,0.,1.];
var line_width=1.;
var fade_color = [0.,0.,0.,1.];
var fade_distance=50.;
var fade_width=1.;
declareattribute("line_color",null,"setline_color",1);
declareattribute("line_width",null,"setline_width",1);
declareattribute("fade_color",null,"setfade_color",1);
declareattribute("fade_distance",null,"setfade_distance",1);
declareattribute("fade_width",null,"setfade_width",1);

// object properties
var isgrid=true;
var hastex=false;
var lighting=false;
var texrect=true;

var dofade = false;
var verbose = false;

var shaderob = new JitterObject("jit.gl.shader");

var p = new File(this.patcher.filepath,"read");
var path_to_code_folder = p.foldername+"/../code/";

var vpglsl = "gm.wireframe.vp.glsl";
var gpglsl = "gm.wireframe.gp.glsl";
var fpglsl = "gm.wireframe.fp.glsl";
var shaderjson = "shader-parts.json";

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

function notifydeleted() {
	shaderob.freepeer();
}

//////////////////////////////////////////////
// write shader
//////////////////////////////////////////////

function build_shader(ob) {	
	
	if(ob.maxclass === "jit.gl.model") {
		texrect = false;
		isgrid = false;
		outlet(0, "gettexnames");
	}
	else if(ob.maxclass === "jit.gl.gridshape") {
		outlet(0, "gridmode", 1);
	}
	else if(ob.maxclass === "jit.gl.mesh") {
		outlet(0, "getdraw_mode");
	}
	outlet(0, "gettexture");	
	outlet(0,"getlighting_enable");	
	
	if(texture_rect>=0)	// override on user request
		texrect = texture_rect;
		
	var	jxsname = build_shader_name();
	var fullpath = path_to_code_folder+jxsname;
	var f = new File(fullpath);
	if (f.isopen)
		f.close();
	else
		write_jxs(fullpath);
	
	shaderob.read(fullpath);
	outlet(0, "getdrawto");	
}

function build_shader_name() {
	var jxsname = "wireframe";
	if(hastex) {
		jxsname+="_tex";
		if(texrect)jxsname+="_rect";
	}
	if(texture_lines) jxsname+="_texlines";
	if(lighting) jxsname+="_"+light_type;
	if(!isgrid) jxsname+="_tri";
	else jxsname+="_trigrid";
	if(quad)jxsname+="_quad";
	if(discard)jxsname+="_discard";
	if(depthfade_width) jxsname+="_fw";
	if(depthfade_alpha) jxsname+="_fa";
	if(depthfade_color) jxsname+="_fc";
	return jxsname+".jxs"
}

function getjson(){
	var d = new Dict();
	d.import_json(shaderjson);
	var str = d.stringify();				// convert dict to string
	var json = JSON.parse(str);				// parse the string as a JS Object
	return json;
}

function open_program_jxs(f, s) {
	f.writestring(s+"\n<![CDATA[\n");
}

function close_program_jxs(f) {
	f.writestring("\n]]>\n</program>\n");
}

function get_light_glsl(json) {
	var rdict=new Object();
	rdict["decl"] = json["decl"];
	rdict["pre"] = json["pre"];
	if(light_type==="spot")
		rdict["op"] = json["point"].concat(json["spot"]);
	else
		rdict["op"] = json[light_type];
	rdict["post"] = json["post"];
	//for(key in rdict) {
	//	postln(key)
	//	printd(rdict[key]);			
	//}
	return rdict;
}

function get_fade_glsl(json) {
	var rdict=new Object();
	rdict["decl"] = json["decl"];
	rdict["op"] = json["op"];

	if(depthfade_width) {
		rdict["decl"] += ("\n"+json["width"]["decl"]);
		rdict["width"] = json["width"]["op"];
	}
	if(depthfade_color) {
		rdict["decl"] += ("\n"+json["color"]["decl"]);
		rdict["color"] = json["color"]["op"];
		if(depthfade_alpha) 
			rdict["color"] += ("\n\t"+json["alpha"]["op"]);
	}
	else if(depthfade_alpha)
		rdict["color"] = json["alpha"]["op"];
		
	if(!lighting)
		rdict["decl"] += ("\n"+json["decl-nolighting"]);		
		
	return rdict;
}

function write_fade_jxs(f,json) {
	writelines(f, json["fade-distance"]);
	if(depthfade_width) writelines(f, json["fade-width"]);
	if(depthfade_color) writelines(f, json["fade-color"]);
}

function write_jxs(s) {
	var f = new File(s,"write","TEXT"); 
	var json = getjson();
	if (f.isopen && json) {
		
		postln("writing jxs to : " + s);
		
		var jxs = json["wireframe-jxs"];
		
		f.writestring("<jittershader>\n");
		
		writelines(f, jxs["param"]["common"]);
		if(hastex)
			writelines(f, jxs["param"]["texture"]);
		if(dofade)
			write_fade_jxs(f, jxs["param"]);
			
		f.writestring("<language name=\"glsl\" version=\"1.2\">\n");
			
		writelines(f, jxs["bind"]["common"]);
		if(hastex)
			writelines(f, jxs["bind"]["texture"]);
		if(dofade)
			write_fade_jxs(f, jxs["bind"]);			
		
		write_programs(f, jxs, json);
		
		f.writestring("</language>\n");
		f.writestring("</jittershader>\n");
		
		f.close();
	} else {
		post("could not create file: " + s + "\n");
	}
}

function write_programs(f, jxs, json) {
	// vertex program
	var glsl = json["wireframe-glsl"]["vp"];
	open_program_jxs(f, jxs["program"]["vp"]);	
	f.writestring(applytemplate_vp(vpglsl,
		(hastex ? glsl["tex"] : 0), 
		(lighting||dofade ? glsl["light"] : 0)
	));
	close_program_jxs(f);
	
	// geometry program
	glsl = json["wireframe-glsl"]["gp"];
	if(!isgrid)	open_program_jxs(f, jxs["program"]["gp-triangles"]);
	else open_program_jxs(f, jxs["program"]["gp-trigrid"]);
	f.writestring(applytemplate_gp(gpglsl,
		(hastex ? glsl["tex"] : 0), 
		(lighting||dofade ? glsl["light"] : 0), 
		(quad ? (isgrid ? glsl["quad-grid"] : glsl["quad"]) : 0)
	));
	close_program_jxs(f);
	
	// fragment program
	glsl = json["wireframe-glsl"]["fp"];
	open_program_jxs(f, jxs["program"]["fp"]);
	f.writestring(applytemplate_sampler(
		applytemplate_fp(fpglsl,
			(hastex ? (texture_lines ? glsl["tex-lines"] : glsl["tex-solid"]) : 0), 
			(lighting ? get_light_glsl(glsl["light"]) : 0),
			(discard ? glsl["discard"] : 0),
			(dofade ? get_fade_glsl(glsl["fade-depth"]) : 0)
		), 
		(texrect ? glsl["texture-rect"] : glsl["texture"])
	));
	close_program_jxs(f);	
}

//////////////////////////////////////////////
// string template
//////////////////////////////////////////////

function fixtemplate(s) {
	return s.replace(/\s*undefined/g, "\n").replace(/([;{}]),/g, "$1\n");
}

function applytemplate_vp(file, tex, light) {
	postln("applying vp template to "+path_to_code_folder+file);
	var f = new File(path_to_code_folder+file,"read");
	return fixtemplate(f.readtext().template({tex:tex, light:light}));
}

function applytemplate_gp(file, tex, light, quad) {
	postln("applying gp template to "+path_to_code_folder+file);
	var f = new File(path_to_code_folder+file,"read");
	return fixtemplate(f.readtext().template({tex:tex, light:light, quad:quad}));
}

function applytemplate_fp(file, tex, light, discard, depthfade) {
	postln("applying fp template to "+path_to_code_folder+file);
	var f = new File(path_to_code_folder+file,"read");
	return fixtemplate(f.readtext().template({tex:tex, light:light, discard:discard, depthfade:depthfade}));
}

function applytemplate_sampler(s, tex) {
	postln("applying sampler template on string "+s);
	return(s.template({tex : tex}));
}

//////////////////////////////////////////////
// utility
//////////////////////////////////////////////

function testjson()
{
	var json = getjson()["wireframe-glsl"];
	post(applytemplate_vp(vpglsl, json["vp"]["tex"], json["vp"]["light"]));
	post(applytemplate_gp(gpglsl, json["gp"]["tex"], json["gp"]["light"], json["gp"]["quad"]));	
	post(applytemplate_fp(fpglsl, 0, get_light_glsl(json["fp"]["light"]), 0,get_fade_glsl(json["fp"]["fade-depth"])));	
}

function writelines(f, lines) {
	if(typeof lines === 'string') {
		postln("writing line "+lines);
		f.writestring(lines+"\n");
	}
    else {
	    for (l in lines) {postln("writing line "+lines[l]); f.writestring(lines[l]+"\n");}
    }
}

function postln(arg) {
	if(verbose)
		post(arg+"\n");
}

function printd(d) {
	if(typeof d === 'string')
		postln("string: "+d);
	else {
		for (var key in d)
			postln("key: "+key+". value: "+d[key]);
	}
}

function mergedict(d1, d2) {
	for (var attrname in d2) { d1[attrname] = d2[attrname]; }
}

//////////////////////////////////////////////
// build options
//////////////////////////////////////////////

function settexture_lines(arg) {
	texture_lines = (arg);
	bang();
}

function setquad(arg) {
	quad = (arg);
	bang();
}

function setdiscard(arg) {
	discard = (arg);
	bang();
}

function setlight_type(arg) {
	light_type = (arg);
	bang();
}

function settexture_rect(arg) {
	texture_rect = (arg);
	bang();
}

function setdepthfade_width(arg) {	
	depthfade_width = (arg);
	setdofade(arg);
	bang();
}

function setdepthfade_alpha(arg) {
	depthfade_alpha = (arg);
	setdofade(arg);	
	bang();
}

function setdepthfade_color(arg) {
	depthfade_color = (arg);
	setdofade(arg);
	bang();
}

function setdofade(arg) {
	if(arg) dofade = true;
	else dofade = (depthfade_width||depthfade_alpha||depthfade_color);
}

//////////////////////////////////////////////
// shader attributes
//////////////////////////////////////////////

function resend_shader_params() {
	shaderob.param(["line_width"].concat([line_width]));
	shaderob.param(["line_color"].concat(line_color));
	if(dofade) {
		shaderob.param(["fade_distance"].concat([fade_distance]));
		if(fade_color) shaderob.param(["fade_color"].concat(fade_color));
		if(fade_width) shaderob.param(["fade_width"].concat([fade_width]));
	}
}

function do_shader_param(a) {
	var pname = a[0] = a[0].substring(3,a[0].length);
	shaderob.param(a);
}

function setline_color() {
	var a = arrayfromargs(messagename,arguments);
	for(i=1; i<a.length&&i<=4; i++) line_color[i-1]=a[i];
	do_shader_param(a);
}

function setline_width() {
	var a = arrayfromargs(messagename,arguments);
	if(a.length>1) {
		line_width = a[1];
		do_shader_param(a);
	}
}

function setfade_color() {
	var a = arrayfromargs(messagename,arguments);
	for(i=1; i<a.length&&i<=4; i++) fade_color[i-1]=a[i];
	do_shader_param(a);
}

function setfade_width() {
	var a = arrayfromargs(messagename,arguments);
	if(a.length>1) {
		fade_width = a[1];
		do_shader_param(a);
	}
}

function setfade_distance() {
	var a = arrayfromargs(messagename,arguments);
	if(a.length>1) {
		fade_distance = a[1];
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

function draw_mode(arg) {
	if(arg==="triangles")
		isgrid = 0;
	else
		outlet(0,"draw_mode", "tri_grid");
}

function lighting_enable(arg) {
	lighting = arg;
	if(lighting)
		outlet(0,"auto_material", 0);
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