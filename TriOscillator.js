(function(){
  "use strict";

  function TriOscillator(ctx) {
    this.ctx = ctx;
    var osc1 = this.osc1 = ctx.createOscillator();
    var osc2 = this.osc2 = ctx.createOscillator();
    var osc3 = this.osc3 = ctx.createOscillator();
    this.osc1.start(0);
    this.osc2.start(0);
    this.osc3.start(0);
    var mul1 = ctx.createGain();
    var mul2 = ctx.createGain();
    var mul3 = ctx.createGain();
    mul1.gain.value = 1.0;
    mul2.gain.value = 1 + 1/3;
    mul3.gain.value = 1 + 2/3;
    mul1.connect(osc1.frequency);
    mul2.connect(osc2.frequency);
    mul3.connect(osc3.frequency);
    var setFrequencyValue = function (value) {
      osc1.frequency.value = value;
      osc2.frequency.value = value * (1 + 1/3);
      osc3.frequency.value = value * (1 + 2/3);
    };

    this.frequency = this.createAudioParamBridge(
      0,
      [ mul1,mul2,mul3 ],
      setFrequencyValue
    );

    this.detune = this.createAudioParamBridge(
      0,
      [ osc1.detune, osc2.detune, osc3.detune ]
    );

    //Set default value
    setFrequencyValue(220);

    var mixer = this.mixer = ctx.createGain();
    mixer.gain.value = 0.0;
    osc1.connect(mixer);
    osc2.connect(mixer);
    osc3.connect(mixer);
    return this;
  };
  TriOscillator.prototype = Object.create(Waml.Module.prototype);

  TriOscillator.prototype.connect = function () {
    return this.mixer.connect.apply(this.mixer,arguments);
  };

  TriOscillator.prototype.disconnect = function () {
    return this.mixer.disconnect.apply(this.mixer,arguments);
  };

  TriOscillator.prototype.noteOn = function (noteNumber) {
    this.frequency.cancelScheduledValues(0);
    this.frequency.value = Waml.midi2freq(noteNumber);
    this.mixer.gain.value = 0.3;
  };

  TriOscillator.prototype.noteOff = function (noteNumber) {
    this.mixer.gain.value = 0.0;
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
