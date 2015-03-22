(function(){
  "use strict";

  function SimpleTremolo(ctx) {
    this.ctx = ctx;
    var inlet = this.inlet = ctx.createGain();
    var outlet = this.outlet = ctx.createGain();


    var half = ctx.createGain();
    half.gain.value = 0.5;
    var osc = ctx.createOscillator();
    osc.frequency.value = 5;
    osc.connect(half);
    var oscGain = ctx.createGain();
    oscGain.gain.value = 0.0;
    half.connect(oscGain);

    var offset = Waml.createDCOffset(0);
    var offsetBase = Waml.createDCOffset(1);
    var offsetHalf = ctx.createGain();
    offsetHalf.gain.value = 0.5;
    offset.connect(offsetHalf);
    offset.connect(oscGain.gain);
    var neg = ctx.createGain();
    neg.gain.value = -1;
    offsetHalf.connect(neg);
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
  SimpleTremolo.prototype = Object.create(Waml.Module.prototype);

  SimpleTremolo.prototype.connect = function (dest) {
    return this.outlet.connect(dest);
  };

  SimpleTremolo.prototype.disconnect = function () {
    return this.outlet.disconnect.apply(this.outlet,arguments);
  };


  Waml.registerModule({
    name: 'SimpleTremolo',
    author: 'aklaswad<aklaswad@gmail.com>',
    description: 'Sample Tremolo effector module for Waml',
    isEffect: true,
    create: SimpleTremolo,
    audioParams: {
      frequency: {
        description: 'frequency (hz)',
        range: [0, 20],
      },
      depth: {
        description: 'depth',
        range: [0, 10],
      },
    },
    // Specify the inlet as string. "inlet" should be default.
    // XXX: should allow multiple inlet?
    inlet: "inlet",
  });
})();
