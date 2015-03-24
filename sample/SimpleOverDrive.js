(function(){

  // Wave shape builders taken from Tuna https://github.com/Dinahmoe/tuna

  var table;
  function build_table (amount, n_samples, ws_table) { // fixed curve, amount doesn't do anything, the distortion is just from the drive
    var i, x;
    for(i = 0; i < n_samples; i++) {
      x = i * 2 / n_samples - 1;
      if(x < -0.08905) {
        ws_table[i] = (-3 / 4) * (1 - (Math.pow((1 - (Math.abs(x) - 0.032857)), 12)) + (1 / 3) * (Math.abs(x) - 0.032847)) + 0.01;
      } else if(x >= -0.08905 && x < 0.320018) {
        ws_table[i] = (-6.153 * (x * x)) + 3.9375 * x;
      } else {
        ws_table[i] = 0.630035;
      }
    }
  }

  function SimpleOverDrive(ctx) {
    this.ctx = ctx;
    var inlet = this.inlet = ctx.createGain();
    inlet.gain.value = 0.6;
    var outlet = this.outlet = ctx.createGain();
    if ( !table ) {
      table = new Float32Array(1024);
      build_table(0.8,1024,table);
    }
    var drive = ctx.createWaveShaper();
    drive.curve = table;
    inlet.connect(drive);
    this.drive = inlet.gain;
    drive.connect(outlet);
  }
  SimpleOverDrive.prototype = Object.create(Wani.Module.prototype);

  Wani.registerModule({
    name: 'SimpleOverDrive',
    author: 'aklaswad<aklaswad@gmail.com>',
    description: 'Sample OverDrive effector module for Wani',
    create: SimpleOverDrive,
    isEffect: true,
    audioParams: {
      drive: {
        description: 'Amplifier!!',
        range: [0.5, 1.5],
      },
    },
    inlet: "inlet",
  });
})();
