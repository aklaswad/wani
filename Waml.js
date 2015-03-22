/*
  WebAudio Module Library
 */

(function () {
  "use strict";
  var __ctx;
  var __paramWatcher;

  function getAudioContext() {
    if ( __ctx ) return __ctx;
    __ctx = new AudioContext();
    __paramWatcher = new ParamWatcher(__ctx);
    return __ctx;
  }

  function midi2freq(noteNumber) {
    return 440.0 * Math.pow(2, (noteNumber-69)/12);
  }

  function freq2midi(frequency) {
    return Math.log2(frequency/440.0)*12 + 69;
  }

  function createDCOffset(value) {
    var ctx = Waml.getAudioContext();
    if ( 'undefined' === typeof value ) {
      value = 1;
    }
    var osc = ctx.createOscillator();
    var offset = ctx.createWaveShaper();
    var gain = ctx.createGain();
    offset.curve = new Float32Array([1,1]);
    gain.gain.value = value;
    osc.connect(offset);
    offset.connect(gain);
    osc.start();
    return gain;
  }

  // Param Watcher Singleton Object
  // TODO: make sure no memory leaks
  function ParamWatcher(ctx) {
    this.owners = {};
    this.ownerAutoIndex = 0;
    this.init(ctx);
    return this;
  }

  ParamWatcher.prototype.init = function (ctx) {
    this.engine = ctx.createScriptProcessor(512,2,2);
    var that = this;
    this.engine.onaudioprocess = function (e) {
      var ownerid,watcher,watchers,i,len, newval, dest, destlen,j;
      for (ownerid in that.owners) {
        watchers = that.owners[ownerid];
        len = watchers.length;
        for (i=0;i<len;i++) {
          watcher = watchers[i];
          if ( watcher.param.value !== watcher.last ) {
            newval = watcher.last = watcher.param.value;
            if ( watcher.callback ) {
              watcher.callback(newval);
            }
            else {
              destlen = watcher.destinations.length;
              for ( j=0;j<destlen;j++ ) {
                watcher.destinations[j].value = newval;
              }
            }
          }
        }
      }
    };
    var mute = ctx.createGain();
    mute.gain.value = 0.0;
    this.engine.connect(mute);
    mute.connect(ctx.destination);
  };

  ParamWatcher.prototype.add = function(owner, param, destinations,callback) {
    var id = owner.__watcher_id;
    if (!id) {
      id = owner.__watcher_id = this.ownerAutoIndex++;
      this.owners[id] = [];
    }
    var watched = { param: param, last: param.value };
    if ( callback ) {
      watched.callback = callback;
    }
    else if ( ! destinations instanceof Array ) {
      watched.destinations = [destinations];
    }
    else {
      watched.destinations = destinations;
    }
    this.owners[id].push(watched);
  };

  ParamWatcher.prototype.remove = function(owner) {
    delete this.owners[owner.__watcher_id];
  };

  function WamlModule (ctx) {
    this.ctx = ctx;
  }
  WamlModule.prototype = Object.create(AudioNode.prototype);

  /* A hacky way to create own AudioParam;
     a scriptProcessor which outputs DC offset(1.0)
     is connected to Gain node. And publish
     gain's parameter instance as interface.
     There also is needed to watch the static value.
   */
  WamlModule.prototype.createAudioParamBridge = function(defaultValue, dest, callback) {
    var ctx = Waml.getAudioContext();
    var offset = Waml.createDCOffset(1.0);
    var gain = ctx.createGain();
    offset.connect(gain);
    gain.gain.value = defaultValue;
    var param = gain.gain;
    var i, len = dest.length;
    for (i=0;i<len;i++) {
      gain.connect(dest[i]);
    }
    __paramWatcher.add(this,param,dest,callback);
    return param;
  };

  WamlModule.prototype.multiply = function (from, value) {
    var gain = this.ctx.createGain();
    gain.gain.value = value;
    from.connect(gain);
    return {
      connect: function (dest) {
        return gain.connect(dest);
      }
    };
  };

  WamlModule.prototype.add = function (from, value) {
    var offset = Waml.createDCOffset(value);
    var gain = this.ctx.createGain();
    gain.gain.value = 1;
    offset.connect(gain);
    from.connect(gain);
    return {
      connect: function (dest) {
        return gain.connect(dest);
      }
    };
  };

  WamlModule.prototype.destory = function () {
    __paramWatcher.remove(this);
  };

  var Waml = {
    getAudioContext: getAudioContext,
    // ********* Provide Base Classes *********
    Module: WamlModule,
    modules: {},
    // ********* Package Manager *********
    registerModule: function (module) {
      if ( !this.__validate(module) ) {
        this.console.error('Failed to load module');
        return;
      }
      this.modules[module.name] = module;
      if ( 'undefined' !== typeof this.onmoduleload ) {
        this.onmoduleload(module);
      }
    },
    __validate: function(module) {
      var name, i,len;
      if ( !module.name ) {
        this.console.error('Cannot register unnamed module');
        return false;
      }
      name = module.name;
      if ( !module.isSynth && !module.isEffect ) {
        this.console.error('Module must be synth or effect');
        return false;
      }
      return true;
    },
    createModule: function (name) {
      var module = this.modules[name];
      if (!module) throw("Module '" + name + "' is not found");
      return new module.create(this.getAudioContext());
    },
    listSynthesizers: function () {
      var name, synthesizers = [];
      for (name in this.modules) {
        if ( this.modules[name].isSynth ) {
          synthesizers.push(name);
        }
      }
      return synthesizers;
    },
    listEffects: function () {
      var name, effects = [];
      for (name in this.modules) {
        if ( this.modules[name].isEffect ) {
          effects.push(name);
        }
      }
      return effects;
    },
    describeAll: function (reader) {
      for (var name in this.modules) {
        this.describe(name, reader);
      }
    },
    definition: function(name) {
      return this.modules[name];
    },
    describe: function (name, reader) {
      if ( 'undefined' === reader ) {
        reader = console.log;
      }
      var module = this.modules[name];
      if ( !module ) {
        reader( 'Module ' + name + ' is not registered' );
        return;
      }
      reader( "Name: " + name );
      reader( "Author: " + module.author || '(unknown)' );
    },

    // ********* Helpers *********
    console: console,
    createDCOffset:  createDCOffset,
    midi2freq: midi2freq,
    freq2midi: freq2midi
  };

  //TBD Node?
  window.Waml = Waml;

})();
