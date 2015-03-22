$(function () {
  function App () {
    return this.init();
  }

  App.prototype.init = function () {
    // DSP
    var ctx = this.ctx = Waml.getAudioContext();
    this.masterOut = ctx.createGain();
    this.masterOut.gain.value = 0.3;
    this.effects = [];
    this.effectInstances = [];
    this.primarySynth = Waml.createModule('TriOscillator');
    this.renderer = Waml.Web.createWaveFormRenderer('waveform', {
      waveColor: '#f84',
      backgroundColor: '#fff',
      centerLine: '#abc'
    });

    // DSP chain
    this.primarySynth.connect(this.masterOut);
    this.masterOut.connect(this.renderer);
    this.masterOut.connect(ctx.destination);
    // UIs
    Waml.onmoduleload = function (module) {
      Waml.describe(module.name, function (message) {
        var $console = $('#js-console');
        var html = $console.html();
        $console.html( html + "<br />" + message );
      });
    };

    this.updateUI();
    this.initKeyboard();
  };

  App.prototype.updateUI = function () {
    var synthesizers = Waml.listSynthesizers();
    var effects = Waml.listEffects();
    var i,len;
    var $synthlist = $('.js-list-synthesizers').empty();
    $.each(synthesizers, function (idx,name) {
      $synthlist.append( $('<option>').text(name) );
    });
    var $effectlist = $('.js-list-effects').empty();
    $.each(effects, function (idx,name) {
      $effectlist.append( $('<option>').text(name) );
    });
  };

  App.prototype.makeDSPChain = function() {
    this.primarySynth.disconnect();
    $.each( this.effectInstances, function( idx, effect ) {
      effect.disconnect();
    });
    this.effectInstances = [];
    var module, last = this.primarySynth;
    var record = '';
    $.each( this.effects, function(idx,name) {
      module = Waml.createModule(name);
      last.connect( module );
      record += last.name + '.connect(' + module.name + ")\n";
      last = module;
    });
    last.connect(this.masterOut);
    record += last.name + ".connect(masterOut)\n";
    $('#js-circuit').text(record);
  }

  App.prototype.loadModule = function(name) {
    this.effects.push(Waml.createModule(name));
    this.updateUI();
    makeDSPChain();
  };

  App.prototype.initKeyboard = function () {
    var kb = this.kb = document.getElementById('keyboard');
    var that = this;
    kb.addEventListener('change', function(e) {
      var note = e.note;
      if ( note[0] ) {
        that.primarySynth.noteOn(note[1]);
      }
      else {
        that.primarySynth.noteOff();
      }
    });
  };

  var app = new App();
});
