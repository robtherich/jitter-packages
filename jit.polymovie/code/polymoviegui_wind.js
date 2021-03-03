outlets = 2;
autowatch=1;

var tsk = new Task(mytask, this);	
var win_size = [-1, -1];
var curcnt = 0;

function mytask(){
	var csize = this.patcher.wind.size;
	if(csize[0]!=win_size[0]||csize[1]!=win_size[1]) {
		win_size = csize;
		//outlet(0, "size",win_size);
		if(curcnt>0)
			calc_grid(curcnt);
	}
}

function bang() {
	//pos = [0,0,640,480];
	//this.patcher.message("window", "size", pos[0], pos[1], pos[2], pos[3]);
	//this.patcher.message("window", "exec");
	tsk.cancel();
	tsk.interval = 100;
	tsk.repeat(); 
	outlet(0, "getname");
}

function closebang() {
	tsk.cancel();
}

function gcd (a, b) {
	return (b == 0) ? a : gcd (b, a%b);
}

function calc_grid(cnt) {
	if(cnt == curcnt) 
		return;
		
	curcnt = cnt;
	var w = win_size[0];
	var h = win_size[1];
	//var r = gcd (w, h);
	var i=2;
	var curaspect = w/h;
	var mindist = 1000;
	var minindex = -1;
	var halfcnt=cnt/2;
	
	for(i=2; i<halfcnt; i++) {
		var testaspect = i/Math.ceil(cnt/i);
		var dist = Math.abs(curaspect-testaspect);
		if(dist<mindist) {
			mindist=dist;
			minindex = i;
		}
	}
	var minj = Math.ceil(cnt/minindex);
	outlet(1, "grid",minindex,minj);
}


// stash here for now


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