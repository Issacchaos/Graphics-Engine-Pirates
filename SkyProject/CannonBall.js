//Class file for the Cannon Balls
"use strict";


var CannonBall = function(loader, position, time, direction){
	this.M = new SuperMesh(loader,"assets/ball.spec.mesh");		//Created from the supermesh.
	this.velocity = .30; //Static	
	this.position = position;
	this.direction = [direction[0], direction[1], direction[2], 0];
	this.timeCreated = time;
	this.Alive = false;
	this.T = tdl.identity();
	}

CannonBall.prototype.update = function(){
	
	
	if((Date.now() - this.timeCreated) > 1000 || this.position[1] < 0){
		this.Alive = false;	
	}
	
	this.position = tdl.add(this.position,tdl.mul(this.direction, this.velocity));
	this.grav = -.00001 * (Date.now()- this.timeCreated)
	this.position = tdl.add(this.position, [0,this.grav,0,0]);
	
	this.T = tdl.translation(this.position);
}

CannonBall.prototype.draw = function(prog){
	prog.setUniform("worldMatrix",this.T); 	//Needs updated/set in the update function
	this.M.draw(prog);

}

CannonBall.prototype.reset = function(position, time, direction){
	this.position = position;
	this.timeCreated = time;
	this.direction = [direction[0], direction[1], direction[2], 0];
	this.Alive = true;

}