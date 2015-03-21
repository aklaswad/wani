// Synth
var ctx = Waml.getAudioContext();
var tri = Waml.createSynthesizer('TriOscillator');

// Effect
var trm = Waml.createEffect('SimpleTremolo');
trm.depth.value = 2.0;
trm.frequency.value = 0.0;
tri.connect(trm.inlet);

var mod = ctx.createOscillator();
mod.frequency.value = 0.1;
mod.start();
var modrange = ctx.createWaveShaper();
modrange.curve = new Float32Array([0.4,5]);
mod.connect(modrange);
modrange.connect(trm.frequency);
trm.connect(ctx.destination);


var kb = document.getElementById('keyboard');
kb.addEventListener('change', function(e) {
  var note = e.note;
  if ( note[0] ) {
    tri.noteOn(note[1]);
  }
  else {
    tri.noteOff();
  }
});

var renderer = Waml.Web.createWaveFormRenderer('waveform');
trm.connect(renderer);
