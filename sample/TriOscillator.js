(function(){
  "use strict";

  function TriOscillator(ctx) {
    this.ctx = ctx;
    var osc1 = this.osc1 = ctx.createOscillator();
    var osc2 = this.osc2 = ctx.createOscillator();
    var osc3 = this.osc3 = ctx.createOscillator();
    var mul1 = ctx.createGain();
    var mul2 = ctx.createGain();
    var mul3 = ctx.createGain();
    mul1.gain.value = 1.0;
    mul2.gain.value = 1.5;
    mul3.gain.value = 1 + 1/3;
    mul1.connect(osc1.frequency);
    mul2.connect(osc2.frequency);
    mul3.connect(osc3.frequency);
    this.frequency = this.createAudioParamBridge(
      440,
      [ mul1,mul2,mul3],
      function (newValue) {
        osc1.frequency.value = newValue;
        osc2.frequency.value = newValue * 1.5;
        osc3.frequency.value = newValue * 1 + 1/3;
      });

    var mixer = this.mixer = ctx.createGain();
    osc1.connect(mixer);
    osc2.connect(mixer);
    osc3.connect(mixer);
    this.connect = function (node) {
      return mixer.connect(node);
    };
    return this;
  };
  TriOscillator.prototype = Object.create(Waml.Oscillator.prototype);

  TriOscillator.prototype.noteOn = function (noteNumber) {
    this.osc1.start(0);
    this.osc2.start(0);
    this.osc3.start(0);
    this.mixer.gain.value = 0.3;
  };

  TriOscillator.prototype.noteOff = function (noteNumber) {
    this.mixer.gain.value = 0.0;
  };

  Waml.registerModule({
    name: 'TriOscillator',
    author: 'aklaswad<aklaswad@gmail.com>',
    description: 'TriOscillator',
    create: TriOscillator,
    audioParams: {
      frequency: {
        description: 'frequency (hz)',
        range: [0, 20000],
      },
      detune: {
        description: 'detune (cent)',
        range: [ -1, 1]
      }
    },
    params: {
      type: {
        values: ["sine", "sawtooth", "square", "triangle" ],
        description: "Wave shape type.",
      }
    }
  });
})();
