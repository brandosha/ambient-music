/** @type { string[] } */
const allNotes = ['A0', 'Bb0', 'B0']
/** @type { Object.<string, number> } */
const noteIndices = { }
const noteNames = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
for (let octave = 1; octave <= 7; octave++) {
  noteNames.forEach(note => {
    noteIndices[note + octave] = allNotes.length
    allNotes.push(note + octave)
  })
}
allNotes.push('C8')

class Sampler {
  /**
   * @param { AudioContext } context
   * @param { _SoundFont } soundFont
   */
  constructor(context, soundFont) {
    this.context = context
    this.soundFont = soundFont
  }

  /**
   * @param { string } instrument
   * @param { string[] } notes
   */
  loadSamples(instrument, notes) {
    if (!notes) notes = allNotes

    const soundFont = this.soundFont

    const sampleArray = soundFont.samples[instrument] || Array(allNotes.length)
    soundFont.samples[instrument] = sampleArray

    const url = soundFont.url
    if (!url.endsWith('/')) url += '/'
    const promises = notes.map(note => {
      const existingSamples = soundFont.samples[instrument]
      const existingSample = existingSamples && existingSamples[noteIndices[note]]
      if (existingSample) return existingSample

      return fetch(url + instrument + '-mp3/' + note + '.mp3')
        .then(res => res.arrayBuffer())
        .then(buf => this.context.decodeAudioData(buf))
        .then(sample => {
          sampleArray[noteIndices[note]] = sample
        })
    })

    return Promise.all(promises)
  }

  /**
   * @param { string } instrument
   * @param { string | number } note
   * @param { number } delay
   */
  playSample(instrument, note, delay, offset, destination) {
    if (typeof note === 'string') note = noteIndices[note]

    const soundFont = this.soundFont
    const context = this.context

    const instrumentSamples = soundFont.samples[instrument]
    const sample = instrumentSamples && instrumentSamples[note]

    if (!sample) throw new Error("Cannot play sample because it hasn't been loaded")

    const bufferSource = context.createBufferSource()
    bufferSource.buffer = sample
    bufferSource.connect(destination || context.destination)

    bufferSource.start(context.currentTime + delay, offset)

    return bufferSource
  }
}