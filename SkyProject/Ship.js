"use strict";

function Ship(loader, chrome){
    this.chrome = (chrome? true:false);
    if (this.chrome)
    {
    	    this.M = new SuperMesh(loader,"assets/chromeship.spec.mesh");
    }
    else
    	    this.M = new SuperMesh(loader,"assets/ship.spec.mesh");
    this.pos = [0,1,0,1];
    this.facing = [1,0,0,0];
    this.zeroanglefacing = [1,0,0,0];
    this.angle=0;
    this.R = tdl.identity();
    this.T = tdl.identity();
    this.RT = tdl.identity();
    this.turn(0);    //update matrices
    this.walk(0);
}

Ship.prototype.turn = function(a){
    this.angle += a;
    while(this.angle < 0 )
        this.angle += 360;
    while(this.angle > 360)
        this.angle -= 360;
    this.R = tdl.axisRotation( [0,1,0],tdl.degToRad(this.angle));
    this.facing = tdl.mul( this.zeroanglefacing , this.R);
    this.RT = tdl.mul(this.R,this.T);
}

Ship.prototype.walk = function(d){
    this.pos = tdl.add(this.pos,tdl.mul(d,this.facing));
    this.T = tdl.translation(this.pos);
    this.RT = tdl.mul(this.R,this.T)
}

Ship.prototype.draw = function(prog){
	this.bboxMin = this.M.bbox.slice(0,3);
    //console.log(this.bboxMin);
    prog.setUniform("objmin", this.bboxMin);
    prog.setUniform("worldMatrix",this.RT);
    this.M.draw(prog);
}

// Set the postion and rotation at a specific position and rotation
Ship.prototype.setPosRot = function(p, a){
    if (p.length != 4)
    {
    	    this.pos = [0,1,0,1];
    }
    else
    {
    	    this.pos = p;
    }
    
    if (a < 0 && a > 360)
    {
    	    this.angle = 0;
    }
    else
    {
    	    this.angle = a;
    }
    
    this.R = tdl.axisRotation( [0,1,0],tdl.degToRad(this.angle));
    this.facing = tdl.mul( this.zeroanglefacing , this.R);
    this.T = tdl.translation(this.pos);
    this.RT = tdl.mul(this.R,this.T);
}


