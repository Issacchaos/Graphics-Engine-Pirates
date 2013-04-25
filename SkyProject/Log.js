"use strict";

function Log(maxt){
    this.L=[];
    this.T=[];
    this.maxt = maxt || 2500;
    this.periodic();
}

Log.prototype.log = function(){
    var X=[];
    for(var i=0;i<arguments.length;++i)
        X.push(""+arguments[i]);
    this.loglist(X);
}

Log.prototype.loglist = function(X){
    var s = X.join(" ");
    this.L.push(s);
    this.T.push(Date.now()+this.maxt);
}

Log.prototype.logLast = function(){
    this.L.pop();
    this.T.pop();
    var X=[];
    for(var i=0;i<arguments.length;++i)
        X.push(arguments[i]);
    this.loglist(X);
}

Log.prototype.periodic = function(){
    this.update();
    var that=this;
    setTimeout(function(){that.periodic()},500);
}

Log.prototype.update = function(){
    var now = Date.now();
    while( this.T.length > 10 || (this.T.length > 0 && this.T[0] < now) ){
        this.T.shift();
        this.L.shift();
    }
    var el = document.getElementById("debuglog");
    if(el)
        el.innerHTML=this.L.join("<br>");
}
