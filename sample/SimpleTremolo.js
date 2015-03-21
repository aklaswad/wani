(function(){
  "use strict";

  function SimpleTremolo(ctx) {
    this.ctx = ctx;
    var inlet = this.inlet = ctx.createGain();
    var outlet = this.outlet = ctx.createGain();


    var half = ctx.createGain();
    half.gain.value = 0.5;
    var osc = ctx.createOscillator();
    osc.frequency.value = 20;
    osc.connect(half);
    var oscGain = ctx.createGain();
    oscGain.gain.value = 0.0;
    half.connect(oscGain);


    var offset = Waml.DCOffset(0.5);
    var offsetBase = Waml.DCOffset(1);
    var offsetHalf = ctx.createGain();
    offsetHalf.gain.value = 0.5;
    offset.connect(offsetHalf);
    var neg = ctx.createGain();
    neg.gain.value = -1;
    offsetHalf.connect(neg);
    offset.connect(oscGain.gain);
    this.neg = neg;
    this.offset = offset;
    outlet.gain.value = 1.0;
    var shift = ctx.createGain();
    offsetBase.connect(shift);
    neg.connect(shift);
    oscGain.connect(shift.gain);
    inlet.connect(outlet);
    shift.connect(outlet.gain);

    this.frequency = osc.frequency;
    this.depth = offset.gain;
    osc.start();
    return this;
  };
  SimpleTremolo.prototype = Object.create(Waml.Effector.prototype);

  SimpleTremolo.prototype.connect = function (dest) {
    return this.outlet.connect(dest);
  };

  Waml.registerEffector({
    name: 'SimpleTremolo',
    author: 'aklaswad<aklaswad@gmail.com>',
    description: 'Sample Tremolo effector module for Waml',
    create: SimpleTremolo,
    audioParams: {
      frequency: {
        description: 'frequency (hz)',
        range: [0, 20000],
      },
      depth: {
        description: 'depth',
        range: [0, 1],
      },
    },
    params: {
      wavetype: {
        description: 'mudulator wave shape',
        values: ["sine", "sawtooth", "square", "triangle"]
      }
    },
    // Specify the inlet as string. "inlet" should be default.
    // XXX: should allow multiple inlet?
    inlet: "inlet",
  });
})();
