autowatch=1;
outlets=3;

var drawto = "";
var curmov=-1;
var ispaused=true;
var isstopped=false;
var saveargs=true;
var readcount = 0;
var useseeknotify = 0;
var loopstate = 1;

var filetypes_mac = ["MPEG", "mpg4","MooV"];
var filetypes_win = ["WVC1","WMVA","WMV3","WMV2"];
var filetypes = filetypes_mac;

var movies = new Object();
// "movie" : movie ob,
// "index" : movie index,
// "listener" : movie listener,
// "thumb" : thumbnail matrix
var movnames = new Array();

var savedargs = new Array();
var dummymatrix = new JitterMatrix(4,"char",320,240);
var swaplisten=null;

var thumbs = new Array();

var outtex = "jit_gl_texture";
var outmat = "jit_matrix";

var verbose = true;
function postln(arg) {
	if(verbose)
		post(arg+"\n");
}

function swapcallback(event){	
	if (event.eventname=="swap" && !ispaused) {
		drawmovie();
	} 
	//post("callback: " + event.subjectname + " sent "+ event.eventname + " with (" + event.args + ")\n");
}

function movcallback(event){
	if(event.eventname==="read") {
		if(generatethumb) {
			getmovie_name(event.subjectname).position = thumbpos;
			movies[event.subjectname].thumb = null; // freepeer()?
			//if(!useseeknotify) 
			//	movies[event.subjectname].thumb = getthumbnail(getmovie_name(event.subjectname));
		}
		if(++readcount == movnames.length)
			outlet(1, "readfolder", "done");
	}
	else if(event.eventname==="seeknotify") {
		if(generatethumb && movies[event.subjectname].thumb === null) {
			//movies[event.subjectname].thumb = getthumbnail(getmovie_name(event.subjectname));
		}	 
	}

	//post("callback: " + event.subjectname + " sent "+ event.eventname + " with (" + event.args + ")\n");		
}

function bang() {
	if(!drawtexture() && !ispaused)
		drawmovie();
}

function drawmovie() {
	var o = getmovie_index(curmov);
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

function initmovie(o) {
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

	if(o.engine=="avf")
		useseeknotify = 1;
}

function clear() {
	readcount = 0;
	ispaused = true;
	for(n in movies) {
		getmovie_name(n).freepeer();
	}
	movnames.splice(0,movnames.length);
	movies = new Object();
	thumbs.splice(0,thumbs.length);
}

function readfolder(arg) {
	clear();
	
	var f = new Folder(arg);
	var fpath = f.pathname;
	var fcount = f.count;
	var i=0;

	f.reset();
	while (!f.end) {
		if(ismovie(f.filetype)) {
			postln(fpath+f.filename);
			var o = new JitterObject("jit.movie");
			initmovie(o);
			var rval = o.asyncread(fpath+f.filename);
			if(rval[1]) addmovie(o, i++);				 
		}
		f.next();
	}
	doargattrs();
}

function addmovie(o, i) {
	var regname = o.getregisteredname();
	movnames.push(regname);
	movies[regname] = new Object();
	movies[regname]["movie"] = o;
	movies[regname]["index"] = i;
	movies[regname]["listener"] = new JitterListener(regname,movcallback);
	movies[regname]["thumb"] = null;
	postmovinfo(movies[regname]);
}

function postmovinfo(m) {
	postln("movie info for movie index: "+m.index);
	postln("name: "+m.movie.moviename);
}

/////////////////////////////////////////////
// #mark Playback
/////////////////////////////////////////////

function pause() {
	ispaused = true;
	if(curmov >= 0)
		getmovie_index(curmov).stop();	
}

function start() {
	doplay();
}

function stop() {
	pause();
	isstopped = true;
}

function scrub(pos) {
	ispaused = false;
	getmovie_index(curmov).position = pos;
}

function doplay() {
	getmovie_index(curmov).start();
	ispaused = false;
	isstopped = false;
}

function play() {
	var i=0;	
	if(arguments.length)
		var i=arguments[0];
		
	if(i < movnames.length && i >= 0) {
		pause()
		curmov=i;
		postln("playing movie: "+curmov+" "+getmovie_index(curmov).moviefile);
		if(!isstopped)
			doplay();
		getmovie_index(curmov).loop = loopstate;
	}
}

function loop(state) {
	loopstate = state;
	if((m = getmovie_index(curmov))) {
		m.loop = loopstate;
	}
}

/////////////////////////////////////////////
// #mark Args Attrs and Messages
/////////////////////////////////////////////
function done() {
	saveargs=false;
}

function doargattrs() {
	for(n in movies) {
		var m = getmovie_name(n);
		postln("moviefile: "+m.moviefile);
		for(i in savedargs) {
			var str = savedargs[i];
			var ary = str.split(",");
			sendmovie(m, ary[0], ary.slice(1,ary.length));
		}
	}
}

function setmovieattr(arg, val) {	
	//if (Function.prototype.isPrototypeOf(mov[messagename])) {
	for(n in movies) 
		getmovie_name(n)[arg]=val;
}

function anything() {
	if(saveargs) {
		var a = arrayfromargs(arguments);
		var e = messagename+","+a.join();
		savedargs.push(e);
	}
	if(curmov>=0) {
		var a = arrayfromargs(arguments);
		sendmovie(getmovie_index(curmov),messagename, a);
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
		postln("sending message "+mess);
		movie[mess](args);
	} 
	else if(mess.search("get")==0) {
		var attr=mess.substr(3, mess.length);
		//postln("getting attr "+attr);
		outlet(1, attr, movie[attr]);
	}
	else {
		//postln("setting attr "+mess);
		movie[mess] = args;	
	}	
}

/////////////////////////////////////////////
// #mark GUI
/////////////////////////////////////////////

var guidrawto;
var guimatrix;
var guivp;
var guirender;
var generatethumb = 0;
var maxh=120;
var thumbpos = 0.25;

var tmatrix = new JitterMatrix(4,"char",80,60);

function setguidrawto(arg) {
	if(arg !== guidrawto) {
		postln("initing gui with context: "+arg);
		guidrawto=arg;
		initgui();
		generatethumb=1;
	}
	postln("sending matrix");
	tmatrix.setall(80);
	guimatrix.dstdimstart = [80,60];
	guimatrix.dstdimend = [159,119];
	guimatrix.frommatrix(tmatrix.name);
	guidraw();
}

function setguisize(arg) {
	var s = arrayfromargs(messagename,arguments);
	guimatrix.dim=s;
}

function initgui() {
	guirender = new JitterObject("jit.gl.render",guidrawto);
	guimatrix = new JitterMatrix(4,"char",320,240);
	//guimatrix.adapt=0;
	dummymatrix.setall(0);
	guimatrix.frommatrix(dummymatrix.name);
	guimatrix.usedstdim=1;
	//guimatrix.usesrcdim=1;
	tmatrix.setall(120);
	guimatrix.dstdimstart = [0,0];
	guimatrix.dstdimend = [79,59];
	guimatrix.frommatrix(tmatrix.name);

	guivp = new JitterObject("jit.gl.videoplane", guidrawto); 
	guivp.transform_reset = 2;
	guivp.jit_matrix(guimatrix.name);
}

function getthumbnail(mov) {
	//postln("get thumb for mov "+mov.moviename+", index: "+index);
	var mdim = mov.moviedim;
	var aspect = mdim[0]/mdim[1];
	mdim[0] = maxh*aspect;
	mdim[1] = maxh;
	postln("creating thum matrix with dims "+mdim+" at time: "+mov.time);
	var tmatrix = new JitterMatrix(4,"char",mdim[0],mdim[1]);
	var drawtex = drawtexture();
	mov.output_texture=0;
	mov.matrixcalc(tmatrix,tmatrix);
	dummymatrix.setall(120);
	guimatrix.dstdimstart = [80,60];
	guimatrix.dstdimend = [159,119];
	guimatrix.frommatrix(dummymatrix.name);
	guidraw();
	return tmatrix;
}

function guidraw() {
	guirender.erase();
	guirender.drawclients();
	guirender.swap();
}