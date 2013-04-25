"use strict";

function Sky(loader) {
	this.M = new SuperMesh(loader,"assets/box.spec.mesh");
	
}

Ship.prototype.draw = function(prog){
	this.bboxMin = this.M.bbox.slice(0,3);
    //console.log(this.bboxMin);
    prog.setUniform("objmin", this.bboxMin);
    prog.setUniform("worldMatrix",this.RT);
    this.M.draw(prog);
}
