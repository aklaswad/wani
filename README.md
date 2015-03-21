# WAML

Web Audio Module Librarian

## なんぞ？

WebAudio APIで書かれたシンセサイザーやエフェクターをモジュール化し、外部スクリプトとして読み込み可能にしようという試みです。
このリポジトリには、モジュールのインターフェース仕様と、既存のコードをモジュール化するためのヘルパーを用意する予定です。

## 名前がださい

ごめん

# 仕様

モジュールはざっくりシンセとエフェクターに分類されます。それぞれ、モジュールをWamlから読み込み可能にするために、スクリプトファイルから`Waml.registerSynthesizer()`または`Waml.registerEffect()`を呼び出してモジュール定義を渡します。以下がモジュール定義の例です。

```
function TriOscillator (ctx) {
  // construct module
  return module;
}

...


if ( 'undefined' !== typeof window
  && 'undefined' !== typeof window.Waml ) {
  Waml.registerSynthesizer({
    name: 'TriOscillator',
    author: 'aklaswad<aklaswad@gmail.com>',
    description: 'TriOscillator',
    create: TriOscillator,
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
    }
  });
}
```

## モジュール定義の構成要素

### name...description

ry

### create

モジュールのインスタンスを生成するコンストラクタを指定します。いわゆるJavaScriptのfunctionです。`new foobar(ctx)`のように呼ばれます。

### audioParams

モジュールが公開する`AudioParam`プロパティを指定します。

### params

モジュールが公開するその他のプロパティを指定します。

### inlet (エフェクターのみ)

モジュールの音声入力に使用するAudioNodeのプロパティ名を指定します。 *inletという名前決め打ちでもいいか？複数必要な場合は？*

## AudioParamのインスタンス作れないんだけど？

現状、正攻法では作れないようです。黒魔術してください。または`Waml.createAudioParamBridge`を使ってください。

## モジュールの必須プロパティ

 * 全てのモジュールは、`connect`メソッドを実装する必要があります。
 * シンセサイザーとして登録したモジュールは、`NoteOn(noteNumber)`と`NoteOff()`のふたつのメソッドを実装する必要があります。 *TODO:ポリ音源について*


## モジュールの利用

```
<script src="//example.com/Waml.js"></script>
<script src="//example.com/SomeCoolModule.js"></script>
<script>

  var synth = Waml.createSynthesizer('Module Name');
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
