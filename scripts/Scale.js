const IntervalPattern = {
  major: [2, 2, 1, 2, 2, 2, 1],
  minor: [2, 1, 2, 2, 1, 2, 2]
}

const ChordExtensions = {
  triad: [1, 3, 5],
  seventh: [1, 3, 5, 7],
  ninth: [1, 3, 5, 7, 9],
  addNinth: [1, 3, 5, 9]
}

class Scale {
  /**
   * @param { string | number } root
   * @param { number[] } intervalPattern The interval pattern in semitones (1 = H, 2 = W, etc.)
   */
  constructor(root, intervalPattern) {
    /** @type { number } */
    if (typeof root === 'number') {
      this.rootNum = root
      this.root = allNotes[root]
    } else {
      this.rootNum = noteIndices[root]
      this.root = root
    }

    this.intervalPattern = intervalPattern
  }

  /**
   * @param { number } degree
   * @param { boolean } asNoteName
   */
  note(degree, asNoteName) {
    const direction = Math.sign(degree)
    let intervalIndex = 0
    if (degree < 0) intervalIndex = this.intervalPattern.length - 1

    let tone = this.rootNum

    const absDegree = Math.abs(degree) - 1 // One index the degree
    for (let i = 0; i < absDegree; i++) {
      tone += this.intervalPattern[intervalIndex] * direction

      intervalIndex = (intervalIndex + direction) % this.intervalPattern.length
      if (intervalIndex < 0) intervalIndex += this.intervalPattern.length
    }

    if (asNoteName) return allNotes[tone]
    return tone
  }

  /**
   * @param { number } degree
   * @param { number[] } extensions The chord extensions (default is 1st, 3rd, and 5th [1, 3, 5]). Use negative numbers for inversions
   * @param { boolean } asNoteNames
   */
  chord(degree, extensions = [1, 3, 5], asNoteNames) {
    const scaleDegrees = extensions.map(extension => {
      if (extension > 0) {
        return Scale.addInterval(degree, extension)
      } else if (extension < 0) {
        let inversion = -(9 + extension)
        if (-extension >= 8) inversion = -extension - 7

        return Scale.addInterval(degree, inversion)
      }

      return degree
    })

    return scaleDegrees.map(deg => this.note(deg, asNoteNames))
  }

  static addInterval(degree, interval) {
    let zeroDegree = degree - Math.sign(degree) // Zero indexed
    zeroDegree += interval - Math.sign(interval)

    return zeroDegree + Math.sign(zeroDegree)
  }
}