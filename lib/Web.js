(function () {

  function createWaveFormRenderer(canvas) {
    var ctx = Waml.getAudioContext();
    var proc = ctx.createScriptProcessor(2048,1,1);
    var canvas = document.getElementById(canvas);
    var cctx = canvas.getContext('2d');
    cctx.strokeStyle = '#000';
    var frames = 0;
    var last = {max: 0, maxframe: 0 };
    proc.onaudioprocess = function(evt) {
      var i,channel = evt.inputBuffer.getChannelData(0);
      cctx.clearRect(0,0,canvas.width,canvas.height);
      cctx.moveTo(0,100);
      cctx.beginPath();
      var max = 0;
      for(i=0;i<512;i++){
        var vv = [];
        var idx = i * 4;
        vv[0] = channel[idx];
        vv[1] = channel[idx+1];
        vv[2] = channel[idx+2];
        vv[3] = channel[idx+3];
        var j,v = 0;
        var minv=1,maxv=-1,maxabsv = 0;
        for(j=0;j<4;j++) {
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
        cctx.lineTo(i,100 + -100 * minv);
        cctx.lineTo(i,100 + -100 * maxv);
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
  };

  Waml.Web = {
    createWaveFormRenderer: createWaveFormRenderer

  };
})();
