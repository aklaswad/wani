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
    this.initUI();
    this.updateUI();
    this.initKeyboard();
  };

  App.prototype.initUI = function () {
    // Keyboard
    Waml.onmoduleload = function (module) {
      Waml.describe(module.name, function (message) {
        var $console = $('#js-console');
        var html = $console.html();
        $console.html( html + "<br />" + message );
      });
    };

    // jQuery actions
    var that = this;
    $('.js-add-effect').on('click', function(event){
      var name = $(this).siblings('select').val();
      that.appendModule( name );
      return false;
    });
    $(document).on('click', '.js-remove-module', function(event) {
      that.removeModule( $(this).data('id') );
      $(this).parents('.waml-module').remove();
      return false;
    });

    // The first primary synth's UI
    var $synth = this.buildModuleUI('TriOscillator', { noClose: true });
    $synth.addClass('synth');
    $('#js-circuit').append($synth);
  };

  App.prototype.buildModuleUI = function (name, opts) {
    if (!opts) opts = {};
    var def = Waml.definition(name);
    var $div = $('<div />');
    $div.data( 'id', this.effects.length );
    $div.addClass('waml-module');
    var $h1 = $('<h1 />').text( def.name );
    if ( !opts.noClose ) {
      $h1.append( $('<a>remove</a>').attr('href','#').addClass('js-remove-module') );
    }
    $div.append( $h1 );
    return $div;
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
    var lastname = 'primarySynth';
    $.each( this.effects, function(idx,name) {
      lastname = name;
      module = Waml.createModule(name);
      last.connect( module.inlet );
      last = module;
    });
    last.connect(this.masterOut);
  };

  App.prototype.appendModule = function(name) {
    var $ui = this.buildModuleUI(name);
    $('#js-circuit').append($ui);
    this.effects.push(name);
    this.updateUI();
    this.makeDSPChain();
  };

  App.prototype.removeModule = function(nth) {
    this.effects.splice(nth,1);
    this.updateUI();
    this.makeDSPChain();
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
