import fs from 'fs'
import path from 'path';
import Parser from './parser';
import { expect } from 'chai';

describe('parser', () => {
  let replayFile;
  let replaySnapshot;

  beforeEach(() => {
    replayFile = fs.readFileSync(path.join(__dirname, './snapshots/1.replay'));
    replaySnapshot = require('./snapshots/1.js');
  });

  describe('parseHeader', () => {
    it('should parse the header', () => {
      const parser = new Parser();
      const replayHeader = parser.parse(replayFile).Header;

      expect(replayHeader).to.eql(replaySnapshot.Header);
    });
  });

  describe('parse', () => {
      it('should parse the CRC and version number', () => {
        const parser = new Parser();
        const replay = parser.parse(replayFile);

        expect(replay.CRC).to.eql(replaySnapshot.CRC);
        expect(replay.Version).to.eql(replaySnapshot.Version);
      });
  });
});
