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
    function readString(buffer: Buffer, strOffset: number) {
      const strLen = buffer.readUInt32LE(strOffset);
      const str = buffer.toString('utf-8', strOffset+4, strOffset+4 + strLen - 1);
      return { value: str, length: strLen + 4 };
    }

    const header = {};

    const headerSize = buffer.readUInt32LE(0);
    const headerRaw = buffer.slice(16, 16 + (headerSize - 8) * 8);

    let offset = readString(headerRaw, 0).length;

    let iter = 0;
    while(true) {
      const keyString = readString(headerRaw, offset);
      offset += keyString.length;
      const keyType = readString(headerRaw, offset);
      offset += keyType.length + 8; // skip property_value_size

      let keyValue;
      switch(keyType.value) {
        case 'IntProperty':
          keyValue = headerRaw.readUIntLE(offset);
          offset += 8;
          break;
      }

      header[keyString.value] = keyValue;
      iter++;
      if(iter > 0) break;
    }


    return header;
  }
}

module.exports = Parser;
