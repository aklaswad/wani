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

  function WamlSynthesizer (ctx) {

  }
  WamlSynthesizer.prototype = Object.create(WamlModule.prototype);

  WamlSynthesizer.prototype.noteOn = function (noteNumber) {
    throw('Virtual method "WamlSynthesizer.noteOn" has called');
  };

  WamlSynthesizer.prototype.noteOff = function (noteNumber) {
    throw('Virtual method "WamlSynthesizer.noteOff" has called');
  };

  function WamlEffect (ctx) {
  }
  WamlEffect.prototype = Object.create(WamlModule.prototype);

  var Waml = {
    getAudioContext: getAudioContext,
    // ********* Provide Base Classes *********
    Synthesizer: WamlSynthesizer,
    Effect: WamlEffect,

    // ********* Package Manager *********
    synthesizers: {},
    effects: {},
    registerSynthesizer: function (opts) {
      this.synthesizers[opts.name] = opts;
    },
    registerEffect: function (opts) {
      this.effects[opts.name] = opts;
    },
    createSynthesizer: function (name) {
      var synthesizer = this.synthesizers[name];
      if (!synthesizer) throw("synthesizer " + name + " is not found");
      return new synthesizer.create(this.getAudioContext());
    },
    createEffect: function (name) {
      var effect = this.effects[name];
      if (!effect) throw("effect " + name + " is not found");
      return new effect.create(this.getAudioContext());
    },
    describe: function () {
      // TBD
      console.log('/* Registered Synthesizers */');
      console.log(this.synthesizers);
      console.log('/* Registered Effects */');
      console.log(this.effects);
    },

    // ********* Helpers *********
    createDCOffset:  createDCOffset,
    midi2freq: midi2freq,
    freq2midi: freq2midi
  };

  //TBD Node?
  window.Waml = Waml;

})();
;(function () {

  function createWaveFormRenderer(canvas, multiplier) {
    var ctx = Waml.getAudioContext();
    if ( !multiplier ) multiplier = 1;
    var proc = ctx.createScriptProcessor(2048,1,1);
    var cctx = canvas.getContext('2d');
    cctx.strokeStyle = '#000';
    var frames = 0;
    var last = {max: 0, maxframe: 0 };
    proc.onaudioprocess = function(evt) {
      var i,channel = evt.inputBuffer.getChannelData(0);
      cctx.clearRect(0,0,canvas.width,canvas.height);
      cctx.moveTo(0,100);
      cctx.beginPath();
      var max = 0;
      for(i=0;i<512;i++){
        var vv = [];
        var idx = i * 4;
        vv[0] = multiplier * channel[idx];
        vv[1] = multiplier * channel[idx+1];
        vv[2] = multiplier * channel[idx+2];
        vv[3] = multiplier * channel[idx+3];
        var j,v = 0;
        var minv=1,maxv=-1,maxabsv = 0;
        for(j=1;j<4;j++) {
          if ( maxv < vv[j] ) {
            maxv=vv[j];
          }
          if ( vv[j] < minv ) {
            minv=vv[j];
          }
          if ( maxabsv < Math.abs(vv[j]) ) {
            maxabsv=Math.abs(vv[j]);
          }
        }
        cctx.lineTo(i,100 + -100 * minv);
        cctx.lineTo(i,100 + -100 * maxv);
        max = maxabsv;
      }
      if ( last.max < max || last.maxframe < frames - 8 ) {
        last.max = max;
        last.maxframe = frames;
      }
      cctx.stroke();
      frames++;
    };
    var mute = ctx.createGain();
    mute.gain.value = 0.0;
    mute.connect(ctx.destination);
    proc.connect(mute);
    return proc;
  }

  function loadScriptFromURL(url,cb) {
    var script = document.createElement('script');
    script.src = url;
    if (cb) script.onload = cb;
    document.body.appendChild(script);
  }

  Waml.Web = {
    createWaveFormRenderer: createWaveFormRenderer,
    loadScriptFromURL: loadScriptFromURL
  };
})();
