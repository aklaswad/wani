$(function () {
  function App () {
    return this.init();
  }

  App.prototype.init = function () {
    // DSP
    var ctx = this.ctx = Wani.getAudioContext();
    this.masterOut = ctx.createGain();
    this.masterOut.gain.value = 0.3;
    this.effects = [];
    this.effectInstances = [];
    this.primarySynth = Wani.createModule('TriOscillator');
    this.renderer = Wani.Web.createWaveFormRenderer('waveform', {
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
    this.initKeyboard($('.wani-kb'));
  };

  App.prototype.initUI = function () {
    var app = this;


    // --------------------------------------------- Keyboard

    var leaveTimer;

    $(document).on('mousedown', '.wani-kb-key', function () {
      startPlay($(this));
      return false;
    });

    function setUpKBListeners ($key) {
      $('.wani-kb').on('mouseup', function () {
        endPlay();
        return false;
      });
      $('.wani-kb').on('mouseleave', function () {
        endPlay(1);
        return false;
      });
      $('.wani-kb-key').on('mouseenter', function () {
        endPlay();
        startPlay($(this));
        return false;
      });
    }

    function startPlay($key) {
      $key.addClass('wani-kb-key-playing');
      app.primarySynth.noteOn( $key.data('wani-notenumber') );
      setUpKBListeners($key);
      $(document).addClass('wani-no-select');
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
      $('.wani-kb-key').removeClass('wani-kb-key-playing');
      $(document).removeClass('wani-no-select');
    }

    function clearAllKBListeners (){
        finishLeaveKeyboard();
        $('.wani-kb').off('mouseup mouseleave');
        $('.wani-kb-key').off('mouseenter');
        $('.wani-kb-key').removeClass('wani-kb-key-playing');
    }

    function finishLeaveKeyboard () {
      if ( leaveTimer ) {
        clearInterval(leaveTimer);
        $('.wani-kb-key').off('mouseenter');
        $(document).off('mouseup', finishLeaveKeyboard);
        leaveTimer = null;
      }
    }

    function finishPlayWhenMouseUpAnywhere () {
      endPlay();
    }


    // --------------------------------------------- Knob

    $.fn.knobValue = function (value) {
      $(this).each( function () {
        var $box = $(this);
        var $knob = $box.find('.wani-knob-knob');
        var opts = $box.data('wani-knob-data');
        if (opts.isSelect && 'string' === typeof value ) {
          value = opts.values.indexOf(value);
        }
        var step = opts.step;
        value = Math.round(value * 1/step) * step;
        if ( opts.max < value ) value = opts.max;
        if ( value < opts.min ) value = opts.min;
        var range = Math.abs(opts.max - opts.min);
        var rate = Math.abs(value - opts.min) / Math.abs( opts.max - opts.min );
        var rotate = 300 * ( rate - 0.5 );
        $knob.css({ transform: 'rotate(' + rotate + 'deg)' });

        if ( opts.isSelect ) {
          opts._value = value;
          value = opts.values[value];
        }
        if ( value !== opts.value ) {
          $(this).trigger('change', value, opts);
        }
        opts.value = value;
        var valueStr = opts.isSelect ? value : value.toFixed(6).substr(0,7);
        $box.find('.wani-knob-activevalue').text(valueStr);
        $box.find('.wani-knob-value').text(valueStr);
      });
      return this;
    };

    $(document).on('mousedown', '.wani-knob-knob', function (evt) {
      $('body').addClass('wani-no-select wani-grabbing');
      var $knob = $(this);
      var $box = $knob.parents('.wani-knob-box');
      $knob.addClass('wani-knob-active');
      var opts = $box.data('wani-knob-data');
      var lastPos = {x: evt.pageX, y: evt.pageY };
      var lastValue = opts.isSelect ? opts._value : opts.value;
      var $activeValue = $knob.siblings('.wani-knob-activevalue').show();
      var $backsheet = $knob.siblings('.wani-knob-backsheet').show();
      var $currentValue = $knob.siblings('.wani-knob-value').hide();
      var listener = function (evt) {
        var pos = { x: evt.pageX, y: evt.pageY };
        var d = {x: pos.x - lastPos.x, y: pos.y - lastPos.y};

        // Hmm... what is the good knob?
        // var dist = Math.sqrt( Math.pow(d.x, 2) + Math.pow(d.y,2));
        // var radi = Math.atan(d.y / d.x);
        // for now, just use deltaY :p

        // TODO: some calc about step here
        var value = lastValue - d.y * opts.multiplier; // y on diplay is negative
        $box.knobValue(value);
        lastValue = value;
        lastPos = pos;
        return false;
      };
      $(document).on('mousemove', listener);
      $(document).on('mouseup', function () {
        $('body').removeClass('wani-no-select wani-grabbing');
        $knob.removeClass('wani-knob-active');
        $activeValue.hide();
        $backsheet.hide();
        $currentValue.show();
        $(document).off('mousemove', listener);
        return true;
      });
      return false;
    });

    // ----------------------------------- jQuery actions
    var that = this;
    $('.js-add-effect').on('click', function(event){
      var name = $('.js-list-effects').val();
      that.appendModule( name );
      return false;
    });

    $('.js-load-module').click( function () {
      Wani.Web.loadScriptFromURL(
        $('.js-module-url').val(),
        function () {
          that.updateModuleList();
        }
      );
    });

    $(document).on('change', '.preset', function (evt) {
      var $module = $(this).parents('.wani-module');
      var idx = $module.index() - 1;
      var def = idx === -1 ? Wani.profile('TriOscillator') : app.effects[idx];
      var presetName = $(this).val();
      var preset = def.presets[presetName];
      if ( preset.audioParams ) {
        for ( var p in preset.audioParams ) {
          $module.find('.wani-knob-ap-' + p)
            .knobValue( preset.audioParams[p] );
        }
      }
      if ( preset.params ) {
        for ( var param in preset.params ) {
          $module.find('.wani-knob-p-' + param)
            .knobValue( preset.params[param] );
        }
      }
    });

    $(document).on('click', '.js-remove-module', function(event) {
      var $module = $(this).parents('.wani-module');
      // minus one because primarySynth is in DOM but not in effects list
      that.removeModule( $module.index() - 1 );
      $module.remove();
      return false;
    });

    $(document).on('click', '.js-toggle-knobs', function(event) {
      $(this).parents('.wani-module').find('.knobs').toggle();
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
    var def = Wani.profile(name);
    var $div = $('<div />');
    $div.addClass('wani-module');
    var $h1 = $('<h1 />').addClass('wani-module-name').text( def.name );
    if ( !opts.noClose ) {
      $('<a>x</a>').attr('href','#').addClass('js-remove-module').appendTo($h1);
    }
    $('<a>+-</a>').attr('href','#').addClass('js-toggle-knobs').appendTo($h1);

    if ( def.presets ) {
      var $presets = $('<select />').addClass('preset').appendTo($h1);
      for ( name in def.presets ) {
        var params = def.presets[name];
        var $preset = $('<option />').text(name).data('preset-params', params).appendTo($presets);
      }
    }
    $div.append( $h1 );
    var $knobs = $('<div />').addClass('knobs');
    $.each( (def.audioParams || []), function (pname,param) {
      if ( param.lfoOnly ) return true;
      var range = Math.abs( this.range[0] - this.range[1] );
      var $knob = app.initKnob({
        title: param.shortName || pname,
        width: 32,
        height: 32,
        range: range,
        min: this.range[0],
        max: this.range[1],
        description: this.description,
        value: instance[pname].value,
        isAudio: true,
        step: param.step || range / 512
      });
      $knob.on('change', function(evt, value) {
        instance[pname].value = value;
      });
      $knob.addClass('wani-audioparam');
      $knobs.append($knob);
    });
    $.each( (def.params || []), function (pname,param) {
      var prop = {
        title: pname,
        width: 32,
        height: 32,
        description: this.description,
        value: param.value || instance[pname],
        isAudio: false
      };
      if (this.values) {
        prop.isSelect = true;
        prop.values = this.values;
        prop.step = 1;
      }
      else {
        prop.range = Math.abs(this.range[1] - this.range[0]);
        prop.min = this.range[0];
        prop.max = this.range[1];
        prop.step = param.step || prop.range / 512;
      }
      var $knob = app.initKnob(prop);

      $knob.on('change', function(evt, value) {
        instance[pname] = value;
      });
      $knob.addClass('wani-param');
      $knobs.append($knob);
    });
    $div.append($knobs);

    return $div;
  };

  App.prototype.updateModuleList = function () {
    var synthesizers = Wani.list('synth');
    var effects = Wani.list('effect');
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
      module = Wani.createModule(name);
      last.connect( module );
      last = module;
      that.effectInstances.push(module);
    });
    last.connect(this.masterOut);
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

    var parent = this.effectInstances[nth-1] || this.primarySynth;
    var self = this.effectInstances[nth];
    var child = this.effectInstances[nth+1] || this.masterOut;
    parent.disconnect();
    self.disconnect();
    parent.connect(child);
    this.effectInstances.splice(nth,1);
  };

  App.prototype.initKnob = function (opts) {
    opts = $.extend({ min:0, max:1,width:32,height:32,sense:360, margin: 16},opts);
    var canvasMargin = 48;
    var values, range;
    if ( opts.isSelect ) {
      values = opts.values;
      opts.min = 0;
      opts.max = opts.values.length-1;
      range = [0, opts.values.length-1];
      opts.multiplier = 0.05;
      opts._value = 0;
    }
    else {
      values = [opts.min, opts.max];
      range = Math.abs( opts.max - opts.min );
      opts.multiplier = range / opts.sense;
    }
    var midfix = opts.isSelect ? 'p-' : 'ap-';
    var $box = $('<div />')
      .addClass('wani-knob-box wani-knob wani-knob-' + midfix + opts.title)
      .css({width: opts.width + opts.margin*2, height: opts.height + opts.margin*2, position: 'relative'});
    $('<h2 />').css({
        textAlign: 'center',
        zIndex: 3
      })
      .addClass('wani-knob-title')
      .append( $('<span />').text(opts.title) )
      .appendTo($box);


    // BackSheet
    var bs = {
      width: (opts.width + opts.margin * 2)  + canvasMargin * 2,
      height: (opts.width + opts.margin * 2) + canvasMargin * 2,
      tipWidth: 52,
      tipHeight: 18
    };
    bs.radius = bs.width/2 - bs.tipWidth / 2;
    var $canvas = $('<canvas />')
      .addClass('wani-knob-backsheet')
      .attr('width', bs.width)
      .attr('height',bs.height)
      .css({
        position: 'absolute',
        width: bs.width,
        height: bs.height,
        left: -1 * canvasMargin,
        top: -1 * canvasMargin,
        display: 'none'
      })
      .appendTo($box);
    var ctx = $canvas.get(0).getContext('2d');
    var len = values.length;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    var baseTheta = Math.PI * 240/360 * 2;
    for (var i=0; i<len;i++) {
      var value = values[i];
      var x = bs.width/2 + bs.radius * Math.cos(baseTheta - 2 * i/(len-1) * Math.PI * 300/360);
      var y = bs.height/2 - bs.radius * Math.sin(baseTheta - 2 * i/(len-1) * Math.PI * 300/360);

      ctx.strokeStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(x,y);
      ctx.lineTo(bs.width/2,bs.height/2);
      ctx.stroke();
      ctx.fillStyle = '#789';
      ctx.fillRect(x-bs.tipWidth/2,y-bs.tipHeight/2,bs.tipWidth,bs.tipHeight);
      ctx.strokeRect(x-bs.tipWidth/2,y-bs.tipHeight/2,bs.tipWidth,bs.tipHeight);
      ctx.fillStyle = '#fff';
      ctx.font = 'normal lighter 14px "Courier New", arial';
      ctx.fillText(value, x,y, bs.tipWidth - 2);
    }
    var $activeValue = $('<div />')
      .addClass('wani-knob-activevalue')
      .css({
        position: 'absolute',
        top: opts.height + opts.margin + canvasMargin + 3,
        width: opts.width + 32
      })
      .appendTo($box);
    var $currentValue = $('<div />')
      .addClass('wani-knob-value')
      .css({
        position: 'absolute',
        top: opts.height + 16,
        width: opts.width + 32
      })
      .appendTo($box);
    var $knob = $('<div />')
      .addClass('wani-knob-knob')
      .css({
        position: 'absolute',
        top: 16,
        left: 16
      })
      .appendTo($box);
    var $point = $('<div />')
      .addClass('wani-knob-point')
      .css({ top: 2, left: opts.width/2 - 3})
      .appendTo($knob);
    $box.data('wani-knob-data', opts);
    $box.knobValue(opts.isSelect ? opts._value : opts.value);
    return $box;
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
        .addClass('wani-kb-bk wani-kb-key')
        .data('wani-notenumber', blacks[i])
        .css({ width: keyWidth * 0.7, left: i * keyWidth - keyWidth * 0.35 })
        .appendTo($elem);
    }
    for ( i=0;i<wi;i++) {
      $('<div />')
        .addClass('wani-kb-wk wani-kb-key')
        .data('wani-notenumber', whites[i])
        .css({ width: keyWidth, height: height - 2, left: i * keyWidth })
        .appendTo($elem);
    }
  };

  var app = window.app = new App();
});
