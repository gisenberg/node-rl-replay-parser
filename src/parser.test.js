require('mocha');
import { expect } from 'chai';

const fs = require('fs');
const path = require('path');

const Parser = require('./parser');

describe('parser', () => {
  describe('header', () => {
    it('should parse the header', () => {
      const parser = new Parser();
      const replaySnapshot = fs.readFileSync(path.join(__dirname, './snapshots/1.replay'));
      const replayHeader = parser.parseHeader(replaySnapshot);

      expect(replayHeader.CRC).to.eql('59f93396');
      expect(replayHeader.Version).to.eql('868.17');
    });
  });
});
