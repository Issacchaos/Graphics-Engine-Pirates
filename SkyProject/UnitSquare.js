"use strict";

function UnitSquare(d){
    if( d === undefined) 
    d=0;
    this.d=d;
    this.initialized=false;
}

UnitSquare.prototype.draw = function(prog){
    if(!this.initialized ){
        var d = this.d;
        var vdata;
        vdata=new Float32Array(
              [ -1, 1,d,1,   0,1,0,0,    0,0,1,0,
                -1,-1,d,1,   0,0,0,0,    0,0,1,0,
                 1, 1,d,1,   1,1,0,0,    0,0,1,0,
                 1,-1,d,1,   1,0,0,0,    0,0,1,0] );
        var vb = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER,vb);
        gl.bufferData(gl.ARRAY_BUFFER,vdata,gl.STATIC_DRAW);
        this.vbuff=vb;
        this.initialized=true;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER,this.vbuff);
    prog.setVertexFormat("position",4,gl.FLOAT,"texcoord",4,gl.FLOAT,"",4,gl.FLOAT);
    gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
}
