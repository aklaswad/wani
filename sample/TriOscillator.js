(function(){
  "use strict";

  function TriOscillator(ctx) {
    this.ctx = ctx;
    this.outlet = ctx.createGain();
    var that = this;
    var oscs = [];
    var freqMultipliers = [];
    var pitches = [];
    var mtofs = [];
    var i;

    this.frequency = Waml.createAudioParam(this.ctx,220);

    for ( i=0;i<3;i++) {
      oscs[i] = ctx.createOscillator();
      oscs[i].frequency.value = 0; //Always zero. use audio signal only!
      oscs[i].start(0);
      pitches[i] = Waml.createAudioParam(ctx,0);
      mtofs[i] = Waml.createMtofTilde(ctx,-24,24,4096,1,0);
      freqMultipliers[i] = ctx.createGain();
      freqMultipliers[i].gain.value = 0;

      pitches[i].connect(mtofs[i]);
      mtofs[i].connect(freqMultipliers[i].gain);
      this.frequency.connect(freqMultipliers[i]);
      freqMultipliers[i].connect(oscs[i].frequency);
      oscs[i].connect(this.outlet);
    }

    pitches[0].value = 0;
    this.secondFreqBy = pitches[1];
    this.thirdFreqBy = pitches[2];

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
        secondFreqBy: {
          description: "multiprier for second oscillator(margin of midinote)",
          range: [-24,24]
        },
        thirdFreqBy: {
          description: "multiprier for third oscillator(margin of midinote)",
          range: [-24,24]
        }
      },
      params: {
        type: {
          values: ["sine", "sawtooth", "square", "triangle" ],
          description: "Wave shape type."
        },
      },
    });
  }
})();
