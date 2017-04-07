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

  describe('parse', () => {
    it('should parse the CRC and version number', () => {
      const parser = new Parser();
      const replay = parser.parse(replayFile);

      expect(replay.CRC).to.eql(replaySnapshot.CRC);
      expect(replay.Version).to.eql(replaySnapshot.Version);
    });

    it('should parse the header', () => {
      const parser = new Parser();
      const { Header } = parser.parse(replayFile);

      expect(Header).to.eql(replaySnapshot.Header);
    });

    it('should parse maps', () => {
      const parser = new Parser();
      const { Maps } = parser.parse(replayFile);

      expect(Maps).to.eql(replaySnapshot.Maps);
    });

    it('should parse keyframes', () => {
      const parser = new Parser();
      const { KeyFrames } = parser.parse(replayFile);

      expect(KeyFrames).to.eql(replaySnapshot.KeyFrames);
    });

    it('should parse debug log', () => {
      const parser = new Parser();
      const { DebugLog } = parser.parse(replayFile);

      expect(DebugLog).to.eql(replaySnapshot.DebugLog);
    });

    it('should parse goal frames', () => {
      const parser = new Parser();
      const { GoalFrames } = parser.parse(replayFile);

      expect(GoalFrames).to.eql(replaySnapshot.GoalFrames);
    });

    it('should parse goal frames', () => {
      const parser = new Parser();
      const { Packages } = parser.parse(replayFile);

      expect(Packages).to.eql(replaySnapshot.Packages);
    });
  });
});
