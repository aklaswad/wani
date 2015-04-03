(function () {
  'use strict';

  function LFO (ctx) {
    var that = this;
    Object.defineProperty(this, 'type', {
      set: function(type) {
        that._osc.type = type;
      },
      get: function() {
        return that._osc.type;
      }
    });
  };

  LFO.prototype.connect = function (param) {
    if ( 'undefined' === typeof param.profile ) return;
    var profile = param.profile();
    this.__profile.range = profile.range;
    this._gain = ctx.createGain;
    this._gain.gain.value = 0.0;
    this._osc = ctx.createOscillator;
    this._osc.frequency.value = 0.0;
    this.range = Wani.createAudioParam(ctx, 0.0);
    this._osc.connect(this._gain);
    this.range.connect(this._gain.gain);
    this.speed = this._osc.frequency;
    this._osc.start();
  };

  LFO.prototype.disconnect = function () {
    this._gain.disconnect.apply(this._gain,arguments);
  };

  Wani.registerModule({
    name: 'LFO',
    create: LFO,
    type: 'synth',
    audioParams: {
      range: {
        range: [0,1]
      },
      center: {
        range: [0,1]
      },
      speed: {
        range: [0,20]
      },
    },
  });

})();
