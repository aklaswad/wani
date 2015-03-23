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
    this.initKeyboard($('.waml-kb'));
    this.rebuildUIBindings();
  };

  App.prototype.initUI = function () {
    var app = this;
    // Keyboard

    var leaveTimer;

    $(document).on('mousedown', '.waml-kb-key', function () {
      startPlay($(this));
      return false;
    });

    function setUpKBListeners ($key) {
      $('.waml-kb').on('mouseup', function () {
        endPlay();
        return false;
      });
      $('.waml-kb').on('mouseleave', function () {
        endPlay(1);
        return false;
      });
      $('.waml-kb-key').on('mouseenter', function () {
        endPlay();
        startPlay($(this));
        return false;
      });
    }

    function startPlay($key) {
      $key.addClass('waml-kb-key-playing');
      app.primarySynth.noteOn( $key.data('waml-notenumber') );
      setUpKBListeners($key);
      $(document).addClass('no-select');
    }

    function endPlay(backable) {
      finishLeaveKeyboard();
      $(document).off('mouseup', finishPlayWhenMouseUpAnywhere);
      if ( backable) {
        leaveTimer = setTimeout( function () {
          clearAllKBListeners();
        },3000);
        $(document).on('mouseup', finishPlayWhenMouseUpAnywhere);
      }
      else {
        clearAllKBListeners();
      }
      app.primarySynth.noteOff();
      $('.waml-kb-key').removeClass('waml-kb-key-playing');
      $(document).removeClass('no-select');
    }

    function clearAllKBListeners (){
        finishLeaveKeyboard();
        $('.waml-kb').off('mouseup mouseleave');
        $('.waml-kb-key').off('mouseenter');
        $('.waml-kb-key').removeClass('waml-kb-key-playing');
    }

    function finishLeaveKeyboard () {
      if ( leaveTimer ) {
        clearInterval(leaveTimer);
        $('.waml-kb-key').off('mouseenter');
        $(document).off('mouseup', finishLeaveKeyboard);
        leaveTimer = null;
      }
    }
    function finishPlayWhenMouseUpAnywhere () {
      endPlay();
    }

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
    $.each( (def.audioParams || []), function (name) {
      var $knobWrapper = $('<div />');
      $knobWrapper.addClass('knob-wrapper');
      $knobWrapper.append(
        $('<h2 />').text(name).append(
          $('<span />').text(this.description).addClass ));
      var range = Math.abs( this.range[0] - this.range[1] );
      var $knob = $('<webaudio-knob width="32" height="32" ' +
          'min="' + this.range[0] + '" ' +
          'max="' + this.range[1] + '" ' +
          'step="' + range / 256 + '" ' +
          '/>');
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

    var $params = $('<div />').addClass('params');
    $.each( (def.params || []), function (name, definition) {
      var $paramBox = $('<div />').addClass('param-wrapper');
      $('<h2 />').text(name).appendTo($paramBox);
      if ( definition.values ) {
        var $select = $('<select />').addClass('waml-param-select').data('target', name);
        $.each( definition.values, function (idx, value) {
          $select.append( $('<option />').text(value) );
        });
        $select.appendTo($paramBox);
      }
      $paramBox.appendTo($params);
    });
    $div.append($params);

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
      last.connect( module );
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
      (function (module, $moduleUI) {  // create scope
        $moduleUI.find('.waml-audioparam').each( function () {
          var $knob = $(this);
          var target = $knob.data('target');
          (function ($knob, target) {  // create scope again
            $knob.off('change').on('change', function (e) {
              module[target].value = e.target.value;
            });
          })($knob, target);
        });

        $moduleUI.find('.waml-param-select').each( function () {
          var $select = $(this);
          var target = $select.data('target');

          (function ($select, target) {  // create scope again
            $select.off('change').on('change', function (e) {
              module[target] = $select.val();
            });
          })($select, target);
        });
      })(module, $moduleUI);
    });

    $('.waml-audioparam').each(function () {
      $(this.shadowRoot).append('<style>#wac-value-tip{ opacity: 1.0 !important; transition: none !important; z-index:9999999;}</style>');
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

  App.prototype.initKeyboard = function ($elem) {
    var width = $elem.width();
    var height = $elem.height();
    var keys = 25;
    var from = 48;
    var blackNotes = {1:1,3:1,6:1,8:1,10:1};
    var isBlack = function (n) {
      return blackNotes[ n % 12 ];
    };
    var whites={},blacks={};
    var i,nn, bi=0,wi=0;
    i = 0;
    for ( nn=from;nn<keys+from;nn++) {
      if (isBlack(nn)) {
        blacks[wi] = nn
      }
      else {
        whites[wi++] = nn
      }
      i++;
    }

    var keyWidth = width / wi;
    for ( i=0;i<wi;i++) {
      if ( !blacks[i] ) continue;
      $('<div />')
        .addClass('waml-kb-bk waml-kb-key')
        .data('waml-notenumber', blacks[i])
        .css({ width: keyWidth * 0.7, left: i * keyWidth - keyWidth * 0.35 + 3 })
        .appendTo($elem);
    }
    for ( i=0;i<wi;i++) {
      $('<div />')
        .addClass('waml-kb-wk waml-kb-key')
        .data('waml-notenumber', whites[i])
        .css({ width: keyWidth - 1, left: i * keyWidth + 3 })
        .appendTo($elem);
    }
  };

  window.app = new App();
});
