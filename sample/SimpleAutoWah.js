(function(){
  "use strict";

  function SimpleAutoWah(ctx) {
    this.ctx = ctx;
    var inlet = this.inlet = ctx.createGain();
    var outlet = this.outlet = ctx.createGain();
    var filter = ctx.createBiquadFilter();
    filter.type = "peaking";
    var filterBp = ctx.createBiquadFilter();
    var osc = ctx.createOscillator();
    osc.frequency.value = 1;
    osc.type = 'triangle';

    filterBp.type = "bandpass";
    filterBp.frequency.value = 100;
    filterBp.Q.value = 1;


    var oscAmp = ctx.createGain();
    oscAmp.gain.value = 200;
    osc.connect(oscAmp);
    oscAmp.connect(filter.frequency);
    filter.frequency.value = 300;
    filter.gain.value = 20;
    filter.Q.value = 20;
    osc.start();
    inlet.connect(filterBp);
    filterBp.connect(filter);
    filter.connect(outlet);
    return this;
  };
  SimpleAutoWah.prototype = Object.create(Waml.Module.prototype);

  SimpleAutoWah.prototype.connect = function (dest) {
    return this.outlet.connect(dest);
  };

  SimpleAutoWah.prototype.disconnect = function () {
    return this.outlet.disconnect.apply(this.outlet,arguments);
  };


  Waml.registerModule({
    name: 'SimpleAutoWah',
    author: 'aklaswad<aklaswad@gmail.com>',
    description: 'Sample AutoWah effector module for Waml',
    create: SimpleAutoWah,
    isEffect: true,
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
    inlet: "inlet",
  });
})();
