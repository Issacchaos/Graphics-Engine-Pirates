"use strict";

/* Written by jh at ssu */

tdl.provide('tdl.unitsquare');
tdl.require('tdl.programs');

tdl.unitsquare = tdl.unitsquare || {};

tdl.unitsquare.unitsquare = function(){
    var vdata;
    vdata=new Float32Array(
          [ -1, 1,  0,1,
            -1,-1,  0,0,
             1, 1,  1,1,
             1,-1,  1,0]);
    var vb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,vb);
    gl.bufferData(gl.ARRAY_BUFFER,vdata,gl.STATIC_DRAW);
    this.vbuff=vb;
}

tdl.unitsquare.unitsquare.prototype.draw = function(prog){
    prog.setVertexFormat("position",4,gl.FLOAT);
    gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
}
