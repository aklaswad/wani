(function(){
  "use strict";

  function TriOscillator(ctx) {
    this.ctx = ctx;
    this.outlet = ctx.createGain();
    var that = this;
    var oscs = [];
    var freqMultipliers = [];
    var i;
    for ( i=0;i<3;i++) {
      oscs[i] = ctx.createOscillator();
      oscs[i].start(0);
      freqMultipliers[i] = ctx.createGain();
      freqMultipliers[i].gain.value = 1 + i/3;
      freqMultipliers[i].connect(oscs[i].frequency);
      oscs[i].connect(this.outlet);
    }

    var setFrequencyValue = function (value) {
      for ( i=0;i<3;i++) {
        oscs[i].frequency.value = value * (1 + i/3);
      }
    };
    setFrequencyValue(220); // Set Default value

    this.frequency = this.createAudioParamBridge(
      220,
      freqMultipliers,
      setFrequencyValue
    );

    this.detune = this.createAudioParamBridge(
      0,
      [ oscs[0].detune, oscs[1].detune, oscs[2].detune ]
    );

    Object.defineProperty(this, 'type', {
      set: function(type) {
        that._type = type;
        oscs[0].type = oscs[1].type = oscs[2].type = type;
      },
      get: function() {
        return that._type;
      }
    });
    this.outlet.gain.value = 0.0; //Using as note gate, so set zero at first.
    return this;
  };

  TriOscillator.prototype = Object.create(Waml.Module.prototype);

  TriOscillator.prototype.connect = function () {
    return this.outlet.connect.apply(this.outlet,arguments);
  };

  TriOscillator.prototype.disconnect = function () {
    return this.outlet.disconnect.apply(this.outlet,arguments);
  };

  TriOscillator.prototype.noteOn = function (noteNumber) {
    this.frequency.cancelScheduledValues(0);
    this.frequency.value = Waml.midi2freq(noteNumber);
    this.outlet.gain.value = 0.3;
  };

  TriOscillator.prototype.noteOff = function (noteNumber) {
    this.outlet.gain.value = 0.0;
  };

  if ( 'undefined' !== typeof window
    && 'undefined' !== typeof window.Waml ) {
    Waml.registerModule({
      name: 'TriOscillator',
      author: 'aklaswad<aklaswad@gmail.com>',
      description: 'TriOscillator',
      create: TriOscillator,
      isSynth: true,
      audioParams: {
        frequency: {
          description: 'frequency (hz)',
          range: [0, 20000],
        },
        detune: {
          description: 'detune (cent)',
          range: [-100, 100],
        },
      },
      params: {
        type: {
          values: ["sine", "sawtooth", "square", "triangle" ],
          description: "Wave shape type.",
        }
      }
    });
  }
})();
