/*
  WebAudio Module Library
 */

(function () {
  "use strict";
  var __ctx;

  function getAudioContext() {
    if ( __ctx ) return __ctx;
    __ctx = new AudioContext();
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

  function createAudioParam(ctx,defaultValue,onchange) {
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

  /*
     createMtofTilde (aka mtof~)

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
    }
    shaper = ctx.createWaveShaper();
    shaper.curve = curve;
    return shaper;
  }

  function createMtofTilde(ctx, from, to, size, centerFreq, centerNote) {
    var normalize = ctx.createGain();
    var shaper = buildMtofShaper(ctx,from,to,size,centerFreq,centerNote);
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



  function WamlModule (ctx) {
    this.ctx = ctx;
  }
  WamlModule.prototype = Object.create(AudioNode.prototype);

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
    console: console,
    createDCOffset:  createDCOffset,
    createAudioParam: createAudioParam,
    createMtofTilde: createMtofTilde,
    midi2freq: midi2freq,
    freq2midi: freq2midi,
    siglog: function (ctx,prefix) {
      var i=0;
      var proc = ctx.createScriptProcessor(8192,1,1);
      if ( !prefix ) prefix = 'siglog';
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
