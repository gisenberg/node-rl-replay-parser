// @flow

import BufferReader from 'buffer-reader';

type ReplayHeaderType = {
}

type ReplayType = {
  CRC: string;
  Version: string;
  Header?: ReplayHeaderType
}

type BufferReaderType = {
  seek: (position: number) => void;
  nextString: () => string;
  nextUInt8: () => number;
  nextUInt16LE: () => number;
  nextUInt32LE: () => number;
  nextUInt32BE: () => number;
}

function nextString(reader: BufferReaderType): string {
  const strLen = reader.nextUInt32LE();
  const str = reader.nextString(strLen);
  return str.substr(0, strLen - 1); // exclude null terminator
}

class Parser {
  parse(buffer: Buffer): ReplayType {
    const reader = new BufferReader(buffer);
    const headerLength = reader.nextUInt32LE();
    const crc = reader.nextUInt32BE().toString(16);
    const majorVersion = reader.nextUInt32LE();
    const minorVersion = reader.nextUInt32LE();
    const replay = {
      CRC: crc,
      Version: `${majorVersion}.${minorVersion}`,
      Header: this.parseHeader(buffer),
    }

    return replay;
  }

  getProperties(buffer: BufferReaderType) {
    const properties = {};

    let iter = 0;
    while(true) {
      const property = this.getProperty(buffer);
      if(!property)
        break;

      properties[property.name] = property.value;

      iter++;
      if(iter > 5) break;
    }

    return properties;
  }

  getProperty(reader: BufferReaderType): Object {
      const keyString = nextString(reader);
      if(keyString === 'None') {
        return null;
      }

      const keyType = nextString(reader);
      const propertyValueSize = reader.nextUInt32LE();
      reader.nextUInt32LE();

      let keyValue;
      switch(keyType) {
        case 'BoolProperty':
          keyValue = reader.nextUInt8() === 1;
          break;
        case 'IntProperty':
          keyValue = reader.nextUInt32LE();
          break;
        case 'ArrayProperty':
          const arrLength = reader.nextUInt32LE();
          keyValue = [];
          for(let i = 0; i < arrLength; i++) {
            keyValue.push(this.getProperties(reader));
          }
          break;
        case 'NameProperty':
        case 'StrProperty':
          keyValue = nextString(reader);
          break;
        case 'ByteProperty':
          keyValue = {
            [nextString(reader)]: nextString(reader)
          };
          break;
        case 'QWordProperty':
          keyValue = { high: reader.nextUInt32LE(), low: reader.nextUInt32LE() };
          break;
        default:
          throw new Error(`${keyType} not supported.`);
      }

      return {
        name: keyString,
        value: keyValue
      }
  }

  parseHeader(buffer: Buffer): ReplayHeaderType {
    const headerSize = buffer.readUInt32LE(0);
    const headerReader = new BufferReader(buffer.slice(16, 16 + (headerSize - 8) * 8));

    nextString(headerReader);
    return this.getProperties(headerReader);
  }
}

module.exports = Parser;
