// @flow

import BufferReader from 'buffer-reader';

type ReplayHeaderType = {
}

type ReplayType = {
  CRC: string;
  Version: string;
  Header?: ReplayHeaderType
}

function readString(reader: BufferReader, strOffset: number) {
  const strLen = reader.nextUInt32LE();
  const str = reader.nextString(strLen);
  return str;
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
      // Header: this.parseHeader(reader),
    }

    return replay;
  }

  getProperties(buffer: Buffer, startOffset: number = 0) {
    const properties = {};
    let offset = startOffset;

    let iter = 0;
    while(true) {
      const property = this.getProperty(buffer, offset);
      properties[property.key] = property.value;
      offset = property.offset;
      iter++;
      if(iter > 5) break;
    }

    return { properties, offset };
  }

  getProperty(buffer: Buffer, offset: number) {
      const keyString = readString(buffer, offset);
      offset += keyString.length;
      const keyType = readString(buffer, offset);
      offset += keyType.length + 8; // skip property_value_size

      let keyValue;
      switch(keyType.value) {
        case 'IntProperty':
          keyValue = buffer.readUIntLE(offset);
          offset += 4;
          break;
        case 'ArrayProperty':
          const arrProp = this.getProperties(buffer, offset + 4);
          keyValue = arrProp.properties;
          offset = arrProp.offset;
        case 'StrProperty':
          const strProp = readString(buffer, offset);
          keyValue = strProp.value;
          offset += strProp.length;
          break;
        default:
          console.warn(`${keyType.value} not supported.`);
      }

      return {
        key: keyString.value,
        type: keyType.value,
        value: keyValue,
        offset
      }
  }

  parseHeader(buffer: Buffer): ReplayHeaderType {
    const headerSize = buffer.readUInt32LE(0);
    const headerRaw = buffer.slice(16, 16 + (headerSize - 8) * 8);

    let offset = readString(headerRaw, 0).length;
    return this.getProperties(headerRaw, offset);
  }
}

module.exports = Parser;
