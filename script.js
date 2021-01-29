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

var app = new Vue({
  data: {
    loading: true,
    instrument: 'acoustic_grand_piano',
    allInstruments: soundFont.instruments,

    scaleRoot: 'C4',
    majorScale: true,
    scaleRoots: allNotes.slice(noteIndices.C4, noteIndices.C5),

    chordDegree: 1,
    scaleChords,

    chordExtensions,
  },
  el: '#app',
  methods: {
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
        sampler.playSample(this.instrument, tone, startDelay)
        startDelay += 0.05
      })
    },
    loadSamples() {
      this.loading = true
      sampler.loadSamples(this.instrument)
        .then(() => this.loading = false)
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

      if (!this.loading) this.playChord(currentChord)

      return currentChord
    }
  },
  watch: {
    instrument() {
      this.loadSamples()
    }
  },
  mounted() {
    this.loadSamples()
  }
})

