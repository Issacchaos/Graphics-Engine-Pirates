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
 * @fileoverview This file contains objects to deal with WebGL
 *               programs.
 */

tdl.provide('tdl.programs');

tdl.require('tdl.log');
tdl.require('tdl.string');
tdl.require('tdl.webgl');
//jh added
tdl.require('tdl.io');

/**
 * A module for programs.
 * @namespace
 */
tdl.programs = tdl.programs || {};

/**
 * Loads a program from script tags.
 * @param {string} vertexShaderId The id of the script tag that contains the
 *     vertex shader source.
 * @param {string} fragmentShaderId The id of the script tag that contains the
 *     fragment shader source.
 * @return {tdl.programs.Program} The created program.
 */
tdl.programs.loadProgramFromScriptTags = function(
    vertexShaderId, fragmentShaderId) {
  var vertElem = document.getElementById(vertexShaderId);
  var fragElem = document.getElementById(fragmentShaderId);
  if (!vertElem) {
    throw("Can't find vertex program tag: " + vertexShaderId);
  }
  if (!fragElem ) {
    throw("Can't find fragment program tag: " + fragmentShaderId);
  }
  
  //jh modified to add debugging info
  return tdl.programs.loadProgram(
      document.getElementById(vertexShaderId).text,
      document.getElementById(fragmentShaderId).text,
      "script id="+vertexShaderId,
      "script id="+fragmentShaderId);
};

//jh added this function
/** Loads a program synchronously from a remote site
 * @param {string} vertexShaderUrl The URL of the vertex shader source.
 * @param {string} fragmentShaderUrl The URL of the fragment shader source.
 * @return {tdl.programs.Program} The created program.
 */
tdl.programs.loadProgramFromURL = function(vertexShaderUrl, fragmentShaderUrl)
{
    var vs_src = tdl.io.loadTextFileSynchronous(vertexShaderUrl);
    var fs_src = tdl.io.loadTextFileSynchronous(fragmentShaderUrl);
    return tdl.programs.loadProgram(vs_src,fs_src,vertexShaderUrl,fragmentShaderUrl);
}

//jh modified to take description parameters
/**
 * Loads a program.
 * @param {string} vertexShader The vertex shader source.
 * @param {string} fragmentShader The fragment shader source.
 * @param {string} vsDesc Description of vertex shader; used for reporting errors
 * @param {string} fsDesc Description of fragment shader; used for reporting errors
 * @return {tdl.programs.Program} The created program.
 */
tdl.programs.loadProgram = function(vertexShader, fragmentShader, vsDesc, fsDesc ) {
  var id = vertexShader + fragmentShader;
  tdl.programs.init_();
  var program = gl.tdl.programs.programDB[id];
  if (program) {
    return program;
  }
  try {
    //jh modified to take description params
    program = new tdl.programs.Program(vertexShader, fragmentShader,vsDesc,fsDesc);
  } catch (e) {
    tdl.error(e);
    return null;
  }
  gl.tdl.programs.programDB[id] = program;
  return program;
};

//jh: added descriptions to aid in debugging
/**
 * A object to manage a WebGLProgram.
 * @constructor
 * @param {string} vertexShader The vertex shader source.
 * @param {string} fragmentShader The fragment shader source.
 * @param {string} vsdesc Used when reporting errors; otherwise, ignored.
 * @param {string} fsdesc Used when reporting errors; otherwise ignored.,
 */
tdl.programs.Program = function(vertexShader, fragmentShader, vsdesc, fsdesc) {
  
  
  //jh added
  var vsd = vsdesc || "";
  var fsd = fsdesc || "";
  this.description = vsd+"+"+fsd;
  var that=this;
  
  //jh added description for debugging
  /**
   * Loads a shader.
   * @param {!WebGLContext} gl The WebGLContext to use.
   * @param {string} shaderSource The shader source.
   * @param {number} shaderType The type of shader.
   * @param {string} shaderDesc Used for error reporting
   * @return {!WebGLShader} The created shader.
   */
  var loadShader = function(gl, shaderSource, shaderType, shaderDesc) {
    var id = shaderSource + shaderType;
    tdl.programs.init_();
    var shader = gl.tdl.programs.shaderDB[id];
    if (shader) {
      return shader;
    }

    // Create the shader object
    var shader = gl.createShader(shaderType);

    // Load the shader source
    gl.shaderSource(shader, shaderSource);

    // Compile the shader
    gl.compileShader(shader);

    // Check the compile status
    var compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (!compiled && !gl.isContextLost()) {
      // Something went wrong during compilation; get the error
      tdl.programs.lastError = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      
      //jh added additional info to debug message
      throw("*** Error compiling " + 
        (shaderType === gl.VERTEX_SHADER ? "vertex " : "fragment ") +
        "shader "+ (shaderDesc !== undefined ? shaderDesc : "") +":" + tdl.programs.lastError);
    }

    gl.tdl.programs.shaderDB[id] = shader;
    return shader;
  }

  /**
   * Loads shaders from script tags, creates a program, attaches the shaders and
   * links.
   * @param {!WebGLContext} gl The WebGLContext to use.
   * @param {string} vertexShader The vertex shader.
   * @param {string} fragmentShader The fragment shader.
   * @return {!WebGLProgram} The created program.
   */
  var loadProgram = function(gl, vertexShader, fragmentShader) {
    var vs;
    var fs;
    var program;
    try {
      //jh modified
      vs = loadShader(gl, vertexShader, gl.VERTEX_SHADER, vsd);
      fs = loadShader(gl, fragmentShader, gl.FRAGMENT_SHADER, fsd);
      program = gl.createProgram();
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      linkProgram(gl, program);
    } catch (e) {
      if (vs) { gl.deleteShader(vs) }
      if (fs) { gl.deleteShader(fs) }
      if (program) { gl.deleteShader(program) }
      throw(e);
    }
    return program;
  };


  /**
   * Links a WebGL program, throws if there are errors.
   * @param {!WebGLContext} gl The WebGLContext to use.
   * @param {!WebGLProgram} program The WebGLProgram to link.
   */
  var linkProgram = function(gl, program) {
    // Link the program
    gl.linkProgram(program);

    // Check the link status
    var linked = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (!linked && !gl.isContextLost()) {
      // something went wrong with the link
      tdl.programs.lastError = gl.getProgramInfoLog (program);
      
      //jh added output of tagname
      throw("*** Error in program linking: " + 
        that.description + ": " + tdl.programs.lastError);
    }
  };

  // Compile shaders
  var program = loadProgram(gl, vertexShader, fragmentShader, vsd, fsd);
  if (!program && !gl.isContextLost()) {
    throw ("could not compile program "+that.description);
  }

  // TODO(gman): remove the need for this.
  function flatten(array){
    var flat = [];
    for (var i = 0, l = array.length; i < l; i++) {
      var type = Object.prototype.toString.call(array[i]).split(' ').pop().split(']').shift().toLowerCase();
      if (type) { flat = flat.concat(/^(array|collection|arguments|object)$/.test(type) ? flatten(array[i]) : array[i]); }
    }
    return flat;
  }

  // Look up attribs.
  var attribs = {
  };
  // Also make a plain table of the locs.
  var attribLocs = {
  };

  function createAttribSetter(info, index) {
    if (info.size != 1) {
      throw("arrays of attribs not handled for "+that.description);
    }
    return function(b) {
        gl.bindBuffer(gl.ARRAY_BUFFER, b.buffer());
        gl.enableVertexAttribArray(index);
        gl.vertexAttribPointer(
            index, b.numComponents(), b.type(), b.normalize(), b.stride(), b.offset());
      };
  }

  var numAttribs = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
  for (var ii = 0; ii < numAttribs; ++ii) {
    var info = gl.getActiveAttrib(program, ii);
    if (!info) {
      break;
    }
    var name = info.name;
    if (tdl.string.endsWith(name, "[0]")) {
      name = name.substr(0, name.length - 3);
    }
    var index = gl.getAttribLocation(program, info.name);
    attribs[name] = createAttribSetter(info, index);
    attribLocs[name] = index
  }

  // Look up uniforms
  var numUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
  var uniforms = {
  };
  var textureUnit = 0;

  function createUniformSetter(info) {
    var loc = gl.getUniformLocation(program, info.name);
    var type = info.type;
    if (info.size > 1 && tdl.string.endsWith(info.name, "[0]")) {
      // It's an array.
      if (type == gl.FLOAT)
        return function() {
          var old;
          return function(v) {
            if (v !== old) {
              old = v;
              gl.uniform1fv(loc, v);
            }
          };
        }();
      if (type == gl.FLOAT_VEC2)
        return function() {
          // I hope they don't use -1,-1 as their first draw
          var old = new Float32Array([-1, -1]);
          return function(v) {
              //jh modified: removed if test
            //if (v[0] != old[0] || v[1] != old[1]) {
              gl.uniform2fv(loc, v);
            //}
          };
        }();
      if (type == gl.FLOAT_VEC3)
        return function() {
          // I hope they don't use -1,-1,-1 as their first draw
          var old = new Float32Array([-1, -1, -1]);
          return function(v) {
              
            //jh modified: removed if test
            //if (v[0] != old[0] || v[1] != old[1] || v[2] != old[2]) {
              gl.uniform3fv(loc, v);
            //}
          };
        }();
      if (type == gl.FLOAT_VEC4)
        return function(v) { gl.uniform4fv(loc, v); };
      if (type == gl.INT)
        return function(v) { gl.uniform1iv(loc, v); };
      if (type == gl.INT_VEC2)
        return function(v) { gl.uniform2iv(loc, v); };
      if (type == gl.INT_VEC3)
        return function(v) { gl.uniform3iv(loc, v); };
      if (type == gl.INT_VEC4)
        return function(v) { gl.uniform4iv(loc, v); };
      if (type == gl.BOOL)
        return function(v) { gl.uniform1iv(loc, v); };
      if (type == gl.BOOL_VEC2)
        return function(v) { gl.uniform2iv(loc, v); };
      if (type == gl.BOOL_VEC3)
        return function(v) { gl.uniform3iv(loc, v); };
      if (type == gl.BOOL_VEC4)
        return function(v) { gl.uniform4iv(loc, v); };
      if (type == gl.FLOAT_MAT2)
        return function(v) { gl.uniformMatrix2fv(loc, false, v); };
      if (type == gl.FLOAT_MAT3)
        return function(v) { gl.uniformMatrix3fv(loc, false, v); };
      if (type == gl.FLOAT_MAT4)
        return function(v) { gl.uniformMatrix4fv(loc, false, v); };
      if (type == gl.SAMPLER_2D || type == gl.SAMPLER_CUBE) {
        var units = [];
        for (var ii = 0; ii < info.size; ++ii) {
          units.push(textureUnit++);
        }
        return function(units) {
          return function(v) {
            gl.uniform1iv(loc, units);
            v.bindToUnit(units);
          };
        }(units);
      }
      throw ("unknown type for "+that.description+": 0x" + type.toString(16));
    } else {
      if (type == gl.FLOAT)
        return function(v) { gl.uniform1f(loc, v); };
      if (type == gl.FLOAT_VEC2)
        return function(v) { gl.uniform2fv(loc, v); };
      if (type == gl.FLOAT_VEC3)
        return function(v) { gl.uniform3fv(loc, v); };
      if (type == gl.FLOAT_VEC4)
        return function(v) { gl.uniform4fv(loc, v); };
      if (type == gl.INT)
        return function(v) { gl.uniform1i(loc, v); };
      if (type == gl.INT_VEC2)
        return function(v) { gl.uniform2iv(loc, v); };
      if (type == gl.INT_VEC3)
        return function(v) { gl.uniform3iv(loc, v); };
      if (type == gl.INT_VEC4)
        return function(v) { gl.uniform4iv(loc, v); };
      if (type == gl.BOOL)
        return function(v) { gl.uniform1i(loc, v); };
      if (type == gl.BOOL_VEC2)
        return function(v) { gl.uniform2iv(loc, v); };
      if (type == gl.BOOL_VEC3)
        return function(v) { gl.uniform3iv(loc, v); };
      if (type == gl.BOOL_VEC4)
        return function(v) { gl.uniform4iv(loc, v); };
      if (type == gl.FLOAT_MAT2)
        return function(v) { gl.uniformMatrix2fv(loc, false, v); };
      if (type == gl.FLOAT_MAT3)
        return function(v) { gl.uniformMatrix3fv(loc, false, v); };
      if (type == gl.FLOAT_MAT4)
        return function(v) { gl.uniformMatrix4fv(loc, false, v); };
      if (type == gl.SAMPLER_2D || type == gl.SAMPLER_CUBE) {
        return function(unit) {
          return function(v) {
            gl.uniform1i(loc, unit);
            v.bindToUnit(unit);
          };
        }(textureUnit++);
      }
      throw ("unknown type for "+that.description+": 0x" + type.toString(16));
    }
  }

  var textures = {};

  for (var ii = 0; ii < numUniforms; ++ii) {
    var info = gl.getActiveUniform(program, ii);
    if (!info) {
      break;
    }
    name = info.name;
    if (tdl.string.endsWith(name, "[0]")) {
      name = name.substr(0, name.length - 3);
    }
    var setter = createUniformSetter(info);
    uniforms[name] = setter;
    if (info.type == gl.SAMPLER_2D || info.type == gl.SAMPLER_CUBE) {
      textures[name] = setter;
    }
  }

  this.textures = textures;
  this.program = program;
  this.attrib = attribs;
  this.attribLoc = attribLocs;
  this.uniform = uniforms;

};

tdl.programs.handleContextLost_ = function() {
  if (gl.tdl && gl.tdl.programs && gl.tdl.programs.shaderDB) {
    delete gl.tdl.programs.shaderDB;
    delete gl.tdl.programs.programDB;
  }
};

tdl.programs.init_ = function() {
  if (!gl.tdl.programs) {
    gl.tdl.programs = { };
    tdl.webgl.registerContextLostHandler(gl.canvas, tdl.programs.handleContextLost_, true);
  }
  if (!gl.tdl.programs.shaderDB) {
    gl.tdl.programs.shaderDB = { };
    gl.tdl.programs.programDB = { };
  }
};

tdl.programs.Program.prototype.use = function() {
  gl.useProgram(this.program);
};

//function dumpValue(msg, name, value) {
//  var str;
//  if (value.length) {
//      str = value[0].toString();
//     for (var ii = 1; ii < value.length; ++ii) {
//       str += "," + value[ii];
//     }
//  } else {
//    str = value.toString();
//  }
//  tdl.log(msg + name + ": " + str);
//}

tdl.programs.Program.prototype.setUniform = function(uniform, value) {
  var func = this.uniform[uniform];
  if (func) {
    //dumpValue("SET UNI:", uniform, value);
    func(value);
  }
  else{
      // jh added for debugging
      if( this.warned === undefined )
        this.warned={};
      if( this.warned[uniform] === undefined ){
          this.warned[uniform] = true;
          tdl.log("Warning: Uniform "+uniform+" does not exist in "+this.description);
          if( console && console.trace )
            console.trace();
      }
  }
};

//jh added to help debugging
tdl.programs.Program.prototype.getAttribLoc = function(name){
    var lo = this.attribLoc[name];
    if( lo === undefined ){
        if( this.awarned === undefined )
            this.awarned={};
        if( this.awarned[name] === undefined ){
            this.awarned[name]=true;
            tdl.log("Warning: Attribute "+name+" does not exist in "+this.description);
            if( console && console.trace )
                console.trace();
        }
    }
    return lo;
};


