

function build_quad_index(w, h) {
	var imat = new JitterMatrix(1,"long",((w-1)*(h-1)*4));
	var cell=0;
	for(j=0; j < h-1; ++j) {
		for(i=0; i < w-1; ++i) {
			imat.setcell1d(cell++, (j*w)+i);
			imat.setcell1d(cell++, ((j+1)*w)+i);
			imat.setcell1d(cell++, ((j+1)*w)+i+1);
			imat.setcell1d(cell++, (j*w)+i+1);
		}
	}
	outlet(0,"jit_matrix",imat.name);
}