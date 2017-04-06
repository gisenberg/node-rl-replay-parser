// @flow

type ReplayHeaderType = {
  CRC: string;
  Version: string;
}

type ReplayType = {
  Header: ReplayHeaderType
}

class Parser {
  constructor() {

  }

  parse(buffer: Buffer): ReplayType {
    const replay = {
      Header: this.parseHeader(buffer),
    };

    return replay;
  }

  parseHeader(buffer: Buffer): ReplayHeaderType {
    const header = {
      CRC: buffer.readUInt32BE(4).toString(16),
      Version: `${buffer.readUInt32LE(8)}.${buffer.readUInt32LE(12)}`
    }
    
    return header;
  }
}

module.exports = Parser;
