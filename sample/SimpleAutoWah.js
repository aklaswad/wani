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

  Waml.registerModule({
    name: 'SimpleAutoWah',
    author: 'aklaswad<aklaswad@gmail.com>',
    description: 'Sample AutoWah effector module for Waml',
    create: SimpleAutoWah,
    isEffect: true,
    inlet: "inlet",
  });
})();
