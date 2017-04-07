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
    const packages = this.decodeStringArray(reader);
    const objects = this.decodeStringArray(reader);
    const names = this.decodeStringArray(reader);
    const classMap = this.decodeClassIndexMap(reader);
    const netCache = this.decodeClassNetCache(reader, classMap);

    const replay = {
      CRC: crc,
      Version: `${majorVersion}.${minorVersion}`,
      Header: header,
      Maps: maps,
      KeyFrames: keyFrames,
      DebugLog: debugLog,
      GoalFrames: goalFrames,
      Packages: packages,
      Objects: objects,
      Names: names,
      ClassMap: classMap,
      NetCache: netCache
    }

    return replay;
  }

  decodeClassIndexMap(reader: BufferReaderType): Object {
    const classIndexMap = {};

    const arrLen = reader.nextUInt32LE();
    for(let i = 0; i < arrLen; i++) {
      const name = nextString(reader);
      const classId = reader.nextUInt32LE();
      classIndexMap[classId] = name;
    }

    return classIndexMap;
  }

  decodeClassNetCache(reader: BufferReaderType, classMap: Object) {
    const cacheList = [];

    const entryNumber = reader.nextUInt32LE();
    for(let i = 0; i < entryNumber; i++) {
      const classId = reader.nextUInt32LE();
      const parent = reader.nextUInt32LE();
      const cacheId = reader.nextUInt32LE();
      const length = reader.nextUInt32LE();
      const mapping = {};

      for(let j = 0; j < length; j++) {
        const propertyIndex = reader.nextUInt32LE();
        const propertyMappedIndex = reader.nextUInt32LE();
        mapping[propertyMappedIndex] = propertyIndex;
      }

      const data = {
        mapping,
        parent,
        cacheId
      }

      cacheList.push({[classMap[classId]]: data});
    }

    cacheList.reverse(); // Build netcache tree by "furling" our netcaches from behind

    for(let i = 0; i < cacheList.length - 1; i++) {
      const item = cacheList[i];
      let nextCacheIndex = i + 1;
      let parent = item[Object.keys(item)[0]].parent;
      while(true) {
        if(nextCacheIndex === cacheList.length) { // Hit root without finding parent
          parent -= 1; // Try one ID lower for the parent
          nextCacheIndex = i + 1; //r reset search to first item
          continue;
        }

        let nextItem = cacheList[nextCacheIndex];
        nextItem = nextItem[Object.keys(nextItem)[0]];
        if(nextItem.cacheId === parent) {
          nextItem = Object.assign(nextItem, item);
          break;
        } else {
          nextCacheIndex += 1;
        }
      }
    }

    return cacheList[cacheList.length - 1];
  }

  decodeStringArray(reader: BufferReaderType): Array<string> {
    const strings = [];

    const arrLen = reader.nextUInt32LE();
    for(let i = 0; i < arrLen; i++) {
      strings.push(nextString(reader));
    }

    return strings;
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
