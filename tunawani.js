var tuna = new Tuna(Wani.getAudioContext());
for ( var modulename in tuna ) {
  if ( !modulename ) continue;
  if ( modulename === 'toString' ) continue;
  if ( modulename === 'LFO' ) continue;
  if ( modulename === 'EnvelopeFollower' ) continue;
  (function (modulename) {
    var tuna_constructor = tuna[modulename];
    var defaults = tuna[modulename].prototype.defaults;
    var obj = {
      name: 'tuna.' + modulename,
      type: 'effect',
      create: function () {
        var mod = new tuna_constructor({});
        return mod;
      },
      audioParams: {},
      params: {},
      presets: {
        default: { audioParams: {}, params: {} }
      }
    };
    var offset = {};
    var types = {};
    for ( var pname in defaults ) {
      var def = defaults[pname];
      if ( def.type === 'boolean' ) {
        obj.params[pname] = {
          values: [0,1]
        };
        obj.presets.default.params[pname] = def.value ? 1 : 0;
      }
      else if ( def.type === 'int' ) {
        var values = [];
        for ( var v = def.min;v<=def.max;v++ ) {
          values.push(v);
        }
        obj.params[pname] = {
          values: values
        };
        obj.presets.default.params[pname] = def.value;
      }
      else if ( def.type === 'float' && def.automatable ) {
        obj.audioParams[pname] = {
          range: [def.min, def.max],
        };
        obj.presets.default.audioParams[pname] = def.value;
      }
      else if ( def.type === 'float' && !def.automatable ) {
        obj.params[pname] = {
          range: [def.min, def.max],
          value: def.value
        };
        obj.presets.default.params[pname] = def.value;
      }
    }
    Wani.registerModule(obj);
  })(modulename);
}
