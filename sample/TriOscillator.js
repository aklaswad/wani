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

    this.frequency = Wani.createAudioParam(this.ctx,0);

    for ( i=0;i<3;i++) {
      oscs[i] = ctx.createOscillator();
      oscs[i].frequency.value = 0; //Always zero. use audio signal only!
      oscs[i].start(0);
      pitches[i] = Wani.createAudioParam(ctx,0);
      pitches[i].value = 0;
      mtofs[i] = Wani.createMtofTilde(ctx,-24,24,4096,1,0);
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
  }
  TriOscillator.prototype = Object.create(Wani.Module.prototype);

  TriOscillator.prototype.noteOn = function (noteNumber) {
    this.frequency.cancelScheduledValues(0);
    this.frequency.value = Wani.midi2freq(noteNumber);
    this.outlet.gain.value = 0.3;
  };

  TriOscillator.prototype.noteOff = function (noteNumber) {
    this.outlet.gain.value = 0.0;
  };

  if ( 'undefined' !== typeof window &&
       'undefined' !== typeof window.Wani ) {
    Wani.registerModule({
      name: 'TriOscillator',
      author: 'aklaswad<aklaswad@gmail.com>',
      description: 'TriOscillator',
      create: TriOscillator,
      isSynth: true,
      audioParams: {
        frequency: {
          description: 'frequency (hz)',
          range: [0, 20000],
          lfoOnly: true,
        },
        secondFreqBy: {
          shortName: 'pitch1',
          description: "multiprier for second oscillator(margin of midinote)",
          range: [-24,24],
          step: 0.5
        },
        thirdFreqBy: {
          shortName: 'pitch2',
          description: "multiprier for third oscillator(margin of midinote)",
          range: [-24,24],
          step: 0.5
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
