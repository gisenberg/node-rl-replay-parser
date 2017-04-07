// @flow

import BufferReader from 'buffer-reader';
import { UINT64 } from 'cuint';

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
  nextFloatLE: () => number;
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
    const header = this.parseHeader(reader, headerLength);
    reader.nextUInt32LE();
    reader.nextUInt32LE();
    const maps = this.parseMaps(reader);

    const replay = {
      CRC: crc,
      Version: `${majorVersion}.${minorVersion}`,
      Header: header,
      Maps: maps,
    }

    return replay;
  }

  parseMaps(reader: BufferReaderType): Array<string> {
    const maps = [];

    const arrLen = reader.nextUInt32LE();
    for(let i = 0; i < arrLen; i++) {
      maps.push(nextString(reader));
    }

    return maps;
  }

  getProperties(reader: BufferReaderType) {
    const properties = {};

    while(true) {
      const property = this.getProperty(reader);
      if(!property)
        break;

      properties[property.name] = property.value;
    }

    return properties;
  }

  getProperty(reader: BufferReaderType): (Object | null) {
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
        case 'FloatProperty':
          keyValue = reader.nextFloatLE();
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
          const high = reader.nextUInt32BE();
          const low = reader.nextUInt32BE();
          keyValue = UINT64(low, high).toString();
          break;
        default:
          throw new Error(`${keyType} not supported.`);
      }

      return {
        name: keyString,
        value: keyValue
      }
  }

  parseHeader(reader: BufferReader, headerLength: number): ReplayHeaderType {
    nextString(reader);
    return this.getProperties(reader);
  }
}

module.exports = Parser;
