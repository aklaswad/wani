# WANI Specification

## Terminology

### WANI Module / Module

`WANI Module` is a representation of a part of DSP (Digital Signal Processing) written by JavaScript with using [WebAudio API], and have an interface which satisfying this specification. In this document, use term `module` as same as `WANI Module` if no anotation.

### User

Any programs and/or programmers try to load and use WANI Modules.

### WANI / wani

Capital WANI means this specification itself. And non-capital wani is a small runtime that helps modules to be loadable and runnable, and/or this repogitory.


## Registering Module

Module **SHOULD** be represented as single `*.js` module. And In that file, module **MUST** call a function `Wani.registerModule()` to notify to user about module informations. Module **MUST** pass one JavaScript Object which describes how the module behaves. Now I call that object *Registry*.

## Registry

Registry is a JavaScript object which describes how the registered module behaves, and what user inputs could be acceptable by the module, and anything other informations.

### name

*required*

name of the module.

### create

*required*

an object constructor function.

### type

*required*

The type of module's behavior. currently, The values `synth` and `effect` are acceptable.

### author

*optional*

author name

### description

*optional*

description of module

### audioParams

*optional*

a collection of audio parameters. Module instance **MUST** have `AudioParam` type properties with names specified in this list. details are described below

### params

*optional*

a collection of non-audio parameters. Module instance **MUST** have properties with names specified in this list.

### presets

*optional*

a collection of the preset values for audioParams and params.

## audioParams

All audioParams **MUST** be represented as set of key and object. Module **MUST** specify `range` for any audioParams. `range` MUST be an array having 2 values, means minimum acceptable value and maximum acceptable value for this parameter. User **SHOULD NOT** set value out of this range.
Module **MAY** specify the `step` value which requests to user how the value for this parameter should be increase and decrease. User **SHOULD** respect the step value.

```
audioParams:
  pitch: {
    range: [-12, 12],
    step: 1
  }
```


## params

All params **MUST** be respresented as set of key and object. Module **MUST** specify `range` as same as audioParam's one, or `values` which is array of strings. If values has specified, user **SHOULD NOT** pass non-listed values to this parameter.


```
params: {
  waveform: {
    values: ["sine", "sawtooth", "square", "triangle" ]
  }
}
```

## Connecting Modules

Module instance which have audio input (other words, Modules who specifid type as `effect`) **MUST** have a property named `input`. And that property **MUST** be connectable from other AudioNode.

Module instance which have audio output (currently all module) **MUST** have `connect` method and `disconnect` method, behaves as same as AudioNode's one. And Also, `connect` method should try to connect to both passed object itself and it's `input` property.


## Required Methods for Synth

`synth` type module **MUST** implement methods `noteOn` and `noteOff`. User **MAY** pass a MIDI note number to `noteOn` method, and module **SHOULD** play an expected note.



# EXAMPLE

See [TriOscillator](https://github.com/aklaswad/wani/blob/master/sample/TriOscillator.js) for the example of module implementation.

