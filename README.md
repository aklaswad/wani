# wani

Web Audio N Interface

_Native, Natural, Normalized... and hope if it could be Nice ;)_

[DEMO](http://aklaswad.github.io/wani/) [SPEC](https://github.com/aklaswad/wani/tree/master/docs/Spec.md) [API Referrence](https://github.com/aklaswad/wani/tree/master/docs/API.md)

## なんぞ？

WebAudio APIで書かれたシンセサイザーやエフェクターをモジュール化し、外部スクリプトとして読み込み可能にしようという試みです。
このリポジトリには、モジュールのインターフェース仕様と、既存のコードをモジュール化するためのヘルパーを用意する予定です。

## モジュールとは？

シンセサイザーやエフェクター等の内部実装とします。GUIは含みません。

# 仕様

モジュールはざっくりシンセとエフェクターに分類されます。それぞれ、モジュールをWaniから読み込み可能にするために、スクリプトファイルから`Wani.registerModule()`を呼び出してモジュール定義を渡します。以下がモジュール定義の例です。

```
function TriOscillator (ctx) {
  // construct module
  return module;
}

...


if ( 'undefined' !== typeof window
  && 'undefined' !== typeof window.Wani ) {
  Wani.registerModule({
    name: 'TriOscillator',
    author: 'aklaswad<aklaswad@gmail.com>',
    description: 'TriOscillator',
    create: TriOscillator,
    type: 'synth',
    audioParams: {
      frequency: {
        description: 'frequency (hz)',
        range: [0, 20000],
      },
    },
    params: {
      type: {
        values: ["sine", "sawtooth", "square", "triangle" ],
        description: "Wave shape type.",
      }
    },
    presets: {
      foobar: {
        audioParams: { frequency: 440 },
        params: { type: 'sine' }
      }
    }
  });
}
```

## モジュール定義の構成要素

### name...description

ry

### create

モジュールのインスタンスを生成するコンストラクタを指定します。いわゆるJavaScriptのfunctionです。`new foobar(ctx)`のように呼ばれます。

### type

モジュールのタイプを指定します。現在有効な値は`synth`と`effect`のみです。

### audioParams

モジュールが公開する`AudioParam`プロパティを指定します。

### params

モジュールが公開するその他のプロパティを指定します。

## AudioParamのインスタンス作れないんだけど？

現状、正攻法では作れないようです。黒魔術してください。または`Wani.createAudioParamBridge`を使ってください。
See Also https://github.com/WebAudio/web-audio-api/issues/367

## モジュールの必須プロパティ

 * エフェクターは、inputという名前のAudioNodeをプロパティにもつ必要があります。
 * エフェクターとシンセサイザーは、outputという名前のAudioNodeをプロパティに保つ必要があります。
 * シンセサイザーとして登録したモジュールは、`NoteOn(noteNumber)`と`NoteOff()`のふたつのメソッドを実装する必要があります。 *TODO:ポリ音源について*


## モジュールの利用

```
<script src="//example.com/Wani.js"></script>
<script src="//example.com/SomeCoolModule.js"></script>
<script>

  var synth = Wani.createSynthesizer('Module Name');
  synth.foobar.value = 42;
  synth.connect(ctx.destination);

</script>
```

# Disclaimer

This software is still alpha quality. We may change APIs without notice.

# Author

aklaswad

# License

MIT
