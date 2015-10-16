(function () {

  function createWaveFormRenderer(canvas, opts) {
    var ctx = Wani.getAudioContext();
    var proc = ctx.createScriptProcessor(2048,1,1);
    var cvs = document.getElementById(canvas);
    var w = cvs.width;
    var h = cvs.height;
    var cctx = cvs.getContext('2d');
    var multiplier = opts.mutiplier || 1.0;
    cctx.fillStyle = opts.backgroundColor || '#fff';
    cctx.lineWidth = '1px';
    var frames = 0;
    var last = {max: 0, maxframe: 0 };
    proc.onaudioprocess = function(evt) {
      var i,channel = evt.inputBuffer.getChannelData(0);
      cctx.clearRect(0,0,w,h);
      cctx.fillRect(0,0,w,h);

      if (opts.centerLine) {
        cctx.strokeStyle = opts.centerLine;
        cctx.beginPath();
        cctx.moveTo(0,h/2);
        cctx.lineTo(w-1,h/2);
        cctx.stroke();
      }

      cctx.strokeStyle = opts.waveColor || '#000';
      cctx.moveTo(0,h/2);
      cctx.beginPath();
      var max = 0;
      for(i=0;i<w;i++){
        var vv = [];
        var idx = i * 4;
        vv[0] = multiplier * channel[idx];
        vv[1] = multiplier * channel[idx+1];
        vv[2] = multiplier * channel[idx+2];
        vv[3] = multiplier * channel[idx+3];
        var j,v = 0;
        var minv=1,maxv=-1,maxabsv = 0;
        for(j=1;j<4;j++) {
          if ( maxv < vv[j] ) {
            maxv=vv[j];
          }
          if ( vv[j] < minv ) {
            minv=vv[j];
          }
          if ( maxabsv < Math.abs(vv[j]) ) {
            maxabsv=Math.abs(vv[j]);
          }
        }
        cctx.lineTo(i,h/2 + -h/2 * minv);
        cctx.lineTo(i,h/2 + -h/2 * maxv);
        max = maxabsv;
      }
      if ( last.max < max || last.maxframe < frames - 8 ) {
        last.max = max;
        last.maxframe = frames;
      }
      cctx.stroke();
      frames++;
    };
    var mute = ctx.createGain();
    mute.gain.value = 0.0;
    mute.connect(ctx.destination);
    proc.connect(mute);
    return proc;
  }

  // hmm. I don't have idea to know register method was invoked from which
  // script, when it loaded asynchronously. for now just load synchronous.
  var loading;
  var loadQueue = [];
  function loadScriptFromURL(url,cb) {
    if ( loading ) {
      loadQueue.push([url,cb]);
      return;
    }
    var onmoduleregister = Wani.onmoduleregister;
    wani.onmoduleregister = function (module) {
      module.fromURL = url;
      onmoduleregister(module);
    };
    var script = document.createElement('script');
    script.src = loading = url;
    var that = this;
    script.onload = function (e) {
      if (cb) cb(e);
      Wani.onmoduleregister = onmoduleregister;
      loading = null;
      if (loadQueue.length) {
        var next = loadQueue.shift();
        loadScriptFromURL.apply(that, next);
      }
    }
    document.body.appendChild(script);
  }

  Wani.Web = {
    createWaveFormRenderer: createWaveFormRenderer,
    loadScriptFromURL: loadScriptFromURL
  };
})();
