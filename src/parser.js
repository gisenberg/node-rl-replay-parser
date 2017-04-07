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

type DebugLogEntryType = {
  frame: number;
  player: string;
  data: string;
}

type GoalFrameType = {
  type: string;
  frame: number;
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
    const header = this.decodeHeader(reader, headerLength);
    reader.nextUInt32LE();
    reader.nextUInt32LE();
    const maps = this.decodeMaps(reader);
    const keyFrames = this.decodeKeyFrames(reader);

    const netstreamLength = reader.nextUInt32LE();
    reader.nextBuffer(netstreamLength);

    const debugLog = this.decodeDebugLog(reader);
    const goalFrames = this.decodeGoalFrames(reader);
    const packages = this.decodePackages(reader);

    const replay = {
      CRC: crc,
      Version: `${majorVersion}.${minorVersion}`,
      Header: header,
      Maps: maps,
      KeyFrames: keyFrames,
      DebugLog: debugLog,
      GoalFrames: goalFrames,
      Packages: packages
    }

    return replay;
  }

  decodeDebugLog(reader: BufferReaderType): Array<DebugLogEntryType> {
    const debugLog = [];

    const arrLen = reader.nextUInt32LE();
    for(let i = 0; i < arrLen; i++) {
      debugLog.push({
        frame: reader.nextUInt32LE(),
        player: nextString(reader),
        data: nextString(reader)
      });
    }

    return debugLog;
  }

  decodePackages(reader: BufferReaderType): Array<string> {
    const packages = [];

    const arrLen = reader.nextUInt32LE();
    for(let i = 0; i < arrLen; i++) {
      packages.push(nextString(reader));
    }

    return packages;
  }

  decodeGoalFrames(reader: BufferReaderType): Array<GoalFrameType> {
    const goalFrames = [];

    const arrLen = reader.nextUInt32LE();
    for(let i = 0; i < arrLen; i++) {
      goalFrames.push({
        type: nextString(reader),
        frame: reader.nextUInt32LE()
      });
    }

    return goalFrames;
  }

  decodeMaps(reader: BufferReaderType): Array<string> {
    const maps = [];

    const arrLen = reader.nextUInt32LE();
    for(let i = 0; i < arrLen; i++) {
      maps.push(nextString(reader));
    }

    return maps;
  }

  decodeKeyFrames(reader: BufferReaderType) {
    const keyFrameLength = reader.nextUInt32LE();
    const keyFrames = [];
    for(let i = 0; i < keyFrameLength; i++) {
      keyFrames.push({
        time: reader.nextFloatLE(),
        frame: reader.nextUInt32LE(),
        position: reader.nextUInt32LE()
      });
    }

    return keyFrames;
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

  decodeHeader(reader: BufferReader, headerLength: number): ReplayHeaderType {
    nextString(reader);
    return this.getProperties(reader);
  }
}

module.exports = Parser;
