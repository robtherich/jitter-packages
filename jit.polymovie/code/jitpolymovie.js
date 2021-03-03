autowatch=1;
outlets=3;
// outlet 0 = jit_matrix / jit_gl_texture
// outlet 1 = movie attributes
// outlet 2 = special messages

var drawto = "";
var curmov=-1;
var ispaused=true;
var isstopped=false;
var saveargs=true;
var readcount = 0;
var useseeknotify = 0;
var loopmode = 1;

var filetypes_mac = ["MPEG", "mpg4","MooV"];
//var filetypes_win = ["WVC1","WMVA","WMV3","WMV2"];
var filetypes = filetypes_mac;

var moviedict = new Dict();
var movies = new Object();
// "movie" : jit.movie object,
// "index" : movie index,
// "listener" : movie listener,

var movnames = new Array();
var curmovob = null;
var movct = 0;

var savedargs = new Array();
var dummymatrix = new JitterMatrix(4,"char",320,240);
var swaplisten=null;

const outtex = "jit_gl_texture";
const outmat = "jit_matrix";

var verbose = true;
function postln(arg) {
	if(verbose)
		post(arg+"\n");
}

const is820 = (max.version >= 820);
var tmp = JitterObject("jit.movie");
const engine = tmp.engine;
tmp.freepeer();
const isViddll = (engine === "viddll");
if(isViddll) {
	postln("polymovie using viddll engine");
}
else {
	postln("polymovie using avf engine");
}

// bug in viddll engine asyncread if version is < 8.2
// users can override here if asyncread is causing issues
const useAsync = (is820 || !isViddll);

function swapcallback(event){	
	if (event.eventname=="swap" && !ispaused) {
		drawmovie();
	}
}

function movcallback(event){
	if(event.eventname==="read") {
		var m = movies[event.subjectname];
		finalizemovie(m);

		if(readcount == movnames.length) {
			finalizeread();
		}
	}
	else if(event.eventname==="seeknotify") {
	 
	}
	//post("callback: " + event.subjectname + " sent "+ event.eventname + " with (" + event.args + ")\n");		
}

function bang() {
	if(!drawtexture() && !ispaused)
		drawmovie();
}

function drawmovie() {
	if(!curmovob)
		return;

	var o = curmovob;
	if(drawtexture()) {
		o.matrixcalc(dummymatrix,dummymatrix);
		outlet(0,outtex,o.texture_name);
	}
	else {
		var movdim = o.movie_dim;
		var matdim = dummymatrix.dim;
		if(movdim[0]!=matdim[0] || movdim[1]!=matdim[1])
			dummymatrix.dim=movdim;
		o.matrixcalc(dummymatrix,dummymatrix);
		outlet(0,outmat,dummymatrix.name);
	}
	outlet(1, "position", o.position);
}

function drawtexture() {
	return !(drawto==="");
}

function getmovie_index(i) {
	if(i>=0 && i<movnames.length) 
		return movies[movnames[i]]["movie"];
	return null;
}

function getmovie_name(n) {
	return movies[n]["movie"];
}

/////////////////////////////////////////////
// #mark Read and Init
/////////////////////////////////////////////

function finalizeread() {
	outlet(2, "readfolder", "done", readcount);
	outlet(2, "dictionary", moviedict.name);
}

function finalizemovie(m) {
	readcount++;
	moviedict.replace(m.index+"::name", m.movie.moviename);
	moviedict.replace(m.index+"::path", m.movie.moviepath);

	// overwrite full path with filename
	outlet(2, "movielist", "setitem", m.index, m.movie.moviename);
	
	postln("movie info for movie index: "+m.index);
	postln("name: "+m.movie.moviename);
}

function setdrawto(arg) {
	if(arg) {
		drawto=arg;
		setmovieattr("drawto",drawto);
		setmovieattr("output_texture",1);
		swaplisten = new JitterListener(drawto,swapcallback);
	}
	else {
		drawto=""
		setmovieattr("drawto",drawto);
		setmovieattr("output_texture",0);
		swaplisten = null;
	}	
}

function ismovie(t) {
	for(f in filetypes) {
		if(filetypes[f]===t)
			return true;
	}
	return false;
}

function clear() {
	readcount = 0;
	ispaused = true;
	for(n in movies) {
		getmovie_name(n).freepeer();
	}
	movnames.splice(0,movnames.length);
	movies = new Object();
	curmovob = null;

	moviedict.clear();
	movct = 0;

	outlet(2, "movielist", "clear");
}

function readfolder(arg) {
	clear();
	appendfolder(arg);
}

function appendfolder(arg) {
	var f = new Folder(arg);
	var fpath = f.pathname;
	var fcount = f.count;
	f.reset();

	while (!f.end) {
		if(ismovie(f.filetype)) {
			postln(fpath + f.filename);
			addmovie(fpath + f.filename);
		}
		f.next();
	}
	doargattrs();
	if(!useAsync) {
		finalizeread();
	}
}

function appendmovie(path) {
	addmovie(path)
	doargattrs();
}

function addmovie(path) {
	var o = new JitterObject("jit.movie");
	o.autostart=0;
	o.automatic=0;
	if(drawto==="") {
		postln("disable output_texture")
		o.output_texture=0;
	}
	else {
		postln("enable output_texture")
		o.output_texture=1;
		o.drawto=drawto;
	}

	// engine specific stuff goes here...
	if(o.engine=="avf")
		useseeknotify = 1;
	
	var idx = movct++;
	var regname = o.getregisteredname();
	movnames.push(regname);
	var m = new Object();
	movies[regname] = m;
	m.movie = o;
	m.index = idx;
	m.listener = new JitterListener(regname, movcallback);

	// placeholder values, will overwrite in finalizemovie
	moviedict.setparse(m.index, '{ "name" : "'+m.movie.moviename+'", "path" : "' + m.movie.moviepath + '"}' );
	
	// placeholder for proper umenu ordering
	outlet(2, "movielist", "append", m.path);
	
	if(useAsync) {
		o.asyncread(path);
	}
	else {
		o.read(path);
		finalizemovie(m);
	}
}

function dictionary(dname) {
	postln("reading dictionary " + dname);
	var d = new Dict(dname);
	var keys = d.getkeys();
	if(!keys)
		return;
	
	clear();

	// convert single value to array
	if(typeof(keys) === "string") {
		keys = [keys];
	}
	keys.forEach(function (key, i) {
		var m = d.get(key);
		addmovie(m.get("path"));
	});

	// apply arg attrs first...
	doargattrs();

	// then apply dictionary attrs
	keys.forEach(function (key, i) {
		var m = d.get(key)
		var attrs = m.get("attributes");
		if(attrs) {
			var akeys = attrs.getkeys();
			var movie = getmovie_index(i);

			// convert single value to array
			if(typeof(akeys) === "string") {
				akeys = [akeys];
			}
			akeys.forEach(function (akey, j) {
				//postln("attribute: " + akey + ", vals: " + attrs.get(akey));
				if(movie) {
					sendmovie(movie, akey, attrs.get(akey));
				}
			});
		}
	});
	
	if(!useAsync) {
		finalizeread();
	}
}

function writedict() {
	writeloopstatetodict(curmovob);
	if(arguments.length) {
		moviedict.export_json(arguments[0]);
	}
	else {
		moviedict.export_json();
	}
}

function readdict() {
	var d = new Dict();
	if(arguments.length) {
		d.import_json(arguments[0]);
	}
	else {
		d.import_json();
	}
	dictionary(d.name);
}

function getdict() {
	writeloopstatetodict(curmovob);
	outlet(2, "dictionary", moviedict.name);
}

// maybe not an issue, but only write looppoints on movie changes or dictionary writes
function writeloopstatetodict(ob) {
	if(ob) {
		var idx = movies[ob.getregisteredname()].index;
		moviedict.replace(idx + "::attributes::looppoints_secs", ob.looppoints_secs);
	}
}

// loop state is reset on file read, so grab it from the dictionary when playback triggered
function readloopstatefromdict(ob) {
	if(ob) {
		var idx = movies[ob.getregisteredname()].index;
		if(moviedict.contains(idx + "::attributes::looppoints_secs")) {
			ob.looppoints_secs = moviedict.get(idx + "::attributes::looppoints_secs");
		}
	}
}

/////////////////////////////////////////////
// #mark Playback
/////////////////////////////////////////////

function movieindexvalid(idx) {
	return (idx < movnames.length && idx >= 0);
}

function pause() {
	ispaused = true;
	if(curmovob)
		curmovob.stop();	
}

function start() {
	doplay();
}

function stop() {
	pause();
	isstopped = true;
}

function scrub(pos) {
	if(curmovob) {
		curmovob.position = pos;
		ispaused = false;
	}
}

function doplay() {
	if(curmovob) {
		curmovob.start();
		ispaused = false;
	}
	isstopped = false;
}

function play() {
	var i=0;	
	if(arguments.length)
		var i=arguments[0];
		
	if(movieindexvalid(i)) {
		pause();
		writeloopstatetodict(curmovob);

		curmov = i;
		curmovob = getmovie_index(curmov);
		postln("playing movie: " + curmov + " " + curmovob.moviefile);
		if(!isstopped)
			doplay();
		ispaused = false;
		
		curmovob.loop = loopmode;
		readloopstatefromdict(curmovob);
		var loopi = curmovob.looppoints_secs[0] / curmovob.seconds;
		var loopo = curmovob.looppoints_secs[1] / curmovob.seconds;
		// output normalized looppoints for GUI
		outlet(1, "looppoints", loopi, loopo);
	}
}

/////////////////////////////////////////////
// #mark Args Attrs and Messages
/////////////////////////////////////////////

// from patcherargs
function done() {
	saveargs=false;
}

function doargattrs() {
	for(n in movies) {
		var m = getmovie_name(n);
		for(i in savedargs) {
			var str = savedargs[i];
			var ary = str.split(",");
			sendmovie(m, ary[0], ary.slice(1,ary.length));
		}
	}
}

function setmovieattr(arg, val) {	
	for(n in movies) 
		getmovie_name(n)[arg] = val;
}

function anything() {
	if(saveargs) {
		var a = arrayfromargs(arguments);
		var e = messagename+","+a.join();
		savedargs.push(e);
	}
	if(curmovob) {
		var a = arrayfromargs(arguments);
		sendmovie(curmovob, messagename, a);
	}
}

function sendmovies() {
	var a = arrayfromargs(arguments);
	var mess = a[0];
	if(a.length>1)
		a.splice(0,1)
		
	for(n in movies) {
		sendmovie(getmovie_name(n),mess, a);
	}	
}

function sendmovie(movie, mess, args) {
	if (Function.prototype.isPrototypeOf(movie[mess])) {
		postln("sending message " + mess + " with args " + args);
		movie[mess](args);
	} 
	else if(mess.search("get")==0) {
		var attr=mess.substr(3, mess.length);
		postln("getting attr " + attr);
		outlet(1, attr, movie[attr]);
	}
	else {
		postln("setting attr " + mess + " with args " + args);
		movie[mess] = args;	
		var regname = movie.getregisteredname();
		var idx = movies[regname].index;
		moviedict.replace(idx + "::attributes::" + mess, args);
	}	
}

// special case handlers for position and loop attrs
function position(p) {
	if(curmovob) {
		curmovob.position = p;
	}
}

function loop(state) {
	loopmode = state;
	if(curmovob) {
		curmovob.loop = loopmode;
	}
}

function looppoints(loopi, loopo) {
	if(curmovob) {
		if(loopi <= 1. && loopo <= 1.) {
			// special polymovie normalized looppoints
			var loopsecin = (loopi < loopo ? loopi : loopo) * curmovob.seconds;
			var loopsecout = (loopi < loopo ? loopo : loopi) * curmovob.seconds;
			curmovob.looppoints_secs = [loopsecin, loopsecout];
		}
		else {
			// conventional looppoints
			curmovob.looppoints = [loopi, loopo];
		}
	}
}

function automatic(v) {
	post("modifying automatic unsupported\n");
}

function autostart(v) {
	post("modifying autostart unsupported\n");
}

function output_texture(v) {
	post("modifying output_texture unsupported\n");
}