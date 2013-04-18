"use strict";

var gl;
var keys={};
var prog1, prog2;
var then;
var t = 0.0; // time offset for waves
var camera = new Camera({
    eye: [0,5,10],
    coi: [0,0,0],
    up: [0,1,0]
    }
);
var ship;
var ocean;
var nessie;
var cvs;
var currentShip;

//Fur
var furprog;

/*STUFF FOR LENS FLARE*/
var lensCamera = new Camera({
    eye: [0,5,10],
    coi: [10,100,10],
	up: [0,1,0],
    fov: 5
    }
);
var flareProg1, flareProg2, flareProg3, A;
var fboFlare1, fboFlare2;
var flare, ringflare, hexflare;
var glowtex, ringtex, hextex, sunglow;
var vb;

//Firing cannonballs
var pSystem;
tdl.require('tdl.particles');
tdl.require('tdl.fast');
var ball;
var canFire = true;
var canFire2 = true;
var nTimer=Date.now();
var mTimer= Date.now();
var cBalls = [];
var Lsmoke, Rsmoke; 

//Environment Maps
var envmapprog;
var cubetex;
var chromeship;

//Noise
var noiseProg;
var P, pArray; 
var G, gArray;

function main(){
    cvs = document.getElementById("cvs");
    gl = tdl.webgl.setupWebGL(cvs,{stencil:true,alpha:false});
    var loader = new tdl.loader.Loader(loaded);
    
	//Regular shit
	prog1 = new tdl.programs.Program(loader,"shaders/vs.txt","shaders/fs.txt");
	prog2 = new tdl.programs.Program(loader,"shaders/watervs.txt","shaders/waterfs.txt"); // for water
    ship = new Ship(loader, false);
    ocean = new Ocean(loader);
	nessie = new Nessie(loader);
	
	//Lens Flare
	flareProg1 = new tdl.programs.Program(loader,"shaders/flarevs.txt","shaders/flarefs.txt");
	flareProg2 = new tdl.programs.Program(loader,"shaders/flarevsblack.txt","shaders/flarefsblack.txt");
	flareProg3 = new tdl.programs.Program(loader,"shaders/flarevs5.txt", "shaders/flarefs5.txt");
	flare = new UnitSquare();
	ringflare = new UnitSquare();
	hexflare = new UnitSquare();
	glowtex = new tdl.Texture2D(loader,"/assets/flare_bright.png");
	ringtex = new tdl.Texture2D(loader,"/assets/flare_ring.png");
	hextex = new tdl.Texture2D(loader,"/assets/flare_hex.png");
	sunglow = new tdl.Texture2D(loader, "/assets/flare1.png");
	
	//Fur
	furprog = new tdl.programs.Program(loader,"shaders/furVS.txt", "shaders/furFS.txt");

	//Shooting
	for (var i = 0; i < 7; i++)
		cBalls.push(new CannonBall(loader,[0,0,0,1],0,0));
	
	//Environment Maps
	envmapprog = new tdl.programs.Program(loader, "shaders/vs.txt", "shaders/envMapFS.txt");
	cubetex = new tdl.CubeMap(loader, {urls:["assets/cubePX.png", "assets/cubeNX.png", "assets/cubePY.png", "assets/cubeNY.png", "assets/cubePZ.png", "assets/cubeNZ.png"]});
	chromeship = new Ship(loader, true);
	
	//Noise
	noiseProg = new tdl.programs.Program(loader,"shaders/noisevs.txt","shaders/noisefs.txt");
	
    loader.finish();
}

function loaded(){
	//Shooting
	pSystem = new tdl.particles.ParticleSystem(gl, null, tdl.math.pseudoRandom);
	Lsmoke = new setupSmoke(pSystem);
	Rsmoke = new setupSmoke(pSystem);
	
	//Noise
	pArray = new Uint8Array(arrayShuff(256));
	P = new tdl.ColorTexture( {width:256, height: 1, pixels: pArray, format: gl.LUMINANCE} );
	gArray = new Uint8Array(randVec4(256));
	G = new tdl.ColorTexture( {width:256, height: 1, pixels: gArray} );

    document.addEventListener("keydown",keydown);
    document.addEventListener("keyup",keyup);
    setTimeout(update,33);
    tdl.requestAnimationFrame(draw);
    update_camera();
	
	//Lens Flare
	fboFlare1 = new tdl.Framebuffer(16,16,true);
	fboFlare2 = new tdl.Framebuffer(1,1);
	vb = gl.createBuffer(16,16);
	
    gl.clearColor(0.4,0.7,0.9,1.0);
    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
	nessie.setPosRot([9,-3,-10,1], 35);
}

function keydown(ev){
    keys[String.fromCharCode(ev.keyCode)]=true;
}

function keyup(ev){
    keys[String.fromCharCode(ev.keyCode)]=false;
}

function update(){
    setTimeout(update,33);
    
    if(then === undefined ){
        then=Date.now();
        return;
    }
    
    var now = Date.now();
    var elapsed = now-then;
	t += elapsed * 0.05;
    
    var need_camera_update = false;

    if( keys['E'] && canFire == true){ // Placeholder key. Cannon left firing
		canFire = false;
		Rsmoke.smokeOneShot.trigger();
		for(var b = 0; b < cBalls.length; b++)
		{
			if(!cBalls[b].Alive)
			{
				cBalls[b].reset(tdl.math.add(ship.pos, tdl.mul([3.26,1.12,1.34,1], ship.R)),  Date.now(), tdl.math.cross(ship.facing, [0,1,0,0] ));
				nTimer = Date.now();
				break;
			}
		}
	}
	
	if ( keys['Q'] && canFire2 == true){ //Placeholder key. Cannon right firing
		canFire2 = false;
		
		Lsmoke.smokeOneShot.trigger();
		for(var b = 0; b < cBalls.length; b++)
		{
			if(!cBalls[b].Alive)
			{
				cBalls[b].reset(tdl.math.add(ship.pos, tdl.mul([3.26,1.12,-1.34,1], ship.R)),  Date.now(), tdl.math.negativeVector(tdl.math.cross(ship.facing, [0,1,0,0] )));
				mTimer = Date.now();
				break;
			}
		}
	}
	
	if(!canFire && Date.now() - nTimer > 500){					
		canFire = true;
	}
	
	if(!canFire2 && Date.now() - mTimer > 500){		
		canFire2 = true;
	}
    
    if( keys['A'] ){
        ship.turn(0.1*elapsed);
        chromeship.turn(0.1*elapsed);
        need_camera_update=true;
		
		//Calling Hit Detection
	
		if(document.getElementById('collision').checked) {
			HitDetection(ship,nessie,13,13);
		}
		
    }
    if( keys['D']){
        ship.turn(-0.1*elapsed);
        chromeship.turn(-0.1*elapsed);
        need_camera_update=true;
		
		//Calling Hit Detection
	
		if(document.getElementById('collision').checked) {
			HitDetection(ship,nessie,13,13);
		}
		
    }
    if( keys['W']){
        ship.walk(0.01*elapsed);
		chromeship.walk(0.01*elapsed);
        need_camera_update=true;
		
		//Calling Hit Detection
	
		if(document.getElementById('collision').checked) {
			HitDetection(ship,nessie,13,13);
		}
		
    }
    if( keys['S']){
        ship.walk(-0.01*elapsed);
		chromeship.walk(-0.01*elapsed);
        need_camera_update=true;
		
		//Calling Hit Detection
	
		if(document.getElementById('collision').checked) {
			HitDetection(ship,nessie,13,13);
		}
		
    }

    if(keys['I'])
        camera.walk(0.01*elapsed);
    if(keys["K"])
        camera.walk(-0.01*elapsed);
    if(keys["J"])
        camera.turn(0.001*elapsed);
    if(keys["L"])
        camera.turn(-0.001*elapsed);
    if(keys["O"])
        camera.tilt(0.001*elapsed);
    if(keys["P"])
        camera.tilt(-0.001*elapsed);
        
    if( keys["T"])
        camera.strafe(0,0.01*elapsed);
    if( keys["G"])
        camera.strafe(0,-0.01*elapsed);
    if( keys["F"] )
        camera.strafe(-0.01*elapsed,0);
    if( keys["H"] )
        camera.strafe(0.01*elapsed,0);
        
    if(need_camera_update){
        update_camera();
    }
    then=now;
}

function update_camera(){
    //should camera follow ship?
    if(0){
        var p = ship.pos;
        var f = ship.facing;
        f = tdl.mul(-15,f);
        p = tdl.add(p,f);
        p = tdl.add(p,[0,7,0,0]);
        var c = ship.pos;
        c = tdl.add(c,tdl.mul(2,ship.facing));
        camera.set_eye_coi(p,ship.pos,[0,1,0]);
    }
    //Shooting
    var Lpos = tdl.math.add(ship.pos, tdl.mul([3.26,1.12,-1.34,1],ship.R));
	var Rpos = tdl.math.add(ship.pos, tdl.mul([3.26,1.12,1.34,1],ship.R));
	Lsmoke.e.setTranslation(Lpos[0],Lpos[1],Lpos[2]);
	Rsmoke.e.setTranslation(Rpos[0],Rpos[1],Rpos[2]);
}

function dss_keep(){
     gl.stencilOp(gl.KEEP,gl.KEEP,gl.KEEP);
     gl.stencilFunc( gl.ALWAYS,0,~0);
     gl.enable(gl.DEPTH_TEST);
 }
 
 function dss_repl(){
     gl.stencilOp(gl.KEEP,gl.KEEP,gl.REPLACE);
     gl.stencilFunc(gl.ALWAYS,1,~0);
     gl.enable(gl.DEPTH_TEST);
 }
 
 function dss_equal(){
     gl.stencilOp(gl.KEEP,gl.KEEP,gl.KEEP);
     gl.stencilFunc(gl.EQUAL,1,~0);
     gl.enable(gl.DEPTH_TEST);
 }
 
 function dss_nodepth(){
     gl.stencilOp(gl.KEEP,gl.KEEP,gl.KEEP);
     gl.stencilFunc(gl.EQUAL,1,~0);
     gl.disable(gl.DEPTH_TEST);
}

function draw(){
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT );
    
	if(document.getElementById('environ').checked) {
		drawShip(chromeship, envmapprog, true);
	}
	else if(document.getElementById('noise').checked) {
		drawShip(ship, noiseProg, false);
	}
	else{
		drawShip(ship, prog1, false);
	}
	
	drawNessie();
	
	drawOcean();
	
	Shooting();
	
	LensFlare();
    
    tdl.webgl.requestAnimationFrame(draw);
}

function Fur(){
	furprog.use();
	furprog.setUniform("trans", tdl.identity());
	furprog.setUniform("furheight", 0.6);
	furprog.setUniform("gravity", [0.0,-1.0,0.0]);
	
    furprog.setUniform("lightPos",
        [10,100,10,1,  0,0,0,1,  0,0,0,1,  0,0,0,1]  
    );
    furprog.setUniform("lightColor",
        [1,1,1,1,  0,0,0,0,  0,0,0,0,  0,0,0,0 ] 
    );
    
    furprog.setUniform("fogNear",80);
    furprog.setUniform("fogDelta", 30);
    furprog.setUniform("fogColor",[0.4,0.7,0.9,0.7]);
    furprog.setUniform("attenuation",[1,0.0,0.0001,0]);
    
	furprog.setUniform("worldMatrix",tdl.identity());
	camera.draw(furprog);
	nessie.draw(furprog,2);
}

function LensFlare(){
	fboFlare1.texture.unbind();							//making sure the FBO is empty
	fboFlare1.bind();									//binding the fbo to start drawing to it.
	gl.clearColor(0,1,0,1);							//set the clear color to black
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);	//clear the screen as black!
	flareProg2.use();									//using flareProg2 for the black/white drawing
	var L = [10,100,10,1];							//position of the Light
	L = tdl.mul(L, lensCamera.viewProjMatrix);	
	L[0] /= L[3];
	L[1] /= L[3];
	lensCamera.set_eye_coi(camera.eye, [10,100,10,1], [0,1,0]);			//making sure that the lens camera is in the same position as the regular camera.
													//and setting the center of interest to the sun in world space.		
    flareProg2.setUniform("flaretex", glowtex);			//setting the texture for the sun.	
	flareProg2.setUniform("worldMatrix", tdl.math.mul(tdl.math.scaling([1.0,1.0,1.0]), tdl.math.translation([L[0],L[1],0])));									
	flareProg2.setUniform("fbocolor", [1,1,1,1]);	//set color to all white for all pixels drawn to FBO
	flareProg2.setUniform("viewProjMatrix", tdl.identity());
	gl.depthMask(false);
	//drawing the sun texture as all white.
	flare.draw(flareProg2);
	gl.depthMask(true);
	flareProg2.setUniform("fbocolor", [0,0,0,1]);    	//set the color to all black for all pixels drawn to FBO	
	lensCamera.draw(flareProg2);	
	ocean.draw(flareProg2, lensCamera);
	ship.draw(flareProg2);									
	fboFlare1.unbind();								//unbind the FBO	
	//FBO2
	A = new Float32Array(256*2);
	var j = 0;
	for (var s = 0; s<16; ++s){
		for(var g = 0; g < 16; ++g){
			A[j++] = s/16;
			A[j++] = g/16;
		}
	}	
    gl.bindBuffer(gl.ARRAY_BUFFER,vb);	
	gl.bufferData(gl.ARRAY_BUFFER,A,gl.STATIC_DRAW);	
    flareProg3.setVertexFormat("t",2,gl.FLOAT);
    fboFlare2.texture.unbind();
	fboFlare2.bind();
	gl.clearColor(0,0,0,1);							
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	gl.blendFunc(gl.ONE, gl.ONE);
	flareProg3.use();
	flareProg3.setUniform("fbo1", fboFlare1.texture);	
	gl.drawArrays(gl.POINTS,0,(256));	
	fboFlare2.unbind();	
	gl.clearColor(0.4,0.7,0.9,1.0);				//reset the clear color to original color	
	//****************************************************************************************	
	flareProg1.use();								//now on to draw the sun geometry, and lens flares.		
	flareProg1.setUniform("FBO2", fboFlare2.texture);
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE);	
	//L = the position of the light source
	var L = [10,100,10,1];
	
	//L = the position of the light source in world space.
	L = tdl.mul(L, camera.viewProjMatrix);
	L[0] /= L[3];
	L[1] /= L[3];
	var q = Math.max(Math.abs(L[0]), Math.abs(L[1]));
	var alphascale = 1.0 - ((q - 0) / (1.0 - 0));
	alphascale = tdl.math.modClamp(alphascale, 1);
	flareProg1.setUniform("alphascale", alphascale);
	flareProg1.setUniform("flaretex", glowtex);	
	//scaling the texture and moving it into world space
	flareProg1.setUniform("worldMatrix", tdl.math.mul(tdl.math.scaling([0.15,0.15,1.0]), 
									tdl.math.translation([L[0],L[1],0])));
	//draw the sun geometry of the sun to its place in world space(computed above).	
	//if the sun is on the screen (at least half way) lens flares will be drawn.
	if(tdl.dot(camera.W, lensCamera.W) >= 0){
		if(L[0] > -1 && L[0] < 1 && L[1] > -1 && L[1] < 1){			
			flare.draw(flareProg1);			
			//to create more or less lens flares
			//change the value that i is <= to.
			//initially set to 6 lens flares.
			for (var i = 0; i <=6; i += 1){			
				//figuring out where on the screen the lens flare will be located
				var q = tdl.add(L, tdl.math.mulVectorScalar(tdl.math.subVector([0,0,0,0],L),(i-2) ));
				//scaling and translating the lens flare texture into world space.
				flareProg1.setUniform("worldMatrix", tdl.math.mul(tdl.math.scaling([.09,.09,1.0]),
												tdl.math.translation([q[0],q[1],0])));				
				//2 means that the lens flare will be in the same spot at the sun
				if (i == 2){
					//scaling up the ring texture so that it is larger than the sun, and moving it into world space
					flareProg1.setUniform("worldMatrix", tdl.math.mul(tdl.math.scaling([.25,.25,1.0]),
												tdl.math.translation([q[0],q[1],0])));			
					//setting the texture for around the sun		
					flareProg1.setUniform("flaretex", ringtex);							
				}
				//for all other lens flares using the hex texture.
				else{
					//setting the texture for the rest of the lens flares to the hex texture
					flareProg1.setUniform("flaretex", hextex);							
				}
				//displaying the lens flare,  this is inside the for loop.				
				flare.draw(flareProg1);					
			}
		}    
	}
	gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);

}

function Shooting(){

	prog1.use();
	prog1.setUniform("trans", tdl.identity());
	prog1.setUniform("reflMatrix", tdl.identity()); // refl
	
    prog1.setUniform("lightPos",
        [10,100,10,1,  0,0,0,1,  0,0,0,1,  0,0,0,1]  
    );
    prog1.setUniform("lightColor",
        [1,1,1,1,  0,0,0,0,  0,0,0,0,  0,0,0,0 ] 
    );
    
    prog1.setUniform("fogNear",50);
    prog1.setUniform("fogDelta", 30);
    prog1.setUniform("fogColor",[0.4,0.7,0.9,1.0]);
    prog1.setUniform("attenuation",[1,0.0,0.0001,0]);
	camera.draw(prog1);
	for(var b = 0; b < cBalls.length; ++b)
	{
		if(cBalls[b].Alive){
			cBalls[b].update();
			cBalls[b].draw(prog1);			
		}
	}
	pSystem.draw(camera.viewProjMatrix,tdl.identity(),tdl.math.transpose(camera.viewProjMatrix));
	gl.depthMask(true);
}

function drawShip(theShip, prog, chrome)
{
	if(document.getElementById('noise').checked) {
		prog.use();
		prog.setUniform("reflMatrix", tdl.identity());
		prog.setUniform("P", P);
		prog.setUniform("G", G);
		camera.draw(prog);
		theShip.draw(prog);
		prog.setUniform("objmin", theShip.bboxMin);
	}
	else{
		prog.use();
		prog.setUniform("trans", tdl.identity());
		prog.setUniform("reflMatrix", tdl.identity()); // refl
		
		prog.setUniform("lightPos",
			[10,100,10,1,  0,0,0,1,  0,0,0,1,  0,0,0,1]  
		);
		prog.setUniform("lightColor",
			[1,1,1,1,  0,0,0,0,  0,0,0,0,  0,0,0,0 ] 
		);
		
		prog.setUniform("fogNear",80);
		prog.setUniform("fogDelta", 30);
		prog.setUniform("fogColor",[0.4,0.7,0.9,0.7]);
		prog.setUniform("attenuation",[1,0.0,0.0001,0]);
		dss_keep(); // refl
		
		prog.setUniform("worldMatrix",tdl.identity());
		
		// If the ship being drawn is the chrome ship, give the fs a cubetex to work with
		if (chrome)
		{
			prog.setUniform("cubetexture", cubetex);
		}
		camera.draw(prog);

		theShip.draw(prog);
	}
		
	dss_repl(); //refl
	gl.colorMask(false, false, false, false); // refl
	
	prog.setUniform("worldMatrix",tdl.identity());
	
	gl.colorMask(true,true,true,true); // refl
	gl.clear(gl.DEPTH_BUFFER); // refl
	dss_equal(); // refl

	var Nx = ocean.M.submeshes[0][0].vdata[8];
	var Ny = ocean.M.submeshes[0][0].vdata[9];
	var Nz = ocean.M.submeshes[0][0].vdata[10];	
	var oPos = [ocean.M.submeshes[0][0].vdata[0],ocean.M.submeshes[0][0].vdata[1],
				ocean.M.submeshes[0][0].vdata[2],ocean.M.submeshes[0][0].vdata[3]];
				
	var onormal = [Nx, Ny, Nz, 1];
	var D = tdl.dot(-onormal, oPos);
	var oceanNormal = [Nx, Ny, Nz, D];
	prog.setUniform("mirrorPos", oceanNormal);
	
				
	prog.setUniform("reflMatrix", [	-2*Nx*Nx+1,		-2*Nx*Ny, 		-2*Nx*Nz, 		0,
						-2*Ny*Nx,		-2*Ny*Ny+1,		-2*Ny*Nz,		0,
						-2*Nz*Nx, 		-2*Nz*Ny, 		-2*Nz*Nz+1,		0,
						-2*D*Nx, 		-2*D*Ny,		-2*D*Nz, 		1,]);
										
	gl.frontFace(gl.CW);	
	
	theShip.draw(prog);
	dss_nodepth();
	
	gl.enable(gl.DEPTH_TEST);
 
	gl.frontFace(gl.CCW);
	prog.setUniform("worldMatrix",tdl.identity());
}

function drawNessie(){
	prog1.use();
	prog1.setUniform("trans", tdl.identity());
	prog1.setUniform("reflMatrix", tdl.identity()); // refl
	
    prog1.setUniform("lightPos",
        [10,100,10,1,  0,0,0,1,  0,0,0,1,  0,0,0,1]  
    );
    prog1.setUniform("lightColor",
        [1,1,1,1,  0,0,0,0,  0,0,0,0,  0,0,0,0 ] 
    );
    
    prog1.setUniform("fogNear",50);
    prog1.setUniform("fogDelta", 30);
    prog1.setUniform("fogColor",[0.4,0.7,0.9,1.0]);
    prog1.setUniform("attenuation",[1,0.0,0.0001,0]);
	camera.draw(prog1);
	nessie.draw(prog1,1);
	if(document.getElementById('fur').checked) {
		Fur();
	}
}

function drawOcean(){
	prog2.use();
	prog2.setUniform("trans", tdl.identity());
	prog2.setUniform("lightPos",
        [10,100,10,1,  0,0,0,1,  0,0,0,1,  0,0,0,1]  
    );
    prog2.setUniform("lightColor",
        [1,1,1,1,  0,0,0,0,  0,0,0,0,  0,0,0,0 ] 
    );
	prog2.setUniform("fogNear",50);
    prog2.setUniform("fogDelta", 30);
    prog2.setUniform("fogColor",[0.4,0.7,0.9,1.0]);
    prog2.setUniform("attenuation",[1,0.0,0.0001,0]);
	prog2.setUniform("t", t);
	prog2.setUniform("d", [-1.0,0.0,0.0, 1.0,0.0,1.0, -0.75,0.0,-0.3]);
	camera.draw(prog2);
    ocean.draw(prog2, camera);
}

function randVec4(num){
	var finalArray = [];
	for( var z=0;z<256;z++ ){
		var array = [];
		for( var i=0; i<3; i++ ){
			var negPos = Math.floor(Math.random()*2);
			if(negPos == 1)
				array.push(Math.floor(Math.random()*-100));
			else
				array.push(Math.floor(Math.random()*100));
		}
		array.push(0);
		for( var y=0;y<4;y++ ){
			finalArray.push(array[y]);
		}
	}
	return finalArray;
}

function arrayShuff(num){
    var array = [];
	var total = num-1;
    for(var i=0;i<num;i++){
        array.push(i);
    }
	for(var i=0; i<num;i++){
		var rand = Math.floor(Math.random() * total);
		var temp = array[rand];
		array[rand] = array[total];
		array[total] = temp;
		total--;
	}

    return array;
}

function drawNoise(){
    noiseProg.use();
    noiseProg.setUniform("P", P);
    noiseProg.setUniform("G", G);
    noiseProg.setUniform("firetex", fire);
    camera.draw(noiseProg);
    ship.draw(noiseProg);
    noiseProg.setUniform("objmin", ship.bboxMin);
}
