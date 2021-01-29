const soundFont = SoundFont.fluid

let audioContext = new AudioContext()
const sampler = new Sampler(audioContext, soundFont)

const scale = new Scale('C4', IntervalPattern.major)

const scaleChords = {
  major: [
    { numeral: 'I', rootDegree: -8 },
    { numeral: 'ii', rootDegree: -7 },
    { numeral: 'iii', rootDegree: -6 },
    { numeral: 'IV', rootDegree: -5 },
    { numeral: 'vi', rootDegree: -3 },
    { numeral: 'I', rootDegree: 1 },
    { numeral: 'ii', rootDegree: 2 },
    { numeral: 'iii', rootDegree: 3 },
    { numeral: 'IV', rootDegree: 4 },
    { numeral: 'vi', rootDegree: 6 },
    { numeral: 'I', rootDegree: 8 }
  ],
  minor: [
    { numeral: 'i', rootDegree: -8 },
    { numeral: 'III', rootDegree: -6 },
    { numeral: 'iv', rootDegree: -5 },
    { numeral: 'v', rootDegree: -4 },
    { numeral: 'VI', rootDegree: -3 },
    { numeral: 'i', rootDegree: 1 },
    { numeral: 'III', rootDegree: 3 },
    { numeral: 'iv', rootDegree: 4 },
    { numeral: 'v', rootDegree: 5 },
    { numeral: 'VI', rootDegree: 6 },
    { numeral: 'i', rootDegree: 8 }
  ]
}

const chordExtensions = {
  '5': { use: true, inverted: false },
  '6': { use: false },
  '7': { use: true, inverted: false },
  '8': { use: false },
  '9': { use: false, inverted: false },
  '10': { use: false },
}

const convolverBuffers = {
  'outdoorBlastoff': null,
  'roomConcertHall': null,
  'roomHuge': null,
  'roomPool': null,
  meta: {
    promise: null
  }
}
 
convolverBuffers.meta.promise = Promise.all(
  Object.keys(convolverBuffers).map(bufferName => {
    if (bufferName === 'meta') return

    const fileName = bufferName[0].toUpperCase() + bufferName.slice(1)
    fetch('impulses/' + fileName + '.aiff')
      .then(res => res.arrayBuffer())
      .then(buf => audioContext.decodeAudioData(buf))
      .then(audio => convolverBuffers[bufferName] = audio)
  })
)

const autosave = JSON.parse(localStorage.getItem('autosave'))

var app = new Vue({
  data: {
    loading: true,
    instrument: 'acoustic_grand_piano',
    allInstruments: soundFont.instruments,

    convolverBuffer: null,
    convolverBuffers,

    scaleRoot: 'C4',
    majorScale: true,
    scaleRoots: allNotes.slice(noteIndices.C4, noteIndices.C5),

    chordDegree: 1,
    scaleChords,

    chordExtensions,

    ambientInterval: 15,
    stopAmbient: null
  },
  el: '#app',
  methods: {
    playChordOnUpdate(updatedChord) {
      if (this.loading || this.stopAmbient) return // Don't play if loading or playing ambient
      this.playChord(updatedChord)
    },
    /** @param { (string[] | number[]) } tones */
    playChord(tones) {
      let startDelay = 0.1

      if (!tones) tones = this.currentChord

      tones.sort((a, b) => {
        if (typeof a === 'string') a = noteIndices[a]
        if (typeof b === 'string') b = noteIndices[b]

        return a - b
      })

      tones.forEach(tone => {
        this.playTone(tone, startDelay)
        startDelay += 0.05
      })
    },
    playTone(tone, delay = 0, instrument, convolverBuffer) {
      instrument = instrument || this.instrument
      convolverBuffer = convolverBuffer || this.convolverBuffer

      let convolver = audioContext.destination // Skip convolver unless enabled
      if (convolverBuffer) {
        convolver = audioContext.createConvolver()
        convolver.buffer = convolverBuffers[convolverBuffer]

        if (convolverBuffer == 'outdoorBlastoff') { // Increase volume for blastoff reverb
          const gainNode = audioContext.createGain()
          gainNode.gain.value = 5

          convolver.connect(gainNode)
          gainNode.connect(audioContext.destination)
        } else convolver.connect(audioContext.destination)
      }

      sampler.playSample(instrument, tone, delay, 0, convolver)
    },
    loadSamples() {
      this.loading = true
      sampler.loadSamples(this.instrument)
        .then(() => this.loading = false)
    },
    getJSON() {
      return JSON.parse(JSON.stringify({
        instrument: this.instrument,
        convolverBuffer: this.convolverBuffer,
        scaleRoot: this.scaleRoot,
        majorScale: this.majorScale,
        chordDegree: this.chordDegree,
        chordExtensions: this.chordExtensions,
        ambientInterval: this.ambientInterval
      }))
    },
    loadJSON(save) {
      this.instrument = save.instrument
      this.convolverBuffer = save.convolverBuffer
      this.scaleRoot = save.scaleRoot
      this.majorScale = save.majorScale
      this.chordDegree = save.chordDegree
      this.chordExtensions = save.chordExtensions
      this.ambientInterval = save.ambientInterval || this.ambientInterval
    },

    startAmbient(averageInterval) {
      averageInterval = averageInterval || this.ambientInterval

      const space = averageInterval
      const spaceDifference = averageInterval / 3

      const intervals = this.currentChord.map(() => space + (Math.random() * spaceDifference * 2) - spaceDifference)
      const initialDelays = this.currentChord.map(() => Math.random() * space)

      const timeoutHandles = []
      const intervalHandles = []

      const instrument = this.instrument
      const convolverBuffer = this.convolverBuffer

      this.currentChord.forEach((tone, i) => {
        const timeoutHandle = setTimeout(() => {
          this.playTone(tone, 0, instrument, convolverBuffer)
          const intervalHandle = setInterval(() => this.playTone(tone, 0, instrument, convolverBuffer), intervals[i] * 1000)
          intervalHandles.push(intervalHandle)
        }, initialDelays[i] * 1000)

        timeoutHandles.push(timeoutHandle)
      })

      this.stopAmbient = () => {
        timeoutHandles.forEach(handle => clearTimeout(handle))
        intervalHandles.forEach(handle => clearInterval(handle))

        this.stopAmbient = null
      }
    }
  },
  computed: {
    currentChord() {
      const intervalPattern = this.majorScale ? IntervalPattern.major : IntervalPattern.minor
      const scale = new Scale(this.scaleRoot, intervalPattern)

      const extensions = [1, 3]
      Object.keys(this.chordExtensions).forEach(extension => {
        const options = this.chordExtensions[extension]
        if (!options.use) return

        let val = parseInt(extension)
        if (options.inverted) val *= -1

        extensions.push(val)
      })

      const currentChord = scale.chord(this.chordDegree, extensions, true)

      console.log('updated computed chord')
      localStorage.setItem('autosave', JSON.stringify(this.getJSON()))
      this.playChordOnUpdate(currentChord)
      
      return currentChord
    }
  },
  watch: {
    instrument() {
      this.loadSamples()
    }
  },
  async mounted() {
    await convolverBuffers.meta.promise
    delete convolverBuffers.meta

    this.loadSamples()
  }
})

if (autosave) app.loadJSON(autosave)
