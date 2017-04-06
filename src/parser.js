// @flow

type ReplayHeaderType = {
}

type ReplayType = {
  CRC: string;
  Version: string;
  Header: ReplayHeaderType
}

class Parser {
  parse(buffer: Buffer): ReplayType {
    const replay = {
      CRC: buffer.readUInt32BE(4).toString(16),
      Version: `${buffer.readUInt32LE(8)}.${buffer.readUInt32LE(12)}`,
      Header: this.parseHeader(buffer),
    }

    return replay;
  }

  parseHeader(buffer: Buffer): ReplayHeaderType {
    return { };
  }
}

module.exports = Parser;
