"use strict";

function SuperMesh(loader,fname){
    this.fname=fname;
    var sli = this.fname.lastIndexOf("/");
    if( sli === -1 )
        this.pfx = "";
    else
        this.pfx = this.fname.substr(0,sli+1);
        
    this.submeshes=[];
    this.linemeshes=[];
	this.FurMeshes=[];
    loader.loadTextFile(fname,this.setup.bind(this,loader));
}

SuperMesh.prototype.setup = function(loader,txt){
    var pfx = this.pfx;
    var subloader = loader.createSubloader(this.setup2.bind(this));
    var L = txt.split("\n");
    for(var i=0;i<L.length;++i){
        var tmp = L[i].split(" ");
        if( tmp.length != 2 )
            continue;
        var ty = tmp[0];
        var fname = tmp[1];
        var stem = fname.substr(0,fname.length-5);
        if( ty === "binarymesh" ){
            var M = new SubMesh(subloader,pfx+fname);
            this.submeshes.push( [M,stem] );
        }
        else if( ty === "binaryline" ){
            var M = new LineMesh(subloader,pfx+fname);
            this.linemeshes.push( [M,stem] );
        }
		else if (ty === "binarylinefur")
		{
			var M = new FurMesh(subloader,pfx+fname);
			M.furrymesh = true;
			this.FurMeshes.push( [M,stem] );
		}
        else{
            console.warn("Don't know what to do with "+L[i]);
        }
    }
    subloader.finish();
}

SuperMesh.prototype.setup2 = function(){
    //get all the sub-mesh's bounding boxes
    //and store it here.
    this.bbox=[Infinity,Infinity,Infinity,
            -Infinity,-Infinity,-Infinity];
    for(var i=0;i<this.submeshes.length;++i){
        for(var j=0;j<3;++j){
            if( this.submeshes[i][0].bbox[j] < this.bbox[j] )
                this.bbox[j] = this.submeshes[i][0].bbox[j];
        }
        for(var j=3;j<6;++j){
            if( this.submeshes[i][0].bbox[j] > this.bbox[j] )
                this.bbox[j] = this.submeshes[i][0].bbox[j];
        }
    }
}

SuperMesh.prototype.draw = function(prog,mode,things){
    //if mode is 1: Draw only items in 'things'
    //if mode is 2: Draw all except items in 'things'
    //if mode is undefined, draw everything
    var nd=0;
    if( mode === undefined ){
        for(var i=0;i<this.submeshes.length;++i){
            this.submeshes[i][0].draw(prog);
            ++nd;
        }
    }
    else if( mode === 1){ // Had to fix this check, did not work initially
        for(var i=0;i<this.submeshes.length;++i){
			for(var j = 0; j < things.length; j++)
			{
				if( this.submeshes[i][1] === things[j] )
				{
					this.submeshes[i][0].draw(prog);
					++nd;
				}
			}
        }
    }
    else if( mode === 2 ){
        for(var i=0;i<this.submeshes.length;++i){
            if( !(this.submeshes[i][1] in things) ){
                this.submeshes[i][0].draw(prog);
            }
            else{
                ++nd;
            }
        }
    }
    else{
        throw new Error("Bad argument to draw");
    }
    
    if( nd === 0 ){
        if(!this.warnednodraw){
            this.warnednodraw=true;
            console.log("Warning: ",(mode===2 ? "Skipped" : "Drew"),"nothing");
        }
    }
}

SuperMesh.prototype.drawLines = function(prog,which){
    var nd=0;
    for(var i=0;i<this.linemeshes.length;++i){
        if( which === undefined || which === this.linemeshes[i][1] ){
            this.linemeshes[i][0].draw(prog);
            ++nd;
        }
    }
    
    if(nd===0){
        if(!this.warnednodrawlines){
            this.warnednodrawlines=true;
            console.log("Warning: Drew no lines");
        }
    }
}

SuperMesh.prototype.drawFurMesh = function(prog,which){
	var nd=0;
	for(var i=0;i<this.FurMeshes.length;++i){
        if( which === undefined || which === this.FurMeshes[i][1] ){
            this.FurMeshes[i][0].draw(prog);
            ++nd;
        }
    }
    
    if(nd===0){
        if(!this.warnednodrawlines){
            this.warnednodrawlines=true;
            console.log("Warning: Drew no lines");
        }
    }
}
 
var SubMesh = function(loader,fname){
    this.fname = fname;
    var sli = fname.lastIndexOf("/");
    if( sli === -1 )
        this.pfx = "";
    else
        this.pfx = fname.substr(0,sli+1);
    this.initialized=false;
    loader.loadArrayBuffer(fname,this.setup.bind(this,loader));
}

SubMesh.prototype.setup = function(loader,ab)
{
    this.arraybuff=ab; 
	
    var ba = new Uint8Array(ab,0);
            
    var offsetb=0;
    var i;
    var s;
            
    var fileloc=0;
    //"magic number"
    s="";
    for(i=0;i<8;++i){
        s += String.fromCharCode(ba[i]);
    }
	
    if(s == "BINARY08") this.b8 = true;
	
    if( s !== "BINARY06" && s !== "BINARY08")
        throw("File "+this.fname+" lacks magic number: Found: "+s);
            
    fileloc = 8;

    //base color: 4 floats
    this.color= new Float32Array(ab,fileloc,4);
    fileloc += 4*4;
    
    //specular: 4 floats
    this.scolor = new Float32Array(ab,fileloc,4);
    fileloc += 4*4;
    
    //texture file
    var tf="";
    for(var i=fileloc;ba[i]!=0;++i){
        tf += String.fromCharCode(ba[i]);
    }
    fileloc += 128;
    
    if( tf.length === 0 )
        this.tex = new tdl.SolidTexture([255,255,255,255]);
    else
        this.tex = new tdl.Texture2D(loader,this.pfx+tf);
    
    tf="";
    for(var i=fileloc;ba[i]!=0;++i){
        tf += String.fromCharCode(ba[i]);
    }
    fileloc += 128;
    
    if( tf.length === 0 )
        this.etex = new tdl.SolidTexture([0,0,0,255]);
    else
        this.etex = new tdl.Texture2D(loader,this.pfx+tf);
        
    tf="";
    for(var i=fileloc;ba[i]!=0;++i){
        tf += String.fromCharCode(ba[i]);
    }
    fileloc += 128;
    
    if( tf.length === 0 )
        this.stex = new tdl.SolidTexture([255,255,255,255]);
    else
        this.stex = new tdl.Texture2D(loader,this.pfx+tf);
    
    
    tf="";
    for(var i=fileloc;ba[i]!=0;++i)
        tf += String.fromCharCode(ba[i]);
    fileloc += 128;
    if( tf.length === 0 ){
        this.btex = new tdl.SolidTexture([128,128,255,255]);
    }
    else
        this.btex = new tdl.Texture2D(loader,this.pfx+tf);
	
	if(s == "BINARY08"){
	// Skipping ahead 128 to skip Gloss Texture
		tf="";
		for(var i=fileloc;ba[i]!=0;++i)
			tf += String.fromCharCode(ba[i]);
		fileloc += 128;
	}
        
    //bounding box: 6 floats: min xyz, max xyz
    this.bbox = new Float32Array(ab,fileloc,6);
    fileloc += 6*4;
    
    //vertex count: 4 bytes
    var ia = new Uint32Array(ab,fileloc,1);
    this.nv = ia[0];
    fileloc += 4;
    
	if(s == "BINARY06"){
    //x,y,z,w,s,t,p,q,nx,ny,nz,nw,tx,ty,tz,tw,w0,w1,w2,w3,b0,b1,b2,b3
    this.vdata = new Float32Array(ab,fileloc,this.nv*16);
    fileloc += this.nv*16*4;   //bytes
	}
	
	if(s == "BINARY08"){
	//x,y,z,w,s,t,p,q,nx,ny,nz,nw,tx,ty,tz,tw,w0,w1,w2,w3,b0,b1,b2,b3
    this.vdata = new Float32Array(ab,fileloc,this.nv*24);
    fileloc += this.nv*24*4;   //bytes
	}
            
    //index count: 4 bytes
    var ia = new Uint32Array(ab,fileloc,1);
    this.ni = ia[0];
    fileloc += 4;
            
    this.idata = new Uint16Array(ab,fileloc,this.ni);
	
	if(s == "BINARY08"){
		fileloc += this.ni * 2;
	
		while((fileloc%4) !== 0)
		{
	
			fileloc+= 2;
		}

		var nB = new Uint32Array(ab,fileloc,1);
		var numBones = nB[0];
		fileloc += 4;
		
		var nPD = new Uint32Array(ab,fileloc,1);
		var numPadBones = nPD[0];
		fileloc += 4;
		
		var nPDA = new Float32Array(ab,fileloc,numPadBones*4);
		fileloc += numPadBones * 4 * 4;
		console.log(fileloc,ab.byteLength,this.fname)
		this.bonetex = new tdl.ColorTexture({width: numPadBones, height: 1, pixels: nPDA, type: gl.FLOAT})
		
		var fbuff = new Uint32Array(ab,fileloc,2);
		var frames = fbuff[0];
		var maxframes = fbuff[1];
		fileloc += 8;
		
		// Quaterian array
		var quat = new Float32Array(ab,fileloc,numPadBones*maxframes*4);
		this.quatexture = new tdl.ColorTexture({width: numPadBones, height: maxframes, pixels: quat,type: gl.FLOAT})
	}
    this.vbuff = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,this.vbuff);
    gl.bufferData(gl.ARRAY_BUFFER,this.vdata,gl.STATIC_DRAW);
    this.ibuff = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this.ibuff);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,this.idata,gl.STATIC_DRAW);
}

SubMesh.prototype.draw = function(prog)
{
	gl.bindBuffer(gl.ARRAY_BUFFER,this.vbuff);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this.ibuff);
	if(this.b8){
		prog.setVertexFormat(
			"position",4,gl.FLOAT,
			"texcoord",4,gl.FLOAT,
			"normal",4,gl.FLOAT,
			"",4,gl.FLOAT,  //not using tangent right now...
			"weights",4,gl.FLOAT,
			"bones",4,gl.FLOAT); 
		prog.setUniform("diffusemtl",this.color);
		prog.setUniform("specmtl",this.scolor);
		prog.setUniform("basetexture",this.tex);
		prog.setUniform("emittexture",this.etex);
		prog.setUniform("spectexture",this.stex);
		if(this.bonetex) prog.setUniform("bonetexture",this.bonetex);
		if(this.quatexture) prog.setUniform("quatexture",this.quatexture);
		gl.drawElements(gl.TRIANGLES,this.ni,gl.UNSIGNED_SHORT,0);
	}
	else{
		prog.setVertexFormat(
			"position",4,gl.FLOAT,
			"texcoord",4,gl.FLOAT,
			"normal",4,gl.FLOAT,
			"",4,gl.FLOAT); 
		prog.setUniform("diffusemtl",this.color);
		prog.setUniform("specmtl",this.scolor);
		prog.setUniform("basetexture",this.tex);
		prog.setUniform("emittexture",this.etex);
		prog.setUniform("spectexture",this.stex);
		if(this.bonetexture) prog.setUniform("bonetex",this.bonetexture);
		if(this.quatexture) prog.setUniform("quatexture",this.quatexture);
		gl.drawElements(gl.TRIANGLES,this.ni,gl.UNSIGNED_SHORT,0);
	}
}
    
function LineMesh(loader,fname){
    this.fname = fname;
    this.initialized=false;
    loader.loadArrayBuffer(fname,this.setup.bind(this,loader));
}

LineMesh.prototype.setup = function(loader,ab)
{
    this.arraybuff=ab; 
    var ba = new Uint8Array(ab,0);
            
    var offsetb=0;
    var i;
    var s;
            
    var fileloc=0;
    //"magic number"
    s="";
    for(i=0;i<8;++i){
        s += String.fromCharCode(ba[i]);
    }
            
    if( s !== "LINE0006" )
        throw("File "+this.fname+" lacks magic number: Found:"+s);
            
    fileloc = 8;

    
    this.tex = new tdl.SolidTexture([255,255,255,255]);
    
    //vertex count: 4 bytes
    var ia = new Uint32Array(ab,fileloc,1);
    this.nv = ia[0];
    fileloc += 4;
            
    this.vdata = new Float32Array(ab,fileloc,this.nv*4);
    fileloc += this.nv*16;   //bytes
            
    //index count: 4 bytes
    var ia = new Uint32Array(ab,fileloc,1);
    this.ni = ia[0];
    fileloc += 4;
            
    this.idata = new Uint16Array(ab,fileloc,this.ni);
    
            
    this.vbuff = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,this.vbuff);
    gl.bufferData(gl.ARRAY_BUFFER,this.vdata,gl.STATIC_DRAW);
    this.ibuff = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this.ibuff);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,this.idata,gl.STATIC_DRAW);
}

LineMesh.prototype.draw = function(prog){
    
    //LINEMESH
    
    gl.bindBuffer(gl.ARRAY_BUFFER,this.vbuff);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this.ibuff);
    prog.setVertexFormat("position",4,gl.FLOAT);
    prog.setUniform("basetexture",this.tex);
    gl.drawElements(gl.LINES,this.ni,gl.UNSIGNED_SHORT,0);
}

var FurMesh = function(loader,fname){
    this.fname = fname;
    var sli = fname.lastIndexOf("/");
    if( sli === -1 )
        this.pfx = "";
    else
        this.pfx = fname.substr(0,sli+1);
    this.initialized=false;
    loader.loadArrayBuffer(fname,this.setup.bind(this,loader));
}

FurMesh.prototype.setup = function(loader,ab)
{
    this.arraybuff=ab; 
	console.log(ab.bytelength);
    var ba = new Uint8Array(ab,0);
            
    var i;
    var s;
            
    var fileloc=0;
    //"magic number"
    s="";
    for(i=0;i<8;++i){
        s += String.fromCharCode(ba[i]);
    }
            
    if( s !== "BINARY06" && s !== "BINARY08")
        throw("File "+this.fname+" lacks magic number: Found: "+s);
            
    fileloc = 8;

    //base color: 4 floats
    this.color= new Float32Array(ab,fileloc,4);
    fileloc += 4*4;
    
    //specular: 4 floats
    this.scolor = new Float32Array(ab,fileloc,4);
    fileloc += 4*4;
    
    //texture file
    var tf="";
    for(var i=fileloc;ba[i]!=0;++i){
        tf += String.fromCharCode(ba[i]);
    }
    fileloc += 128;
    
    if( tf.length === 0 )
        this.tex = new tdl.SolidTexture([255,255,255,255]);
    else
        this.tex = new tdl.Texture2D(loader,this.pfx+tf);
    
    tf="";
    for(var i=fileloc;ba[i]!=0;++i){
        tf += String.fromCharCode(ba[i]);
    }
    fileloc += 128;
    
    if( tf.length === 0 )
        this.etex = new tdl.SolidTexture([0,0,0,255]);
    else
        this.etex = new tdl.Texture2D(loader,this.pfx+tf);
        
    tf="";
    for(var i=fileloc;ba[i]!=0;++i){
        tf += String.fromCharCode(ba[i]);
    }
    fileloc += 128;
    
    if( tf.length === 0 )
        this.stex = new tdl.SolidTexture([255,255,255,255]);
    else
        this.stex = new tdl.Texture2D(loader,this.pfx+tf);
    
    
    tf="";
    for(var i=fileloc;ba[i]!=0;++i)
        tf += String.fromCharCode(ba[i]);
    fileloc += 128;
    if( tf.length === 0 ){
        this.btex = new tdl.SolidTexture([128,128,255,255]);
    }
    else
        this.btex = new tdl.Texture2D(loader,this.pfx+tf);
	
	if(s == "BINARY08"){
	// Skipping ahead 128 to skip Gloss Texture
		tf="";
		for(var i=fileloc;ba[i]!=0;++i)
			tf += String.fromCharCode(ba[i]);
		fileloc += 128;
	}
        
    //bounding box: 6 floats: min xyz, max xyz
    this.bbox = new Float32Array(ab,fileloc,6);
    fileloc += 6*4;
    
    //vertex count: 4 bytes
    var ia = new Uint32Array(ab,fileloc,1);
    this.nv = ia[0];
	console.log(this.nv,fileloc);
	console.log(ab.byteLength);
    fileloc += 4;
    
    //x,y,z,w,s,t,p,q,nx,ny,nz,nw,tx,ty,tz,tw,w0,w1,w2,w3,b0,b1,b2,b3
    this.vdata = new Float32Array(ab,fileloc,this.nv*16);
    fileloc += this.nv*16*4;   //bytes

	
            
    //index count: 4 bytes
    var ia = new Uint32Array(ab,fileloc,1);
    this.ni = ia[0];
    fileloc += 4;
            
    this.idata = new Uint16Array(ab,fileloc,this.ni);
	
    this.vbuff = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,this.vbuff);
    gl.bufferData(gl.ARRAY_BUFFER,this.vdata,gl.STATIC_DRAW);
    this.ibuff = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this.ibuff);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,this.idata,gl.STATIC_DRAW);
}

FurMesh.prototype.draw = function(prog)
{
	gl.bindBuffer(gl.ARRAY_BUFFER,this.vbuff);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this.ibuff);
	prog.setVertexFormat(
		"position",4,gl.FLOAT,
		"texcoord",4,gl.FLOAT,
		"normal",4,gl.FLOAT,
		"",4,gl.FLOAT); 
	prog.setUniform("diffusemtl",this.color);
	prog.setUniform("specmtl",this.scolor);
	prog.setUniform("basetexture",this.tex);
	prog.setUniform("emittexture",this.etex);
	prog.setUniform("spectexture",this.stex);
	gl.drawArrays(gl.LINES,0,this.nv);

}