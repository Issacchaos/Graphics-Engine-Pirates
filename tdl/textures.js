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
 * @fileoverview This file contains objects to manage textures.
 */

tdl.provide('tdl.textures');

tdl.require('tdl.webgl');

/**
 * A module for textures.
 * @namespace
 */
tdl.textures = tdl.textures || { }

tdl.textures.addLoadingImage_ = function(img) {
  tdl.textures.init_(gl);
  gl.tdl.textures.loadingImages.push(img);
};

tdl.textures.removeLoadingImage_ = function(img) {
  gl.tdl.textures.loadingImages.splice(gl.tdl.textures.loadingImages.indexOf(img), 1);
};

tdl.textures.init_ = function(gl) {
    
    if( tdl.textures.bindings === undefined ){
        //bindings maps texture units (integer, 0...max_units-1) to a tdl Texture object
        //Texture unit i is currently bound to tdl texture object bindings[i]
        tdl.textures.bindings=[]
    
        //reverse of bindings: Given a tdl texture object uniqueid, rbindings[t] will be 
        //a list of all the texture units it is bound to
        tdl.textures.rbindings=new Object(null);
    }

        
    if (!gl.tdl.textures) {
        gl.tdl.textures = { };
        gl.tdl.textures.loadingImages = [];
        tdl.webgl.registerContextLostHandler(
            gl.canvas, tdl.textures.handleContextLost_, true);
    }
    if (!gl.tdl.textures.maxTextureSize) {
        gl.tdl.textures.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
        gl.tdl.textures.maxCubeMapSize = gl.getParameter(
            gl.MAX_CUBE_MAP_TEXTURE_SIZE);
    }
    if (!gl.tdl.textures.db) {
        gl.tdl.textures.db = { };
    }
};

tdl.textures.handleContextLost_ = function() {
  if (gl.tdl && gl.tdl.textures) {
    delete gl.tdl.textures.db;
    var imgs = gl.tdl.textures.loadingImages;
    for (var ii = 0; ii < imgs.length; ++ii) {
      imgs[ii].onload = undefined;
    }
    gl.tdl.textures.loadingImages = [];
  }
};

tdl.textures.TextureX = function(target) {
  tdl.textures.init_(gl);
  this.target = target;
  this.texture = gl.createTexture();
  this.params = { };
  this.attached_texture_units=[];
  this.name="?texture?";
};

tdl.textures.TextureX.prototype.setParameter = function(pname, value) {
  this.params[pname] = value;
  gl.bindTexture(this.target, this.texture);
  gl.texParameteri(this.target, pname, value);
};

tdl.textures.TextureX.prototype.recoverFromLostContext = function() {
  this.texture = gl.createTexture();
  gl.bindTexture(this.target, this.texture);
  for (var pname in this.params) {
    gl.texParameteri(this.target, pname, this.params[pname]);
  }
};

tdl.textures.TextureX.prototype.bindToUnit = function(unit){
    //console.log("Put",this.name,"on",unit);
    
    if( tdl.framebuffers.active_fbo && tdl.framebuffers.active_fbo.texture === this )
        throw new Error("Attempt to use texture as input while attached to FBO");
        
    gl.activeTexture(gl.TEXTURE0+unit);
    gl.bindTexture(this.target,this.texture);
    
    if( tdl.textures.bindings[unit] !== undefined ){
        var oldt = tdl.textures.bindings[unit];
        for(var i=0;i<oldt.attached_texture_units.length;++i){
            if( oldt.attached_texture_units[i] === unit ){
                oldt.attached_texture_units.splice(i,1);
                i--;
            }
        }
        //console.log("Took",oldt.name,"off unit",unit);
    }
    tdl.textures.bindings[unit]=this;
    
    //this must be last so we do the right thing if we are binding
    //the same texture to the same unit twice
    this.attached_texture_units.push(unit);
}

tdl.textures.TextureX.prototype.unbind = function(){
    for(var i=0;i<this.attached_texture_units.length;++i){
        gl.activeTexture(gl.TEXTURE0+i);
        gl.bindTexture(this.target,null);
    }
    this.attached_texture_units = [];
}
        
    
tdl.textures.TextureX.prototype.isBound = function(){
    return (this.attached_texture_units.length > 0 );
}

tdl.textures.TextureX.prototype.getBoundUnits = function(){
    return this.attached_texture_units;
}
        
/**
 * A solid color texture.
 * @constructor
 * @param {!tdl.math.vector4} color. Values are integers from 0-255.
 */
tdl.textures.SolidTexture = function(color) {

  tdl.textures.TextureX.call(this, gl.TEXTURE_2D);
  this.color = color.slice(0, 4);
  this.name="SolidTexture("+this.color+")";
  this.uploadTexture();
};

tdl.base.inherit(tdl.textures.SolidTexture, tdl.textures.TextureX);

tdl.textures.SolidTexture.prototype.uploadTexture = function() {
  gl.bindTexture(gl.TEXTURE_2D, this.texture);
  var pixel = new Uint8Array(this.color);
  gl.texImage2D(
    gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
  this.width=1;
  this.height=1;
  this.setParameter(gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  this.setParameter(gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  this.setParameter(gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  this.setParameter(gl.TEXTURE_MAG_FILTER, gl.NEAREST);

};

tdl.textures.SolidTexture.prototype.recoverFromLostContext = function() {
  tdl.textures.TextureX.recoverFromLostContext.call(this);
  this.uploadTexture();
};

//tdl.textures.SolidTexture.prototype.bindToUnit = function(unit) {
//  gl.activeTexture(gl.TEXTURE0 + unit);
//  gl.bindTexture(gl.TEXTURE_2D, this.texture);
//};

/**
    * A color from an array of values texture. Note: If you want
 * a texture that does not have UNSIGNED_BYTE as its internal type,
 * you must pass in the appropriate TypedArray (any Javascript
 * Array will be converted to Uint8Array).
 * @constructor
 * @param data: Object with fields: {!{width: number, height: number: pixels:
 *        !Array.<number>} data: Values are integers from 0-255.
 * @param opt_format: Optional format (gl.ALPHA, RGB, RGBA, LUMINANCE, LUMINANCE_ALPHA)
 * @param opt_type: Optional type (gl.UNSIGNED_BYTE, gl.FLOAT [if extension enabled])
 */
tdl.textures.ColorTexture = function(data, opt_format, opt_type) {
  tdl.textures.TextureX.call(this, gl.TEXTURE_2D);
  this.format = opt_format || gl.RGBA;
  this.type   = opt_type || gl.UNSIGNED_BYTE;
  if (data.pixels instanceof Array) {
    if( this.type != gl.UNSIGNED_BYTE )
        throw(new Error("Cannot use array with non-UNSIGNED_BYTE datatype"));
    data.pixels = new Uint8Array(data.pixels);
  }
  this.data   = data;
  this.uploadTexture();
};

tdl.base.inherit(tdl.textures.ColorTexture, tdl.textures.TextureX);

tdl.textures.ColorTexture.prototype.uploadTexture = function() {
  gl.bindTexture(gl.TEXTURE_2D, this.texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.texImage2D(
    gl.TEXTURE_2D, 0, this.format, this.data.width, this.data.height,
    0, this.format, this.type, this.data.pixels);
  this.width=this.data.width;
  this.height = this.data.height;
  this.setParameter(gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  this.setParameter(gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  this.setParameter(gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  this.setParameter(gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  
};

tdl.textures.ColorTexture.prototype.recoverFromLostContext = function() {
  tdl.textures.TextureX.recoverFromLostContext.call(this);
  this.uploadTexture();
};

//tdl.textures.ColorTexture.prototype.bindToUnit = function(unit) {
//  gl.activeTexture(gl.TEXTURE0 + unit);
//  gl.bindTexture(gl.TEXTURE_2D, this.texture);
//};


/**
 * @constructor
 * @param loader The Loader object 
 * @param {{string|!Element}} src An HTML <img> element, an HTML <canvas> element, or the 
 *              URL of an image to load into the texture.
 * @param {function} opt_flipY True if the y coordinate should be flipped or false if not.
 *          Defaults to true.
 * @param {callback} Will be called when the texture is loaded and ready
 */
tdl.textures.Texture2D = function(loader,src, opt_flipY, callback) {
  "use strict";
  //

  tdl.textures.TextureX.call(this, gl.TEXTURE_2D);
  this.name="Texture2D("+src+")";
  
  if( opt_flipY === undefined )
    opt_flipY=true;
    
  this.flipY = opt_flipY;
  var that = this;
  var img;
  
  if( src === undefined ){
      console.trace();
      throw("Creating texture with src='undefined' (Did you forget the loader argument?)");
  }
  
  // Handle dataURLs?
  if (typeof src !== 'string') {
    img = src;              //canvas or existing image object
    this.loaded = true;
    this.img=img;
    this.uploadTexture();
  } else {
      //put dummy texture in
      this.loaded=false;
      this.uploadTexture();
      
      if( loader.loadImage === undefined ){
          throw new Error("First argument to texture constructor must be a Loader");
      }
      
      //remote URL or blob
      loader.loadImage(src,
        function(img){
          that.img=img;
          that.updateTexture();
          if( callback )
            callback(that,img);
        }
      );
      
  }
  
};

tdl.base.inherit(tdl.textures.Texture2D, tdl.textures.TextureX);

tdl.textures.isPowerOf2 = function(value) {
  return (value & (value - 1)) == 0;
};

tdl.textures.Texture2D.prototype.uploadTexture = function() {
  gl.bindTexture(gl.TEXTURE_2D, this.texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  if (this.loaded) {
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, this.flipY);
    this.setTexture(this.img);
  } else {
    var pixel = new Uint8Array([255, 255, 255, 255]);
    gl.texImage2D(
        gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
    this.width=1;
    this.height=1;
  }
};

tdl.textures.Texture2D.prototype.setTexture = function(element) {
  // TODO(gman): use texSubImage2D if the size is the same.
  gl.bindTexture(gl.TEXTURE_2D, this.texture);
  if( element === undefined )
    console.trace();
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, element);
  if (tdl.textures.isPowerOf2(element.width) &&
      tdl.textures.isPowerOf2(element.height)) {
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.generateMipmap(gl.TEXTURE_2D);
  } else {
    this.setParameter(gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    this.setParameter(gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.setParameter(gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  }
  this.width=element.width;
  this.height = element.height;
};

tdl.textures.Texture2D.prototype.updateTexture = function() {
  this.loaded = true;
  this.uploadTexture();
};

tdl.textures.Texture2D.prototype.recoverFromLostContext = function() {
  tdl.textures.TextureX.recoverFromLostContext.call(this);
  this.uploadTexture();
};

//tdl.textures.Texture2D.prototype.bindToUnit = function(unit) {
//  gl.activeTexture(gl.TEXTURE0 + unit);
//  gl.bindTexture(gl.TEXTURE_2D, this.texture);
//};

/**
 * Create a texture to be managed externally.
 * @constructor
 * @param {string} type GL enum for texture type.
 */
tdl.textures.ExternalTexture = function(type) {
  tdl.textures.TextureX.call(this, type);
  this.type = type;
};

tdl.base.inherit(tdl.textures.ExternalTexture, tdl.textures.TextureX);

tdl.textures.ExternalTexture.prototype.recoverFromLostContext = function() {
};

tdl.textures.ExternalTexture.prototype.bindToUnit = function(unit) {
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(this.type, this.texture);
}

/**
 * Create a 2D texture to be managed externally.
 * @constructor
 */
tdl.textures.ExternalTexture2D = function() {
  tdl.textures.ExternalTexture.call(this, gl.TEXTURE_2D);
};

tdl.base.inherit(tdl.textures.ExternalTexture2D, tdl.textures.ExternalTexture);

/**
 * Create and load a CubeMap.
 * @constructor
 * @param loader The loader object to use
 * @param {!Array.<string>} urls The urls of the 6 faces, which
 *     must be in the order positive_x, negative_x positive_y,
 *     negative_y, positive_z, negative_z OR an array with a single url
 *     where the images are arranged as a cross in this order.
 *
 *     +--+--+--+--+
 *     |  |PY|  |  |
 *     +--+--+--+--+
 *     |NX|PZ|PX|NZ|
 *     +--+--+--+--+
 *     |  |NY|  |  |
 *     +--+--+--+--+
 */
tdl.textures.CubeMap = function(loader,urls) {
  tdl.textures.init_(gl);
  var that=this;
  tdl.textures.TextureX.call(this, gl.TEXTURE_CUBE_MAP);
  // TODO(gman): make this global.
  if (!tdl.textures.CubeMap.faceTargets) {
    tdl.textures.CubeMap.faceTargets = [
      gl.TEXTURE_CUBE_MAP_POSITIVE_X,
      gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
      gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
      gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
      gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
      gl.TEXTURE_CUBE_MAP_NEGATIVE_Z];
    tdl.textures.CubeMap.offsets = [
      [2, 1],
      [0, 1],
      [1, 0],
      [1, 2],
      [1, 1],
      [3, 1]];
  }
  var faceTargets = tdl.textures.CubeMap.faceTargets;
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.texture);
  this.setParameter(gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  this.setParameter(gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  this.setParameter(gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  this.faces = [];

  function makeCallback(faceIndex,face){
      return function(img){
          face.img = img;
          that.updateTexture(faceIndex);
      }
  }
  
  if (!urls.length) {
    this.numUrls = 0;
    this.size = urls;
  } else {
    this.numUrls = urls.length;
    for (var ff = 0; ff < urls.length; ++ff) {
    
      var face = { };
      this.faces[ff] = face;
    
      loader.loadImage(urls[ff], makeCallback(ff,face) );
      
      /*
      var img = document.createElement('img');
      tdl.textures.addLoadingImage_(img);
      face.img = img;
      img.onload = function(faceIndex) {
        return function() {
          tdl.textures.removeLoadingImage_(img);
          tdl.log("loaded image: ", urls[faceIndex]);
          that.updateTexture(faceIndex);
        }
      } (ff);
      img.onerror = function(url) {
        return function() {
          tdl.log("could not load image: ", url);
        }
      }(urls[ff]);
      img.src = urls[ff];
      */
    }
  }
  this.uploadTextures();
};

tdl.base.inherit(tdl.textures.CubeMap, tdl.textures.TextureX);

/**
 * Check if all faces are loaded.
 * @return {boolean} true if all faces are loaded.
 */
tdl.textures.CubeMap.prototype.loaded = function() {
  for (var ff = 0; ff < this.faces.length; ++ff) {
    if (!this.faces[ff].loaded) {
      return false;
    }
  }
  return true;
};

tdl.textures.clampToMaxSize = function(element, maxSize) {
  if (element.width <= maxSize && element.height <= maxSize) {
    return element;
  }
  var maxDimension = Math.max(element.width, element.height);
  var newWidth = Math.floor(element.width * maxSize / maxDimension);
  var newHeight = Math.floor(element.height * maxSize / maxDimension);

  var canvas = document.createElement('canvas');
  canvas.width = newWidth;
  canvas.height = newHeight;
  var ctx = canvas.getContext("2d");
  ctx.drawImage(
      element,
      0, 0, element.width, element.height,
      0, 0, newWidth, newHeight);
  return canvas;
};

/**
 * Uploads the images to the texture.
 */
tdl.textures.CubeMap.prototype.uploadTextures = function() {
  var allFacesLoaded = this.loaded();
  var faceTargets = tdl.textures.CubeMap.faceTargets;
  for (var faceIndex = 0; faceIndex < 6; ++faceIndex) {
    var uploaded = false;
    var target = faceTargets[faceIndex];
    if (this.faces.length) {
      var face = this.faces[Math.min(this.faces.length - 1, faceIndex)];
      gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.texture);
      if (allFacesLoaded) {
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        if (this.faces.length == 6) {
          gl.texImage2D(
              target, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE,
              tdl.textures.clampToMaxSize(
                  face.img, gl.tdl.textures.maxCubeMapSize));
        } else {
          var canvas = document.createElement('canvas');
          var width = face.img.width / 4;
          var height = face.img.height / 3;
          canvas.width = width;
          canvas.height = height;
          var ctx = canvas.getContext("2d");
          var sx = tdl.textures.CubeMap.offsets[faceIndex][0] * width;
          var sy = tdl.textures.CubeMap.offsets[faceIndex][1] * height;
          ctx.drawImage(face.img, sx, sy, width, height, 0, 0, width, height);
          gl.texImage2D(
              target, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE,
              tdl.textures.clampToMaxSize(
                  canvas, gl.tdl.textures.maxCubeMapSize));
        }
        uploaded = true;
      }
    }
    if (!uploaded) {
      var pixel = new Uint8Array([255,0,255,255]);
      gl.texImage2D(target, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
    }
  }
  var genMips = false;
  if (this.faces.length) {
    var faceImg = this.faces[0].img;
    if (this.faces.length == 6) {
      genMips = tdl.textures.isPowerOf2(faceImg.width) &&
                tdl.textures.isPowerOf2(faceImg.height);
    } else {
      genMips = tdl.textures.isPowerOf2(faceImg.width / 4) &&
                tdl.textures.isPowerOf2(faceImg.height / 3);
    }
  }
  if (genMips) {
    gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
    this.setParameter(gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  } else {
    this.setParameter(gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  }
};

/**
 * Recover from lost context.
 */
tdl.textures.CubeMap.prototype.recoverFromLostContext = function() {
  tdl.textures.TextureX.recoverFromLostContext.call(this);
  this.uploadTextures();
};

/**
 * Update a just downloaded loaded texture.
 * @param {number} faceIndex index of face.
 */
tdl.textures.CubeMap.prototype.updateTexture = function(faceIndex) {
  // mark the face as loaded
  var face = this.faces[faceIndex];
  face.loaded = true;
  // If all 6 faces are loaded then upload to GPU.
  var loaded = this.loaded();
  if (loaded) {
    this.uploadTextures();
  }
};

/**
 * Binds the CubeMap to a texture unit
 * @param {number} unit The texture unit.
 */
//tdl.textures.CubeMap.prototype.bindToUnit = function(unit) {
//  gl.activeTexture(gl.TEXTURE0 + unit);
//  gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.texture);
//};



