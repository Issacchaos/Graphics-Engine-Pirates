"use strict"

function Ocean(loader){
	this.M = new SuperMesh(loader,"assets/ocean.spec.mesh");
	
	this.camera;
}

Ocean.prototype.draw = function(prog, camera){
	this.gw = this.M.bbox[3]-this.M.bbox[0];
	this.gh = this.M.bbox[5]-this.M.bbox[2];
	this.camera = camera;
	this.frustrum();
	prog.setUniform("worldMatrix", tdl.identity());
	var mini = Math.floor(this.minx / this.gw);
	var minj = Math.floor(this.minz / this.gh);
	var maxi = Math.floor(this.maxx / this.gw);
	var maxj = Math.floor(this.maxz / this.gh);

	for(var i=mini - 2;i<=maxi + 3;++i){
		for(var j=minj - 2;j<=maxj + 3;++j){
			 var tx = i*this.gw;
			 var tz = j*this.gh;
			 var trans = tdl.translation([tx,0,tz]);
			 prog.setUniform("trans",trans);
			 this.M.draw(prog);
			
		}
	}

}

Ocean.prototype.frustrum = function(){
	//camera is the camera object
	//eye, right(U vector), up(V vector), anti-look(W vector),
	//hither, yon, fov, ar 

	//First find the width and height of the two
	//view planes (hither and yon)
	
	//Hither plane
	this.Hheight = 2 * Math.tan(this.camera.fov / 2) * this.camera.hither;
	this.Hwidth = this.Hheight * this.camera.ar;
	//Yon plane
	this.Yheight = 2 * Math.tan(this.camera.fov / 2) * this.camera.yon;
	this.Ywidth = this.Yheight * this.camera.ar;
	
	//Second, move to one of the corners of each of
	//the planes and find the 4 corners of each (8 total)
	//Hither
	var Hp1 = tdl.math.addVector(tdl.math.addVector(tdl.math.addVector(this.camera.eye, tdl.math.mulScalarVector(this.camera.hither, tdl.math.negativeVector(this.camera.W))), tdl.math.mulScalarVector((this.Hheight / 2), this.camera.V)), tdl.math.mulScalarVector((this.Hwidth / 2), this.camera.U));
	var Hp2 = tdl.math.addVector(Hp1, (tdl.math.mulScalarVector(this.Hheight, tdl.math.negativeVector(this.camera.V))));
	var Hp3 = tdl.math.addVector(Hp2, (tdl.math.mulScalarVector(this.Hwidth, tdl.math.negativeVector(this.camera.U))));
	var Hp4 = tdl.math.addVector(Hp3, (tdl.math.mulScalarVector(this.Hheight, this.camera.V)));
	
	//Yon
	var Yp1 = tdl.math.addVector(tdl.math.addVector(tdl.math.addVector(this.camera.eye, tdl.math.mulScalarVector(this.camera.yon, tdl.math.negativeVector(this.camera.W))), tdl.math.mulScalarVector((this.Yheight / 2), this.camera.V)), tdl.math.mulScalarVector((this.Ywidth / 2), this.camera.U));
	var Yp2 = tdl.math.addVector(Yp1, (tdl.math.mulScalarVector(this.Yheight, tdl.math.negativeVector(this.camera.V))));
	var Yp3 = tdl.math.addVector(Yp2, (tdl.math.mulScalarVector(this.Ywidth, tdl.math.negativeVector(this.camera.U))));
	var Yp4 = tdl.math.addVector(Yp3, (tdl.math.mulScalarVector(this.Yheight, this.camera.V)));
	
	//Find min and max
	this.minx = Math.min(Hp1[0], Hp2[0], Hp3[0], Hp4[0], Yp1[0], Yp2[0], Yp3[0], Yp4[0]);
	this.maxx = Math.max(Hp1[0], Hp2[0], Hp3[0], Hp4[0], Yp1[0], Yp2[0], Yp3[0], Yp4[0]);
	this.minz = Math.min(Hp1[2], Hp2[2], Hp3[2], Hp4[2], Yp1[2], Yp2[2], Yp3[2], Yp4[2]);
	this.maxz = Math.max(Hp1[2], Hp2[2], Hp3[2], Hp4[2], Yp1[2], Yp2[2], Yp3[2], Yp4[2]);
	
}