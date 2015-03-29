# wani API documentation

wani.js provides minimal set of functions which required to load WAML modules into WebAudio world, and also have some functions to manage loaded modules.

# Module management

## void Wani.registerModule(object definition)

Register a module to waml. this should be called from module script.

## AudioContext Wani.getAudioContext()

Returns an AudioContext instance.

## object Wani.createModule(string name)

Returns an instance of module identified by given name.

## array Wani.list(string type)

Returns a list of registered module names which matches to given type.

## object Wani.definition(string name)

Returns an definition of module specified by given name.

# Class

## Wani.WaniModule

Base Class of Wani module. When you use this class as base of your module, your module must have an propery named `outlet` which outputs the final result of processing.

Note that you can create WANI module without inheriting this Class. This class provides just 2 function prototypes `connect` and `disconnect`, This class is existing for just to avoid 6 lines of cut and paste and typing your module name twice ;)


# WebAudio Helper methods

## AudioNode Wani.createDCOffset(AudioContext ctx, number offset)

Returns a gainNode instance which provides DC offset. You may change the offset by set value to offset.gain.value.

## AudioNode Wani.createAudioParam(AudioContext ctx, number defaultValue, function onchange)

Returns an emulated AudioParam object.

## number Wani.midi2freq(number notenumber, optional number centerFrequency, optional number centerNote)

returns frequency of given MIDI note number. You may also pass the center frequecy and notenumber, so go to higher pitch world by `Waml.midi2freq(69,444)`, or can get multiplier of relative pitch `Waml.midi2freq(-2, 1, 0) // returns multiplier to make frequency 1 downer note of musical interval`.

## number Wani.freq2midi(number frequency, optional number centerFrequency, number centerNode)

returns noto number corresponds to given frequency.


