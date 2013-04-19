//Vector and matrix convenience things.
//written by jh at ssu
"use strict";

tdl.provide('tdl.vec');

tdl.vec = tdl.vec || {};

tdl.vec.vec2 = function(x,y){
    if(this===window || this===tdl){
        return new tdl.vec.vec2(x,y);
    }
    this["0"]=x;
    this["1"]=y;
    this.le=2;
}

tdl.vec.vec4 = function(x,y,z,w){
    if( this===window || this===tdl){
        //calling as "q = vec4(...)"
        return new tdl.vec.vec4(x,y,z,w);
    }
    this["0"]=x;
    this["1"]=y;
    this["2"]=z;
    this["3"]=w;
    this.le=4;
}

//FIXME: Can we extend the prototype instead of replacing it here?
tdl.vec.vec4.prototype = {
    get x(){
        return this[0];
    },
    set x(v){
        this[0]=v;
    },
    get y(){
        return this[1];
    },
    set y(v){
        this[1]=v;
    },
    get z(){
        return this[2];
    },
    set z(v){
        this[2]=v;
    },
    get w(){
        return this[3];
    },
    set w(v){
        this[3]=v;
    },
    get xx(){
        return new tdl.vec.vec2(this[0],this[0]);
    }
};

tdl.vec.vec4.prototype.add = function(v){
    return new tdl.vec.vec4(this[0]+v[0],this[1]+v[1],this[2]+v[2],this[3]+v[3]);
}

tdl.vec.vec4.prototype.sub = function(v){
    return new tdl.vec.vec4(this[0]-v[0],this[1]-v[1],this[2]-v[2],this[3]-v[3]);
}

tdl.vec.vec4.prototype.length = function(){
    if( this[3] !== 0.0 )
        throw new Error("Cannot take length of a non-vector");
    return Math.sqrt( this[0]*this[0]+this[1]*this[1]+this[2]*this[2] );
}

tdl.vec.vec4.prototype.normalize = function(){
    var f = this.length();  //checks to see if w==0
    return new tdl.vec.vec4(this[0]/f,this[1]/f,this[2]/f,this[3]);
}

tdl.vec.vec4.prototype.mul = function(M){
    if( typeof(M) === 'number' )
        return new tdl.vec.vec4(this[0]*M,this[1]*M,this[2]*M,this[3]*M);
        
    var tmp = tdl.math.mul(this,M);
    var Q= new tdl.vec.vec4(tmp[0],tmp[1],tmp[2],tmp[3]);
    return Q;
}
