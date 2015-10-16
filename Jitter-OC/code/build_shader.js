include("String.prototype.template");

function greetings(user) {
  return 'Hello ${user.name}!'.template({user: user});
}


function applytemplate(tex) {
	var f = new File(getPathToCodeFolder()+"gm.wireframe.fp.glsl","read"); 
	return(f.readtext().template({tex : tex})).replace(/\s*undefined/g, "\n");
}
	
function testjson()
{
	//var d = new Dict();
	//d.import_json("shader-parts.json");
	//var str = d.stringify();				// convert dict to string
	//var json = JSON.parse(str);				// parse the string as a JS Object
	//var params = json["jxs-parts"]["param"]["common"];
	//post(params[0]+"\n");
	post('test1 ${1 + 2} test2 ${3 + 4}'.template());		
	post(greetings({name:'Andrea'}));
	var json = getjson();	
	post(applytemplate(json["wireframe-glsl"]["tex-solid"]));
}

function getjson()
{
	var d = new Dict();
	d.import_json("shader-parts.json");
	var str = d.stringify();				// convert dict to string
	var json = JSON.parse(str);				// parse the string as a JS Object
	return json;
}

function writelines(f, lines)
{
	for (l in lines) {
		f.writestring(lines[l]+"\n");
	}
}

function getPathToCodeFolder()
{
	var p = new File(this.patcher.filepath,"read");
	return p.foldername+"/../code/";
}

function writejxs(s)
{
	var path = getPathToCodeFolder()+s;
	var f = new File(path,"write","TEXT"); 
	var json = getjson();
	if (f.isopen && json) {
		
		post("writing jxs to : " + path + "\n");
		
		var parts = json["wireframe-jxs"];
		
		f.writestring("<jittershader>\n");
		
		var params = parts["param"]["common"];
		writelines(f, params);
		
		f.writestring("<language name=\"glsl\" version=\"1.2\">\n");
			
		var binds = parts["bind"]["common"];
		writelines(f, binds);
		var pgms = parts["program"]["common"];
		writelines(f, pgms);
		f.writestring(parts["program"]["tri-grid"][0]+"\n");
		
		f.writestring("</language>\n");
		f.writestring("</jittershader>\n");
		
		f.close();
	} else {
		post("could not create file: " + s + "\n");
	}
}

function readfile(s)
{
	var f = new File(s);
	var i,a,c;

	if (f.isopen) {
		c = f.eof;
		for (i=0;i<c;i++) {
			a = f.readchars(1); //returns an array of single character strings
			post("char at fileposition[" + f.position + "]: " + a + "\n");
		}
		f.close();
	} else {
		post("could not open file: " + s + "\n");
	}
}

function copyfile(src,dst)
{
	var i,a,c;
	var srcfile = new File(src,"read"); 
	if (srcfile.isopen) {
		var dstfile = new File(dst,"write",srcfile.filetype); 
		c = srcfile.eof;
		if (dstfile.isopen) {
			post("copying: " + src + " to " + dst + "\n");
			for (i=0;i<c;) {
				a = srcfile.readbytes(32); //returns array of bytes, in this case upto 32 at a time
				if (a.length) {
					dstfile.writebytes(a);
					i += a.length;
				} else {
					break; //shouldn't get here, but just incase
				}
			}
			dstfile.eof = c;
			dstfile.close();
		} else {
			post("could not create file: " + dst + "\n");
		}
		srcfile.close();
	} else {
		post("could not create file: " + src + "\n");
	}
}

function readlines(s)
{
	var f = new File(s);
	var i,a,c;

	if (f.isopen) {
		i=0;
		while (a=f.readline()) { // returns a string
			post("line[" + i + "]: " + a + "\n");
			i++;
		}
		f.close();
	} else {
		post("could not open file: " + s + "\n");
	}
}
