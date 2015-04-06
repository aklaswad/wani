(function(){
  "use strict";

  function TriOscillator(ctx,options) {
    this.ctx = ctx;
    this.output = ctx.createGain();
    this.attack = 0.2;
    this.decay = 0.2;
    this.sustain = 0.3;
    this.release = 1;
    var that = this;
    var oscs = [];
    var freqMultipliers = [];
    var pitches = [];
    var gains = [];
    var mtofs = [];
    var i;
    var poly = options.poly;

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

  TriOscillator.prototype.noteOn = function (noteNumber,pow) {
    if ( !this.poly ) {
      this.output.gain.value = pow;
      return;
    }
    if ('undefined' === typeof pow) pow = 1.0;
    var now = this.ctx.currentTime;
    this.frequency.cancelScheduledValues(0);
    this.frequency.value = Wani.midi2freq(noteNumber);
    this.output.gain.value = this.sustain * pow;
    this.output.gain.cancelScheduledValues(now);
    this.output.gain.setValueAtTime(0.0,now);
    var that = this;
    setTimeout(function () {
      var now = that.ctx.currentTime;
      that.output.gain.linearRampToValueAtTime(pow, now + that.attack + 0.001);
      that.output.gain.setTargetAtTime(that.sustain * pow, now + that.attack + 0.002, that.decay);
    },1);
    this.decayEndAt = now + this.attack + this.decay;
  };

  TriOscillator.prototype.noteOff = function (noteNumber) {
    if ( !this.poly ) {
      this.output.gain.value = 0;
      return;
    }
    var now = this.ctx.currentTime;
    var begin = now < this.decayEndAt ? this.decayEndAt : now;
    this.output.gain.setTargetAtTime(0.0, begin, this.release);
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
          looks: ['none']
        },
        pitch0: {
          group: 'pitch',
          description: "margin of midinote for 1st oscillator",
          range: [-24,24],
          step: 1,
        },
        pitch1: {
          group: 'pitch',
          description: "margin of midinote for 2nd oscillator",
          range: [-24,24],
          step: 1
        },
        pitch2: {
          group: 'pitch',
          description: "margin of note for 3rd oscillator",
          range: [-24,24],
          step: 1
        },
        gain0: {
          group: 'gain',
          description: "Gain for 1st oscillator",
          range: [0,1],
        },
        gain1: {
          group: 'gain',
          description: "Gain for 2nd oscillator",
          range: [0,1],
        },
        gain2: {
          group: 'gain',
          description: "Gain for 3rd oscillator",
          range: [0,1],
        },
        detune0: {
          group: 'detune',
          description: "Detune for 1st oscillator",
          range: [-100,100],
          step: 0.5
        },
        detune1: {
          group: 'detune',
          description: "Detune for 2nd oscillator",
          range: [-100,100],
          step: 0.5
        },
        detune2: {
          group: 'detune',
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
        attack: {
          group: 'ADSR',
          range: [0,0.5],
          description: "Attack time (s)"
        },
        decay: {
          group: 'ADSR',
          range: [0,1],
          description: "Decay time (s)"
        },
        sustain: {
          group: 'ADSR',
          range: [0,1],
          description: "Sustain volume (0.0-1.0)"
        },
        release: {
          group: 'ADSR',
          range: [0,2],
          description: "Release time (s)"
        },
      },
      presets: {
        plain: {
          audioParams: {
            pitch0:   0,   gain0: 0.9,    detune0:  0.0,
            pitch1:   0,   gain1: 0.9,    detune1:  0.0,
            pitch2:   0,   gain2: 0.9,    detune2:  0.0,
          },
          params: {
            type: 'sine',
            attack: 0.04,
            decay: 0.1,
            sustain: 0.3,
            release: 0.5
          }
        },
        fatSaw: {
          audioParams: {
            pitch0: -12,   gain0: 1.0,    detune0:  0.0,
            pitch1:   0,   gain1: 0.9,    detune1:  8.0,
            pitch2:   0,   gain2: 0.9,    detune2: -8.0,
          },
          params: {
            type: 'sawtooth',
            attack: 0.07,
            decay: 0.5,
            sustain: 0.7,
            release: 0.1
          }
        },
        major7: {
          audioParams: {
            pitch0:   0,   gain0: 1.0,    detune0:  0.0,
            pitch1:   4,   gain1: 0.3,    detune1:  6.0,
            pitch2:  11,   gain2: 0.2,    detune2: -6.0,
          },
          params: {
            type: 'sine',
            attack: 0.1,
            decay: 0.5,
            sustain: 0.8,
            release: 0.5
          }
        },
        nes: {
          audioParams: {
            pitch0:   0,   gain0: 1.0,    detune0: -5.0,
            pitch1:   0,   gain1: 1.0,    detune1:  5.0,
            pitch2:  12,   gain2: 0.4,    detune2:  0.0,
          },
          params: {
            type: 'triangle',
            attack: 0.02,
            decay: 0.2,
            sustain: 0.8,
            release: 0.01
          }
        }
      }
    });
  }
})();
