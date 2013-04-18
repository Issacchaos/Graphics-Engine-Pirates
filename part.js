"use strict";

function setupSmoke(ps)
{

	this.e = ps.createParticleEmitter();
	this.e.setState(tdl.particles.ParticleStateIds.BLEND);
	this.e.setColorRamp(
	[1,.6 , 0, .8,
	1, .8, 1, 0.75,
	1, 1, 1, 0.50,
	1, 1, 1, 0.0]);
	this.e.setParameters({
	numParticles: 50,
	lifeTime: .2, 			// life of each particle
	lifeTimeRange: 3, 	// effects 'shooting' of particles adjust this w/ size for desired effect, 0 = random 
						//		angle, n+ = more linear distrobution
	timeRange: 0, 		// if set to n repeats every n seconds 0 = oneShot
	startSize: .2,	
	endSize: 5,
	velocity:[1.4,1.5,1.4], 
	velocityRange: [5,10,5],
	acceleration: [5, 3, -5]});

	this.smokeOneShot = this.e.createOneShot();	  
}
