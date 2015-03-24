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


    // --------------------------------------------- Keyboard

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
      $(document).addClass('waml-no-select');
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
      $(document).removeClass('waml-no-select');
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


    // --------------------------------------------- Knob

    $(document).on('mousedown', '.waml-knob', function (evt) {
      $('body').addClass('waml-no-select waml-grabbing');
      var $knob = $(this);
      $knob.addClass('waml-knob-active');
      var opts = $knob.data('waml-knob-data');
      var lastPos = {x: evt.pageX, y: evt.pageY };
      var lastValue = $knob.data('waml-value') || 0.0;
      var listener = function (evt) {
        var pos = { x: evt.pageX, y: evt.pageY };
        var d = {x: pos.x - lastPos.x, y: pos.y - lastPos.y};

        // Hmm... what is the good knob?
        // var dist = Math.sqrt( Math.pow(d.x, 2) + Math.pow(d.y,2));
        // var radi = Math.atan(d.y / d.x);
        // for now, just use deltaY :p

        // TODO: some calc about step here
        var value = lastValue - d.y * opts.multiplier; // y on diplay is negative
        if ( opts.max < value ) value = opts.max;
        if ( value < opts.min ) value = opts.min;
        if ( value === opts.value ) return false;
        $knob.trigger('change', value);
        $knob.data('waml-value',value);
        lastValue = value;
        lastPos = pos;
        var range = Math.abs(opts.max - opts.min);
        var rate = Math.abs(value - opts.min) / Math.abs( opts.max - opts.min );
        var rotate = 300 * ( rate - 0.5 );
        $knob.css({ transform: 'rotate(' + rotate + 'deg)' });
        return false;
      };
      $(document).on('mousemove', listener);
      $(document).on('mouseup', function () {
        $('body').removeClass('waml-no-select waml-grabbing');
        $knob.removeClass('waml-knob-active');
        return $(document).off('mousemove', listener);
      });
      return false;
    });

    // ----------------------------------- jQuery actions
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
    var $synth = this.buildModuleUI('TriOscillator', { noClose: true }, app.primarySynth);
    $synth.addClass('synth');
    $('#js-circuit').append($synth);

  };

  App.prototype.buildModuleUI = function (name, opts, instance) {
    var app = this;
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
    $.each( (def.audioParams || []), function (name,param) {
      var range = Math.abs( this.range[0] - this.range[1] );
      var $knobWrapper = $('<div />').addClass('knob-wrapper');
      $('<h2 />').text(name).appendTo($knobWrapper);
      var $knob = app.initKnob({
        width: 32,
        height: 32,
        min: this.range[0],
        max: this.range[1],
        name: this.name,
        description: this.description
      });
      $knob.on('change', function(evt, value) {
        instance[name].value = value;
      });
      $knob.addClass('waml-audioparam');
      $knobWrapper.append($knob);
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
      last.connect( module );
      last = module;
      that.effectInstances.push(module);
    });
    last.connect(this.masterOut);
    this.rebuildUIBindings();
  };

  App.prototype.appendModule = function(name) {
    this.effects.push(name);
    this.updateModuleList();
    this.makeDSPChain();
    var $ui = this.buildModuleUI(name,{},this.effectInstances[this.effects.length-1]);
    $('#js-circuit').append($ui);
  };

  App.prototype.removeModule = function(nth) {
    this.effects.splice(nth,1);
    this.updateModuleList();
    this.makeDSPChain();
  };

  App.prototype.initKnob = function (opts) {
    opts = $.extend({ min:0, max:1,width:32,height:32,step:1,sense:360},opts);
    var range = Math.abs( opts.max - opts.min );
    opts.multiplier = range / opts.sense;
    var $knob = $('<div />')
      .addClass('waml-knob')
      .data('waml-knob-data', opts);
    var $point = $('<div />')
      .addClass('waml-knob-point')
      .css({ top: 2, left: opts.width/2 - 3})
      .appendTo($knob);
    return $knob;
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
        blacks[wi] = nn;
      }
      else {
        whites[wi++] = nn;
      }
      i++;
    }

    var keyWidth = width / wi;
    for ( i=0;i<wi;i++) {
      if ( !blacks[i] ) continue;
      $('<div />')
        .addClass('waml-kb-bk waml-kb-key')
        .data('waml-notenumber', blacks[i])
        .css({ width: keyWidth * 0.7, left: i * keyWidth - keyWidth * 0.35 })
        .appendTo($elem);
    }
    for ( i=0;i<wi;i++) {
      $('<div />')
        .addClass('waml-kb-wk waml-kb-key')
        .data('waml-notenumber', whites[i])
        .css({ width: keyWidth, height: height - 2, left: i * keyWidth })
        .appendTo($elem);
    }
  };

  var app = window.app = new App();
});
