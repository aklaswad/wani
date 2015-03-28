(function(){
  "use strict";

  function SimpleTremolo(ctx) {
    this.ctx = ctx;
    var lfo = ctx.createOscillator();
    lfo.frequency.value = 0;
    var that = this;
    var inlet = this.inlet = ctx.createGain();
    var outlet = this.outlet = ctx.createGain();
    outlet.gain.value = 0;

/*
audioParam('speed',5);
audioParam('depth',0.6);

lfo.frequency = :speed;
outlet = inlet;
outlet.gain = lfo * 0.5 * :depth + (1 - :depth )

*/

var io = (function (ctx) {
  var io = {};
  var nodes = [];
  nodes[1] = io['speed'] = Wani.createAudioParam(ctx,5.0);
  nodes[2] = io['depth'] = Wani.createAudioParam(ctx,0.6);
  nodes[3] = lfo.frequency; // Existing node
  nodes[4] = outlet; // Existing node
  nodes[5] = inlet; // Existing node
  nodes[6] = outlet.gain; // Existing node
  nodes[7] = ctx.createGain();  // multi(7)
  nodes[8] = nodes[7].gain;
  nodes[8].value = 0.0;
  nodes[9] = lfo; // Existing node
  nodes[10] = ctx.createGain();  // multi(10)
  nodes[11] = nodes[10].gain;
  nodes[11].value = 0.0;
  nodes[12] = Wani.createDCOffset(ctx,0.5); // number
  nodes[13] = ctx.createGain();
  nodes[13].gain.value = -1
  nodes[14] = Wani.createDCOffset(ctx,1.0); // number

  nodes[1].connect(nodes[3]);
  nodes[5].connect(nodes[4]);
  nodes[9].connect(nodes[7]);
  nodes[12].connect(nodes[10]);
  nodes[2].connect(nodes[11]);
  nodes[10].connect(nodes[8]); // to output from multi(10)
  nodes[7].connect(nodes[6]); // to output from multi(7)
  nodes[13].connect(nodes[6]); // negativer for minus()
  nodes[14].connect(nodes[6]);
  nodes[2].connect(nodes[13]);// done
return io;
})(ctx);


    this.speed = io.speed;
    this.depth = io.depth;
    lfo.start();
    return this;
  }
  SimpleTremolo.prototype = Object.create(Wani.Module.prototype);

  Wani.registerModule({
    name: 'SimpleTremolo',
    author: 'aklaswad<aklaswad@gmail.com>',
    description: 'Sample Tremolo effector module for Wani',
    type: 'effect',
    create: SimpleTremolo,
    audioParams: {
      speed: {
        description: 'frequency (hz)',
        range: [0, 20]
      },
      depth: {
        description: 'depth',
        range: [0, 3]
      },
    },
    // Specify the inlet as string. "inlet" should be default.
    // XXX: should allow multiple inlet?
    inlet: "inlet",
  });
})();
