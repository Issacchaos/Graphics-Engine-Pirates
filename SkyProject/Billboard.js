
var Billboard = function (locationArray, texture, type) {
	this.vbuff = gl.createBuffer();
	this.vdata = locationArray;
	this.tex = texture;
    gl.bindBuffer(gl.ARRAY_BUFFER,this.vbuff);
    gl.bufferData(gl.ARRAY_BUFFER,this.vdata,gl.STATIC_DRAW);
}

Billboard.prototype.updateUVW = function(prog,viewerU,viewerV,viewerW) {
    prog.setUniform("eyeU",[viewerU[0], viewerU[1], viewerU[2], 1.0]);
    prog.setUniform("eyeV",[viewerV[0], viewerV[1], viewerV[2], 1.0]);
    prog.setUniform("eyeW",[viewerW[0], viewerW[1], viewerW[2], 1.0]);
}

Billboard.prototype.draw = function(prog) {
    gl.bindBuffer(gl.ARRAY_BUFFER,this.vbuff);
	prog.setVertexFormat("position",4,gl.FLOAT);
    prog.setUniform("basetexture",this.tex);
    prog.setUniform("worldMatrix",tdl.identity())
	//camera.draw(prog);
	//console.log(this.vdata.length/4);
	gl.drawArrays(gl.POINTS,0,this.vdata.length/8);
	
}

Billboard.prototype.draw2 = function(prog,camera) {
    gl.bindBuffer(gl.ARRAY_BUFFER,this.vbuff);
	prog.setVertexFormat("position",4,gl.FLOAT,"texcoord",4,gl.FLOAT);
    prog.setUniform("basetexture",this.tex);
    prog.setUniform("worldMatrix",tdl.identity())
	//console.log(this.vdata.length/4);
	gl.drawArrays(gl.POINTS,0,this.vdata.length/8);
	
}