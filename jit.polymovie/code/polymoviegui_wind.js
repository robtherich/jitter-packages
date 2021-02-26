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