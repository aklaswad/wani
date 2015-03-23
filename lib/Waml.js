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

  function midi2freq(noteNumber, centerFreq, centerNote) {
    if ( 'undefined' === typeof centerFreq ) { centerFreq = 440 }
    if ( 'undefined' === typeof centerNote ) { centerNote = 69 }
    return centerFreq * Math.pow(2, (noteNumber-centerNote)/12);
  }

  function freq2midi(frequency,centerFreq,centerNote) {
    if ( 'undefined' === typeof centerFreq ) { centerFreq = 440 }
    if ( 'undefined' === typeof centerNote ) { centerNote = 69 }
    return Math.log2(frequency/centerFreq)*12 + centerNote;
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

  //XXX: How to call this?
  WamlModule.prototype.destory = function () {
    __paramWatcher.remove(this);
  };

  WamlModule.prototype.createSignalizedParam = function (defaultValue) {
    var gain = this.ctx.createGain();
    var offset = createDCOffset('undefined' === typeof defaultValue ? 1.0 : defaultValue);
    offset.connect(gain);
    return {
      param: gain.gain,
      connect: gain.connect
    };
  };

  var audioParam = function (ctx,defaultValue,onchange) {
    var lfo = ctx.createGain();
    var offset = createDCOffset(1.0);
    Object.defineProperty(lfo,'value',{
      set: function(value) {
        if ( 'function' === typeof lfo.onchange ) {
          var res = lfo.onchange(value, lfo.__waml_value);
          if (false === res) return;
        }
        lfo.__waml_value = value;
        offset.gain.value = value;
      },
      get: function() {
        return lfo.__waml_value;
      }
    });
    var imports = [
      'setValueAtTime',               'linearRampToValueAtTime',
      'exponentialRampToValueAtTime', 'setTargetAtTime',
      'setValueCurveAtTime',          'cancelScheduledValues',
    ];
    var len = imports.length;
    for ( var i=0;i<len;i++ ) {
      var prop = imports[i];
      lfo[prop] = function () { AudioParam.prototype[prop].apply(offset.gain,arguments) };
    }
    lfo.gain.value = 1.0;
    lfo.onchange = onchange;
    offset.connect(lfo);
    return lfo;
  };

  WamlModule.prototype.defineParamBridge = function(name, defaultValue, dest, callback) {
    var ctx = Waml.getAudioContext();
    var sig = this.createSignalizedParam(defaultValue);
    var i, len = dest.length;
    for (i=0;i<len;i++) {
      gain.connect(dest[i]);
    }
    __paramWatcher.add(this,name,dest,callback);
    this[name] = sig.param;
  };

  /* A hacky way to create own AudioParam;
     DC offset(1.0) is connected to Gain node, And publish
     gain's parameter instance as interface. So we can get
     the params value as Audio signals. (when it is modulated);
     There also is needed to watch the static value.
   */
  WamlModule.prototype.createAudioParamBridge = function(defaultValue, dest, callback) {
    var ctx = Waml.getAudioContext();
    var param = audioParam(ctx, defaultValue);
    var i, len = dest.length;
    for (i=0;i<len;i++) {
      param.connect(dest[i]);
    }
    __paramWatcher.add(this,param,dest,callback);
    return param;
  };

  /*
     createMidi2FreqShaper (aka mtof~)

     WaveShaper node only supports input range from -1.0 to 1.0, so
     once map MIDI note to that range, and pass to shaper.
     this only supports MIDI note number of from -256 to 256
   */

  function buildMtofShaper(ctx, from, to, size, centerFreq, centerNote) {
    var shaper;
    if ( 'undefined' === typeof from ) { from = 0 }
    if ( 'undefined' === typeof to ) { to = 128 }
    if ( !size ) { size=256 };
    var range = Math.abs(from - to);
    var curve = new Float32Array(size);
    for ( var i=0;i<size;i++) {
      curve[i] = midi2freq( ( from + range * (i/size)), centerFreq, centerNote );
if (0 == i%1024) console.log(i, curve[i]);
    }
    shaper = ctx.createWaveShaper();
    shaper.curve = curve;
    return shaper;
  }

  WamlModule.prototype.createMidi2FreqShaper = function (from, to, size, centerFreq, centerNote) {
    var normalize = this.ctx.createGain();
    var shaper = buildMtofShaper(this.ctx,from,to,size,centerFreq,centerNote);
    normalize.gain.value = 1 / Math.abs(from - to);
    normalize.connect(shaper);

    // hack: override the connect()
    normalize.connect = function () {
      shaper.connect.apply(shaper,arguments);
    };
    normalize.disconnect = function () {
      shaper.disconnect.apply(shaper,arguments);
    };
    return normalize;
  };

  var Waml = {
    getAudioContext: getAudioContext,
    // ********* Provide Base Class *********
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
    definition: function(name) {
      return this.modules[name];
    },

    // ********* Helpers *********
    audioParam: audioParam,
    console: console,
    createDCOffset:  createDCOffset,
    midi2freq: midi2freq,
    freq2midi: freq2midi,
    siglog: function (ctx,prefix) {
      var i=0;
      var proc = ctx.createScriptProcessor(8192,1,1);
      proc.onaudioprocess = function (e) {
        if ( i++ % 4 ) return;
        var ary = e.inputBuffer.getChannelData(0);
        console.log(prefix+':',ary[0]);
      };
      var mute = ctx.createGain();
      mute.gain.value = 0;
      proc.connect(mute);
      mute.connect(ctx.destination);
      return proc;
    }
  };

  //TBD Node?
  window.Waml = Waml;

})();
