"use strict";

function Ship(loader){
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
    prog.setUniform("worldMatrix",this.RT);
    this.M.draw(prog);
}
