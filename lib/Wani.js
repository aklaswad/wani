/*
  WebAudio Module Library
 */

(function () {
  "use strict";
  var __ctx;

  function getAudioContext() {
    if ( __ctx ) return __ctx;
    var Context = window.AudioContext || window.webkitAudioContext;
    __ctx = new Context();
    return __ctx;
  }

  function midi2freq(noteNumber, centerFreq, centerNote) {
    if ( 'undefined' === typeof centerFreq ) { centerFreq = 440; }
    if ( 'undefined' === typeof centerNote ) { centerNote = 69; }
    return centerFreq * Math.pow(2, (noteNumber-centerNote)/12);
  }

  function freq2midi(frequency,centerFreq,centerNote) {
    if ( 'undefined' === typeof centerFreq ) { centerFreq = 440; }
    if ( 'undefined' === typeof centerNote ) { centerNote = 69; }
    return Math.log2(frequency/centerFreq)*12 + centerNote;
  }

  function createDCOffset(value) {
    var ctx = Wani.getAudioContext();
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
    osc.start(0);
    return gain;
  }

  function createAudioParam(ctx,defaultValue,onchange) {
    var lfo = ctx.createGain();
    var offset = createDCOffset(1.0);
    Object.defineProperty(lfo,'value',{
      set: function(value) {
        if ( 'function' === typeof lfo.onchange ) {
          var res = lfo.onchange(value, lfo.__wani_value);
          if (false === res) return;
        }
        lfo.__wani_value = value;
        offset.gain.value = value;
      },
      get: function() {
        return lfo.__wani_value;
      }
    });
    lfo.__wani_value = offset.gain.value = defaultValue;
    lfo.setValueAtTime = function(){ AudioParam.prototype.setValueAtTime.apply(offset.gain, arguments);};
    lfo.linearRampToValueAtTime = function(){ AudioParam.prototype.linearRampToValueAtTime.apply(offset.gain, arguments);};
    lfo.exponentialRampToValueAtTime = function(){ AudioParam.prototype.exponentialRampToValueAtTime.apply(offset.gain, arguments);};
    lfo.setTargetAtTime = function(){ AudioParam.prototype.setTargetAtTime.apply(offset.gain, arguments);};
    lfo.setValueCurveAtTime = function(){ AudioParam.prototype.setValueCurveAtTime.apply(offset.gain, arguments);};
    lfo.cancelScheduledValues = function(){ AudioParam.prototype.cancelScheduledValues.apply(offset.gain, arguments);};
    lfo.gain.value = 1.0;
    lfo.onchange = onchange;
    offset.connect(lfo);
    return lfo;
  }

  /*
     createMtofTilde (aka mtof~)

     WaveShaper node only supports input range from -1.0 to 1.0, so
     once map MIDI note to that range, and pass to shaper.
     this only supports MIDI note number of from -256 to 256
   */

  function buildMtofShaper(ctx, from, to, size, centerFreq, centerNote) {
    var shaper;
    if ( 'undefined' === typeof from ) { from = 0; }
    if ( 'undefined' === typeof to ) { to = 128; }
    if ( !size ) { size=256; }
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
    var range = Math.abs(from - to);
    normalize.gain.value = 2 / range;
    normalize.connect(shaper);
    var offset = createDCOffset(-(from + (range / 2)));
    offset.connect(normalize);

    // hack: override the connect()
    normalize.connect = function () {
      shaper.connect.apply(shaper,arguments);
    };
    normalize.disconnect = function () {
      shaper.disconnect.apply(shaper,arguments);
    };
    return normalize;
  }

  /* Override the AudioNode.prototype.connect to try connecting our pseudo node.
    Is this illegal ? May be I need some switch to opt out this feature... */
  var original_connect = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function () {
    var theError, dest;
    // At first, try the original `connect`
    try {
      original_connect.apply(this,arguments);
    }
    catch(originalError) {
      // And, if it was failed, try again for our pseudo interface.
      theError = originalError;
      dest = arguments[0];
      arguments[0] = dest.input;
      try {
        original_connect.apply(this,arguments);
      }
      catch (error) {
        // Everything was going wrong, throw the original error message.
        throw theError;
      }
    }
  };

  function WaniModule (ctx) {
    this.ctx = ctx;
  }

  WaniModule.prototype.connect = function () {
    return this.output.connect.apply( this.output, arguments );
  };

  WaniModule.prototype.disconnect = function () {
    return this.output.disconnect.apply( this.output, arguments );
  };

  function Poly (name) {
    var ctx = Wani.getAudioContext();
    var m = Wani.createModule(name);
    this.name = name;
    this.modules = [m];
    this.muting = [m];
    this.playing = {};
    this.values = {};
    this.profile = Wani.definition(name);
    var that = this;
    var prop;
    for (prop in this.profile.audioParams) {
      this[prop] = Wani.createAudioParam(ctx,m[prop].value);
      this[prop].connect( m[prop] );
      m[prop].value = 0;
    }
    for (prop in this.profile.params) {
      (function(prop) {
        Object.defineProperty(that,prop,{
          set: function (v) {
            that.values[prop] = v;
            var len = this.modules.length;
            var i=0;
            for (i=0;i<len;i++) {
              that.modules[i][prop] = v;
            }
          },
          get: function () {
            return that.values[prop];
          }
        });
      })(prop);
      this.values[prop] = m[prop];
    }
    this.output = ctx.createGain();
    m.connect(this.output);
    for (var i = 0; i<8;i++) {
      this.muting.push(this.wantInstance());
    }
    return this;
  }
  Poly.prototype = Object.create(WaniModule.prototype);

  Poly.prototype.wantInstance = function() {
    // create instance, and set up current values before enable it.
    var ctx = Wani.getAudioContext();
    var m = Wani.createModule(this.name);
    var prop;
    for ( prop in this.profile.audioParams ) {
      m[prop].value = 0;
      this[prop].connect(m[prop]);
    }
    for (prop in this.values) {
      m[prop] = this.values[prop];
    }
    m.connect(this.output);
    this.modules.push(m);
    return m;
  }

  Poly.prototype.noteOn = function (nn,v) {
    var m;
    m = this.muting.length ? this.muting.shift() : this.wantInstance()
    if ( 'undefined' === typeof this.playing[nn] ) this.playing[nn] = [];
    this.playing[nn].push(m);
    m.noteOn(nn,v);
  }

  Poly.prototype.noteOff = function (nn) {
    var m = this.playing[nn].shift();
    if ( 'undefined' === typeof m ) return;
    m.noteOff(nn);
    this.muting.push(m);
  }

  var Wani = {
    getAudioContext: getAudioContext,
    // ********* Provide Base Class *********
    Module: WaniModule,
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
      return true;
    },
    createModule: function (name,options) {
      if ( 'undefined' === typeof options ) options = {};
      if (options && options.poly) {
        return new Poly(name);
      }
      var profile = this.modules[name];
      if (!profile) throw("Module '" + name + "' is not found");
      var module = new profile.create(this.getAudioContext(),options);
      module.profile = profile;
      for ( var p in profile.audioParams ) {
        module[p].profile = profile.audioParams[p];
      }
      return module;
    },
    list: function (type) {
      var name, modules = [];
      for (name in this.modules) {
        if ( this.modules[name].type === type ) {
          modules.push(name);
        }
      }
      return modules;
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
    applyPreset: function(module, name) {
      var profile = module.profile, k;
      if ( 'undefined' === typeof profile ) return;
      if ( 'undefined' === typeof profile.presets ) return;
      var preset = profile.presets[name];
      if ( 'undefined' === typeof preset ) return;
      for ( k in presets.audioParams ) {
        module[k].value = preset.audioParams[k];
      }
      for ( k in presets.params ) {
        module[k] = preset.params[k];
      }
    },
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
  window.Wani = Wani;

})();
