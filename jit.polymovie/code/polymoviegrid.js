autowatch=1;

var rows = 1.;
declareattribute("rows", null, null);
var cols = 1.;
declareattribute("cols", null, null);

var count = 10;
declareattribute("count", null, "setcount", 1);

var drawto = "";
declareattribute("drawto", null, null);

var verbose = 1;
declareattribute("verbose", null, null, 1);

var winsize = [640, 480];
declareattribute("winsize", null, "setwinsize");

var winaspect = 1.
var vpaspect = 1.;
var vplanes = [];

dummy = new JitterObject("jit.gl.videoplane");
dummy.freepeer();

var implicit_tracker = new JitterObject("jit_gl_implicit");
var lstnr = new JitterListener(implicit_tracker.name, callbackfun);

function callbackfun(event) {
	if(drawto === "" && drawto !== implicit_tracker.drawto) {
		drawto = implicit_tracker.drawto;
        postln("drawto " + drawto);
	}
}
callbackfun.local = 1;

function findbestfit(dir) {
    postln("current fit: rows "+rows+" cols "+cols+" vaspect "+vpaspect + " testaspect "+vpaspect * winaspect);
    iters = 0;
    do {
        if(!dir) {
            // too wide
            if(rows == 1) {
                postln("rows == 1, exiting")
                break;
            }
            rows -= 1;
            while(count > (rows*cols)){
                cols++;
            }
        } 
        else {
            // too long
            if(cols == 1) {
                postln("cols == 1, exiting")
                break;
            }
            cols -= 1;
            while(count > (rows*cols)){
                rows++;
            }
        } 
        vpaspect = (rows / cols);
        postln("new fit: rows "+rows+" cols "+cols+" vaspect "+vpaspect + " testaspect "+vpaspect * winaspect);
    } while((++iters < 40) && testaspect(vpaspect * winaspect) !== 0 && rows > 1 && cols > 1);
}


// -1 if low, 1 if high, else 0
function testaspect(ar) {
    const low = 0.75;
    const high = 1.5;
    return (ar < low ? -1 : ar > high ? 1 : 0);
}

function setcount(v) {
    count = v;
    vpaspect = (rows / cols);
    refit = false;
    if(count > (cols*rows)) {
        // increase
        refit = true;
        amt = cols*rows;
        while(count > amt) {
            amt = (++rows*cols);
            if(count > amt)
                amt = (rows*++cols);
        }
        postln("increased dims " + rows + " " + cols);
    }
    else {
        while(((cols-1) * rows >= count || cols * (rows-1) >= count) && cols > 1 && rows > 1) {
            // decrease
            refit = true;
            if(cols > rows) cols--;
            else rows--;
        }
        postln("decreased dims " + rows + " " + cols);
    }

    if(refit) {
        aspecttest = testaspect((vpaspect = (rows / cols)) * winaspect);
        if(aspecttest !== 0) 
            findbestfit(aspecttest < 0);
        recalc();
    }
}

function setwinsize(w, h) {
    winsize[0] = w;
    winsize[1] = h;
    winaspect = w / h;
    
    postln("winaspect " + winaspect);
    aspecttest = testaspect(winaspect*vpaspect);
    postln("aspecttest " + aspecttest);
    if(aspecttest !== 0) {
        findbestfit(aspecttest < 0);
        recalc();
    }
}

function clear() {
    for(i=0; i<vplanes.length; i++) {
        vplanes[i].freepeer();
    }
    vplanes.splice(0, vplanes.length);
}

function recalc() {
    postln("recalc " + rows + " " + cols);
    clear();
    total = rows*cols;
    cnt = 0;
    margin = 0.01;

    width = 1. / cols;
    height = 1. / rows;

    for(i = 0; i < rows; i++) {
        ypos = (rows - 1) * height;
        ypos = ypos - (height * 2. * i);
        for(j = 0; j < cols; j++) {
            xpos = (cols - 1) * width * -1.;
            xpos += (width * 2. * j);
            vp = new JitterObject("jit.gl.videoplane", drawto);
            vp.transform_reset = 2;
            vp.scale = [width-margin, height-margin, 1.];
            vp.position = [xpos, ypos, 0];
			//postln("pos :"+vp.position);
			//postln("scale :"+vp.scale);
			vplanes.push(vp);
            cnt++;
        }
    }
}

function postln(arg) {
	if(verbose)
		post(arg+"\n");
    
    f = new File("/Users/rob/Desktop/log.txt", "write", "TEXT");
    if(f.isopen) {
        f.position = f.eof;
        f.writeline(arg);
        f.close();
    }
    else {
        post("can't open file \n");
    }
}
postln.local = 1;