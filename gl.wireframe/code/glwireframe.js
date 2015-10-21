include("String.prototype.template");

// build options
var texture_lines=0;
var quad=0;
var discard=0;
var light_type="directional";
var texture_rect=-1;
declareattribute("texture_lines",null,"settexture_lines",0);
declareattribute("quad",null,"setquad",0);
declareattribute("discard",null,"setdiscard",0);
declareattribute("light_type",null,"setlight_type",0);
declareattribute("texture_rect",null,"settexture_rect",0);
	
// shader attributes
var line_color = [1.,0.,0.,1.];
var line_width=1.;
declareattribute("line_color",null,"setline_color",0);
declareattribute("line_width",null,"setline_width",0);

// object properties
var isgrid=true;
var hastex=false;
var lighting=false;
var texrect=true;

var debug = 0;

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
		jxsname+="_texture";
		if(texrect)jxsname+="_rect";
	}
	if(texture_lines) jxsname+="_texlines";
	if(lighting) jxsname+="_"+light_type;
	if(!isgrid) jxsname+="_triangles";
	else jxsname+="_trigrid";
	if(quad)jxsname+="_quad";
	if(discard)jxsname+="_discard";
	return jxsname+".jxs"
}

function getjson(){
	var d = new Dict();
	d.import_json(shaderjson);
	var str = d.stringify();				// convert dict to string
	var json = JSON.parse(str);				// parse the string as a JS Object
	return json;
}

function writelines(f, lines) {
	for (l in lines)
		f.writestring(lines[l]+"\n");
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
			
		f.writestring("<language name=\"glsl\" version=\"1.2\">\n");
			
		writelines(f, jxs["bind"]["common"]);
		if(hastex)
			writelines(f, jxs["bind"]["texture"]);
		
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
		(lighting ? glsl["light"] : 0)
	));
	close_program_jxs(f);
	
	// geometry program
	glsl = json["wireframe-glsl"]["gp"];
	if(!isgrid)	open_program_jxs(f, jxs["program"]["gp-triangles"]);
	else open_program_jxs(f, jxs["program"]["gp-trigrid"]);
	f.writestring(applytemplate_gp(gpglsl,
		(hastex ? glsl["tex"] : 0), 
		(lighting ? glsl["light"] : 0), 
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
			(discard ? glsl["discard"] : 0)
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

function applytemplate_fp(file, tex, light, discard) {
	postln("applying fp template to "+path_to_code_folder+file);
	var f = new File(path_to_code_folder+file,"read");
	return fixtemplate(f.readtext().template({tex:tex, light:light, discard:discard}));
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
	post(applytemplate_fp(fpglsl, 0, get_light_glsl(json["fp"]["light"]), 0));	
}

function postln(arg) {
	if(debug)
		post(arg+"\n");
}

function printd(d) {
	if(typeof d === 'string')
		postln(d);
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