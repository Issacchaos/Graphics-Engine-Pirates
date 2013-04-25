/*
 * Copyright 2009, Google Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */


/**
 * @fileoverview This file contains a loader class for helping to load
 *     muliple assets in an asynchronous manner.
 */

tdl.provide('tdl.loader');

tdl.require('tdl.io');

/**
 * A Module with a loader class for helping to load muliple assets in an
 * asynchronous manner.
 * @namespace
 */
tdl.loader = tdl.loader || {};

tdl.loader.verbose=false;
tdl.loader.uniqueid=0;

/**
 * A simple Loader class to call some callback when everything has loaded.
 * @constructor
 * @param {!function(): void} onFinished Function to call when final item has
 *        loaded.
 */
tdl.loader.Loader = function(onFinished,myname)  {
  
  this.type_="Loader";  //so Textures, etc. can verify their first parameter is indeed a Loader.
  
  //for debugging only
  this.myname=myname || ("toplevel"+(tdl.loader.uniqueid++));
  
  //how many things this loader still has left to do
  this.count_ = 1;
  
  //the urls we have to load. For debugging.
  this.things_to_load=[">finish"];
  
  //callback.
  this.onFinished_ = onFinished;

  /**
   * The LoadInfo for this loader you can use to track progress.
   * @type {!tdl.io.LoadInfo}
   */
  this.loadInfo = tdl.io.createLoadInfo();
};

/**
 * Creates a Loader for helping to load a bunch of items asychronously.
 *
 * The way you use this is as follows.
 *
 * <pre>
 * var loader = tdl.loader.createLoader(myFinishedCallback);
 * loader.loadTextFile(text1Url, callbackForText);
 * loader.loadTextFile(text2Url, callbackForText);
 * loader.loadTextFile(text3Url, callbackForText);
 * loader.finish();
 * </pre>
 *
 * The loader guarantees that myFinishedCallback will be called after
 * all the items have been loaded.
 *
* @param {!function(): void} onFinished Function to call when final item has
*        loaded.
* @return {!tdl.loader.Loader} A Loader Object.
 */
//tdl.loader.createLoader = function(onFinished,debug) {
//  return new tdl.loader.Loader(onFinished,debug);
//};



/**
 * Loads a text file.
 * @param {string} url URL of scene to load.
 * @param {!function(string, *): void} onTextLoaded Function to call when
 *     the file is loaded. It will be passed the contents of the file as a
 *     string and an exception which is null on success.
 */
tdl.loader.Loader.prototype.loadTextFile = function(url, onTextLoaded) {
    if( url.length === 0 ){
        throw new Error("Bad URL to loadTextFile: "+url);
    }
    var that = this; 
    ++this.count_;
    this.things_to_load.push(url);

    var loadInfo = tdl.io.loadTextFile(url, function(string, exception) {
      //jh added
      if( exception )
            throw(exception);
        if( onTextLoaded ){
            onTextLoaded(string);
        }
        that.countDown_(url);
    });
    this.loadInfo.addChild(loadInfo);
};

//jh added to support load of multiple files
//Function takes variable number of arguments.
//First ones are the urls to load. 
// Last item can be a callback
//Callback will get a single parameter: A list of data for
//all the items loaded (one list item per data item loaded).
tdl.loader.Loader.prototype.loadTextFiles = function(){

    var A = [];
    for(var i=0;i<arguments.length;++i)
        A.push(arguments[i]);
        
    var callback = function(){};
    var urls;
    if( typeof(A[A.length-1]) === "string" ){
        // ... , string
        urls = A;
    }
    else{
        //... , func
        callback = A[A.length-1];
        urls=A.slice(0,A.length-1);
    }
    
    var L;
    var files=[];
    var do_it= function(fname,idx){
        L.loadTextFile(fname,
            function(data,exc){
                if(exc)
                    throw(exc);
                files[idx] = data;
            }
        );
    }
        
    L = this.createSubloader(
        function(){
            callback(files);
        }
    );
    for(var i=0;i<urls.length;++i){
        if( urls[i].length === 0 )
            throw new Error("Wat?");
        do_it(urls[i],i);
    }
    L.finish();
}

//jh added to support array buffer loads
tdl.loader.Loader.prototype.loadArrayBuffer = function(url,onLoaded){
    if( url.length === 0 )
        throw new Error("bad URL to loadArrayBuffer: "+url);
        
    var that=this;
    ++this.count_;
    this.things_to_load.push(url);
    
    var loadInfo = tdl.io.loadArrayBuffer(url,
      function(ab,exc){
        if(exc)
            throw(exc);
        if( onLoaded ){
            onLoaded(ab,url);
        }
        that.countDown_(url);
      }
    );
    this.loadInfo.addChild(loadInfo);
    return;
}

//jh added to support image loads
tdl.loader.Loader.prototype.loadImage = function(url, onImageLoaded){
    
    if( url.length === 0)
        throw new Error("Bad URL to loadImage");
        
    var img = new Image();
    var that=this;
    ++this.count_;
    this.things_to_load.push(url);
    
    var loadInfo = tdl.io.loadArrayBuffer(url,
        function(ab,exception){
            if(exception)
                throw(exception);
            
            var b;
            
            if( window.Blob ){
                try{
                    var ui = new Uint8Array(ab);
                    b = new Blob([ui]);
                }
                catch(e){
                }
                try{
                    b = new Blob([ab]);
                }
                catch(e){
                }
            }
            
            if( b === undefined ){
                var BB = (window.BlobBuilder || window.MozBlobBuilder || 
                    window.WebKitBlobBuilder || window.MSBlobBuilder);
                bb = new BB();
                bb.append(ab);
                b = bb.getBlob();
            }
            
            var u;
            if(window.URL && window.URL.createObjectURL)
                u = window.URL.createObjectURL(b);
            else if( window.webkitURL && window.webkitURL.createObjectURL )
                u = window.webkitURL.createObjectURL(b);
            else
                u = window.createObjectURL(b);
            img.addEventListener("load",
                function(){
                    if( onImageLoaded ){
                        onImageLoaded(img);
                    }
                    that.countDown_(url);
                }
            );
            img.src = u;
        }
    );
    this.loadInfo.addChild(loadInfo);
    return img;
};



/**
 * Creates a loader that is tracked by this loader so that when the new loader
 * is finished it will be reported to this loader.
 * @param {!function(): void} onFinished Function to be called when everything
 *      loaded with this loader has finished.
 * @return {!tdl.loader.Loader} The new Loader.
 */
tdl.loader.Loader.prototype.createSubloader = function(onFinished) {
    var that = this;

    ++this.count_;
    var tmp = tdl.loader.uniqueid++;
    var uid = ">subloader"+tmp;
    this.things_to_load.push(uid);

    var loader = new tdl.Loader(function() {
            if( onFinished )
                onFinished();
            that.countDown_(uid);
        },
        uid);
    this.loadInfo.addChild(loader.loadInfo);
    return loader;
};

/**
 * Counts down the internal count and if it gets to zero calls the callback.
 * @private
 */
tdl.loader.Loader.prototype.countDown_ = function(url) {
    --this.count_;
    var flag=false;
    for(var i=0;i<this.things_to_load.length;++i){
        if( this.things_to_load[i] === url ){
            this.things_to_load.splice(i,1);
            flag=true;
            break;
        }
    }
    
    if( !flag ){
        console.log("Internal loader error: Lost url "+url);
    }
    
    if (this.count_ === 0) {
            this.onFinished_();
    }
    
    if( tdl.loader.verbose ){
        console.log("loader "+this.myname+": Counted down: Got "+url+" count="+this.count_);
        console.log("    "+this.myname+": Items left: "+this.things_to_load.length+": "+
            this.things_to_load.join("|") );
        if( this.things_to_load.length > 0 && this.things_to_load[0].length === 0 ){
            throw new Error("?");
        }
    }
    
};

/**
 * Finishes the loading process.
 * Actually this just calls countDown_ to account for the count starting at 1.
 */
tdl.loader.Loader.prototype.finish = function() {
  this.countDown_(">finish");
};


