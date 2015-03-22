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
    this.updateModuleList();
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

    $('.js-load-module').click( function () {
      Waml.Web.loadScriptFromURL(
        $(this).siblings('.js-module-url').val(),
        function () {
          that.updateModuleList();
        }
      );
    });

    $(document).on('click', '.js-remove-module', function(event) {
      var $module = $(this).parents('.waml-module');
      // minus one because primarySynth is in DOM but not in effects list
      that.removeModule( $module.index() - 1 );
      $module.remove();
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
    $div.addClass('waml-module');
    var $h1 = $('<h1 />').text( def.name );
    if ( !opts.noClose ) {
      $('<a>remove</a>').attr('href','#').addClass('js-remove-module').appendTo($h1);
    }
    $div.append( $h1 );
    var $knobs = $('<div />').addClass('knobs');
    $.each( def.audioParams, function (name) {
      var $knobWrapper = $('<div />');
      $knobWrapper.addClass('knob-wrapper');
      $knobWrapper.append(
        $('<h2 />').text(name).addClass('tooltipo').append(
          $('<span />').text(this.description).addClass ));
      var range = Math.abs( this.range[0] - this.range[1] );
      var $knob = $('<webaudio-knob width="32" height="32" '
        + 'min="' + this.range[0] + '" '
        + 'max="' + this.range[1] + '" '
        + 'step="' + range / 256 + '" '
        + '/>');
      $knob.addClass('knob');
      $knob.data('target', name);
      $knob.addClass('waml-audioparam');

      // FIXME: css help is needed for centering knob ;p
      $knobWrapperInner = $('<div />').addClass('knob-wrapper-inner');
      $knobWrapperInner.append($knob);
      $knobWrapper.append( $knobWrapperInner );
      $knobs.append($knobWrapper);
    });
    $div.append($knobs);
    return $div;
  };

  App.prototype.updateModuleList = function () {
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
    var module, last = this.primarySynth, that = this;
    $.each( this.effects, function(idx,name) {
      module = Waml.createModule(name);
      last.connect( module.inlet );
      last = module;
      that.effectInstances.push(module);
    });
    last.connect(this.masterOut);
    this.rebuildUIBindings();
  };

  App.prototype.rebuildUIBindings = function () {
    var app = this;
    $('.waml-module').each( function (idx) {
      var module = idx ? app.effectInstances[idx-1] : app.primarySynth;
      var $moduleUI = $(this);
      (function (module) {  // create scope
        $moduleUI.find('.waml-audioparam').each( function () {
          var $knob = $(this);
          var target = $knob.data('target');
          (function ($knob, target) {  // create scope again
            $knob.off('change').on('change', function (e) {
              module[target].value = e.target.value;
            });
          })($knob, target);
        });
      })(module);
    });
  };

  App.prototype.appendModule = function(name) {
    var $ui = this.buildModuleUI(name);
    $('#js-circuit').append($ui);
    this.effects.push(name);
    this.updateModuleList();
    this.makeDSPChain();
  };

  App.prototype.removeModule = function(nth) {
    this.effects.splice(nth,1);
    this.updateModuleList();
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
