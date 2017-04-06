// @flow

type ReplayHeaderType = {
}

type ReplayType = {
  CRC: string;
  Version: string;
  Header: ReplayHeaderType
}

function readString(buffer: Buffer, strOffset: number) {
  const strLen = buffer.readUInt32LE(strOffset);
  const str = buffer.toString('utf-8', strOffset+4, strOffset+4 + strLen - 1);
  return { value: str, length: strLen + 4 };
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
