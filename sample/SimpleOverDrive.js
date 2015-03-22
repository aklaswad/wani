(function(){

  // Wave shape builders taken from Tuna https://github.com/Dinahmoe/tuna

  var table;
  function build_table3 (amount, n_samples, ws_table) {
    amount = Math.min(amount, 0.9999);
    var k = 2 * amount / (1 - amount),
        i, x;
    for(i = 0; i < n_samples; i++) {
        x = i * 2 / n_samples - 1;
        ws_table[i] = (1 + k) * x / (1 + k * Math.abs(x));
    }
  }

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

  function tanh(n) {
      return(Math.exp(n) - Math.exp(-n)) / (Math.exp(n) + Math.exp(-n));
  }

  function build_table (amount, n_samples, ws_table) {
    var i, x, y, a = 1 - amount;
    for(i = 0; i < n_samples; i++) {
      x = i * 2 / n_samples - 1;
      y = x < 0 ? -Math.pow(Math.abs(x), a + 0.04) : Math.pow(x, a);
      ws_table[i] = tanh(y * 2);
    }
  }

  function SimpleOverDrive() {
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
    drive.connect(outlet);
  }
  SimpleOverDrive.prototype = Object.create(Waml.Module.prototype);

  SimpleOverDrive.prototype.connect = function (dest) {
    return this.outlet.connect(dest);
  };

  Waml.registerModule({
    name: 'SimpleOverDrive',
    author: 'aklaswad<aklaswad@gmail.com>',
    description: 'Sample OverDrive effector module for Waml',
    create: SimpleOverDrive,
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
