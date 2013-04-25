"use strict";

var Camera = function(opts){
    opts=opts || {};
    var fov = opts.fov || 70.0;
    var eye = opts.eye ? [opts.eye[0],opts.eye[1],opts.eye[2],1.0] : [0,0,0,1];
    var coi = opts.coi ? [opts.coi[0],opts.coi[1],opts.coi[2],1.0] : [0,0,-1,1];
    var up = opts.up ? [opts.up[0],opts.up[1],opts.up[2],0.0] : [0,1,0,0];
    var ortho = (opts.ortho === undefined) ? false : opts.ortho;
    if( ortho ){
        this.L=opts.L;
        this.R=opts.R;
        this.T=opts.T;
        this.B=opts.B;
    }
    
    this.ortho=ortho;
    this.fov=fov;
    this.viewMatrix=tdl.identity();
    this.projMatrix=tdl.identity();
    this.hither = 0.1;
    this.yon = 100.0;
	this.ar = 1.0;
    this.make_proj_matrix();
    this.set_eye_coi(eye,coi,up);
}

Camera.prototype={
    set_eye_coi: function(eye,coi,up){
        up = up || [0,1,0,0];
        this.eye=[eye[0],eye[1],eye[2],1.0];
        var U,V,W;
        W = tdl.sub(eye,coi);
        U = tdl.cross(up,W);
        V = tdl.cross(W,U);
        this.W = tdl.normalize(W);
        this.U = tdl.normalize(U);
        this.V = tdl.normalize(V);
        this.make_view_matrix();
    },

    walk: function(amt){
        this.eye = tdl.add(this.eye,tdl.mul(-amt,this.W));
        this.make_view_matrix();
    },
    tilt: function(amt){
        var R = tdl.axisRotation(this.U,amt);
        this.V = tdl.mul([this.V[0],this.V[1],this.V[2],0],R);
        this.W = tdl.mul([this.W[0],this.W[1],this.W[2],0],R);
        this.make_view_matrix();
    },
    turn: function(amt){
        var R = tdl.axisRotation(this.V,amt);
        this.U=tdl.mul([this.U[0],this.U[1],this.U[2],0],R);
        this.W=tdl.mul([this.W[0],this.W[1],this.W[2],0],R);
        this.make_view_matrix();
    },
    strafe: function(strafex,strafey){
        this.eye[0] += strafex*this.U[0] + strafey*this.V[0];
        this.eye[1] += strafex*this.U[1] + strafey*this.V[1];
        this.eye[2] += strafex*this.U[2] + strafey*this.V[2];
        this.make_view_matrix();
    },
    draw : function(prog){
        if( prog === undefined )
            throw new Error("Camera.draw expects program");
        if( this.ViewMatrix === undefined )
            this.make_view_matrix();
            
        prog.setUniform("viewMatrix",this.viewMatrix);
        prog.setUniform("projMatrix",this.projMatrix);
        prog.setUniform("viewProjMatrix",this.viewProjMatrix);
        prog.setUniform("eyePos",this.eye);
		prog.setUniform("hither", this.hither);
		prog.setUniform("yon", this.yon - this.hither);
    },

    make_view_matrix : function(){
        this.viewMatrix = tdl.mul(
            [   1,0,0,0, 
                0,1,0,0, 
                0,0,1,0, 
                -this.eye[0],-this.eye[1],-this.eye[2],1],
            [this.U[0],this.V[0],this.W[0],0,
             this.U[1],this.V[1],this.W[1],0,
             this.U[2],this.V[2],this.W[2],0,
             0,0,0,1]);
        
        this.viewProjMatrix = tdl.mul(this.viewMatrix,this.projMatrix);
    },
    
    make_proj_matrix : function(){
        var av = this.fov;
        var av=0.5*this.fov;
        var aspect_ratio = this.ar;
        var ah = av * aspect_ratio;
        var tanh = Math.tan(ah/180.0*Math.PI);
        var tanv = Math.tan(av/180.0*Math.PI);
        var hither = this.hither;
        var yon = this.yon;
        var H = hither;
        var Y = yon;
        var L = -hither * tanh;
        var R = hither * tanh;
        var B = -hither * tanv;
        var T = hither * tanv;
        var M;
        if( this.ortho){
            //x=L -> -1
            //x=R -> 1
            //x=-1 + 2(x-L)/(R-L) 
            //same for y: y=(y-B)/(T-B)
            //z=hither -> -1, yon -> 1
            //z=(z-hither)/(yon-hither)
            //p=[ x(T-B)(Y-H)-L(T-B)(Y-H), ...]
            //p=[ (x-L)(T-B)(Y-H)   , (y-B)(R-L)(Y-H), (z-H)(T-B)(R-L), 0.5*(R-L)(T-B)(Y-H)]
            //p=[ -1 + 2(x-L)/(R-L), (y-B)/(T-B),  (z-H)/(Y-H) , 1]

            //var A=R-L;
            //var C=T-B;
            //var D=Y-H;
            //M=[ (2/A),0,0,0,
            //    0,(2/C),0,0,
            //    0,0,0,0,
            //    (-2*L-A)/A,(-2*B-C)/C,0,1];
            M = tdl.orthographic(this.L,this.R,this.B,this.T,H,Y);
        }
        else{
            M = [
                2*hither/(R-L),     0,                  0,                              0,
                0,                  2*hither/(T-B),     0,                              0,
                1+2*L/(R-L),       1+2*B/(T-B),       (hither+yon)/(hither-yon),         (-1),
                0,                  0,                  (2*hither*yon)/(hither-yon),    0
            ];
        }
        this.projMatrix = M;
        this.viewProjMatrix = tdl.mul(this.viewMatrix,this.projMatrix);
    }
};
