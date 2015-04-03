(function(){
  "use strict";

  function TriOscillator(ctx) {
    this.ctx = ctx;
    this.output = ctx.createGain();
    var that = this;
    var oscs = [];
    var freqMultipliers = [];
    var pitches = [];
    var gains = [];
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
      gains[i] = ctx.createGain();
      gains[i].gain.value = 1.0;
      oscs[i].connect(gains[i]);
      gains[i].connect(this.output);

      // Export audio params
      this['pitch' + i] = pitches[i];
      this['gain' + i] = gains[i].gain;
      this['detune' + i] = oscs[i].detune;
    }

    Object.defineProperty(this, 'type', {
      set: function(type) {
        that._type = type;
        oscs[0].type = oscs[1].type = oscs[2].type = type;
      },
      get: function() {
        return that._type;
      }
    });
    this.output.gain.value = 0.0; //Using as note gate, so set zero at first.
    return this;
  }
  TriOscillator.prototype = Object.create(Wani.Module.prototype);

  TriOscillator.prototype.noteOn = function (noteNumber) {
    this.frequency.cancelScheduledValues(0);
    this.frequency.value = Wani.midi2freq(noteNumber);
    this.output.gain.value = 0.3;
  };

  TriOscillator.prototype.noteOff = function (noteNumber) {
    this.output.gain.value = 0.0;
  };

  if ( 'undefined' !== typeof window &&
       'undefined' !== typeof window.Wani ) {
    Wani.registerModule({
      name: 'TriOscillator',
      author: 'aklaswad<aklaswad@gmail.com>',
      description: 'TriOscillator',
      create: TriOscillator,
      type: 'synth',
      audioParams: {
        frequency: {
          description: 'frequency (hz)',
          range: [0, 20000],
          lfoOnly: true,
        },
        pitch0: {
          description: "margin of midinote for 1st oscillator",
          range: [-24,24],
          step: 1,
        },
        pitch1: {
          description: "margin of midinote for 2nd oscillator",
          range: [-24,24],
          step: 1
        },
        pitch2: {
          description: "margin of note for 3rd oscillator",
          range: [-24,24],
          step: 1
        },
        gain0: {
          description: "Gain for 1st oscillator",
          range: [0,1],
        },
        gain1: {
          description: "Gain for 2nd oscillator",
          range: [0,1],
        },
        gain2: {
          description: "Gain for 3rd oscillator",
          range: [0,1],
        },
        detune0: {
          description: "Detune for 1st oscillator",
          range: [-100,100],
          step: 0.5
        },
        detune1: {
          description: "Detune for 2nd oscillator",
          range: [-100,100],
          step: 0.5
        },
        detune2: {
          description: "Detune for 3rd oscillator",
          range: [-100,100],
          step: 0.5
        }
      },
      params: {
        type: {
          values: ["sine", "sawtooth", "square", "triangle" ],
          description: "Wave shape type."
        },
      },
      presets: {
        plain: {
          audioParams: {
            pitch0:   0,   gain0: 0.9,    detune0:  0.0,
            pitch1:   0,   gain1: 0.9,    detune1:  0.0,
            pitch2:   0,   gain2: 0.9,    detune2:  0.0,
          },
          params: { type: 'sine' }
        },
        fatSaw: {
          audioParams: {
            pitch0: -12,   gain0: 1.0,    detune0:  0.0,
            pitch1:   0,   gain1: 0.9,    detune1:  8.0,
            pitch2:   0,   gain2: 0.9,    detune2: -8.0,
          },
          params: { type: 'sawtooth' }
        },
        major7: {
          audioParams: {
            pitch0:   0,   gain0: 1.0,    detune0:  0.0,
            pitch1:   4,   gain1: 0.3,    detune1:  6.0,
            pitch2:  11,   gain2: 0.2,    detune2: -6.0,
          },
          params: { type: 'sine' }
        },
        nes: {
          audioParams: {
            pitch0:   0,   gain0: 1.0,    detune0: -5.0,
            pitch1:   0,   gain1: 1.0,    detune1:  5.0,
            pitch2:  12,   gain2: 0.4,    detune2:  0.0,
          },
          params: { type: 'triangle' }
        }
      }
    });
  }
})();
