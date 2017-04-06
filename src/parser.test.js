import fs from 'fs'
import path from 'path';
import Parser from './parser';
import { expect } from 'chai';

describe('parser', () => {
  let replaySnapshot;

  beforeEach(() => {
    replaySnapshot = fs.readFileSync(path.join(__dirname, './snapshots/1.replay'));
  });

  describe('parseHeader', () => {
    it('should parse the header', () => {
      // const parser = new Parser();
      // const replayHeader = parser.parseHeader(replaySnapshot);
      //
      // expect(true).to.eql(false);
    });
  });

  describe('parse', () => {
      it('should parse the CRC and version number', () => {
        const parser = new Parser();
        const replay = parser.parse(replaySnapshot);

        expect(replay.CRC).to.eql('59f93396');
        expect(replay.Version).to.eql('868.17');
      });
  });
});
