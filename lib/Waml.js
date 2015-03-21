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
    var ctx = this.getAudioContext();
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
  };

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
    var id = owner.__watcher_id = this.ownerAutoIndex++;
    if ( ! this.owners[id] ) this.owners[id] = [];
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
    var ctx = this.ctx;
    var offset = Waml.createDCOffset();
    var gain = ctx.createGain();
    offset.connect(gain);
    gain.gain.value = defaultValue;
    var param = gain.gain;
    var i, len = dest.length;
    for (i=0;i<len;i++) {
      offset.connect(dest[i]);
    };
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

  function WamlSynthesizer (ctx) {

  }
  WamlSynthesizer.prototype = Object.create(WamlModule.prototype);

  WamlSynthesizer.prototype.noteOn = function (noteNumber) {
    throw('Virtual method "WamlSynthesizer.noteOn" has called');
  };

  WamlSynthesizer.prototype.noteOff = function (noteNumber) {
    throw('Virtual method "WamlSynthesizer.noteOff" has called');
  };

  function WamlEffector (ctx) {
  }
  WamlEffector.prototype = Object.create(WamlModule.prototype);

  var Waml = {
    getAudioContext: getAudioContext,
    // ********* Provide Base Classes *********
    Synthesizer: WamlSynthesizer,
    Effector: WamlEffector,

    // ********* Package Manager *********
    synthesizers: {},
    effectors: {},
    registerSynthesizer: function (opts) {
      this.synthesizers[opts.name] = opts;
    },
    registerEffector: function (opts) {
      this.effectors[opts.name] = opts;
    },
    createSynthesizer: function (name) {
      var synthesizer = this.synthesizers[name];
      if (!synthesizer) throw("synthesizer " + name + " is not found");
      return new synthesizer.create(this.getAudioContext());
    },
    createEffector: function (name) {
      var effector = this.effectors[name];
      if (!effector) throw("effector " + name + " is not found");
      return new effector.create(this.getAudioContext());
    },
    describe: function () {
      // TBD
      console.log('/* Registered Synthesizers */');
      console.log(this.synthesizers);
      console.log('/* Registered Effectors */');
      console.log(this.effectors);
    },

    // ********* Helpers *********
    createDCOffset:  createDCOffset,
    midi2freq: midi2freq,
    freq2midi: freq2midi
  };

  //TBD Node?
  window.Waml = Waml;

})();
