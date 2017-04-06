require('mocha');
require('chai');

const fs = require('fs');
const path = require('path');

const Parser = require('./parser');

describe('parser', () => {
  describe('header', () => {
    it('should parse the header', () => {
      const parser = new Parser();
      const replaySnapshot = fs.readFileSync(path.join(__dirname, './snapshots/1.replay'));
      const replay = parser.parse(replaySnapshot);

      expect(replay.header.part1Length).to.be(1);
      expect(replay.header.part1crc).to.be(1);
      expect(replay.header.versionMajor).to.be(1);
      expect(replay.header.versionMinor).to.be(31);
      expect(replay.header.unknown5).to.be(1);
    });
  });
});
