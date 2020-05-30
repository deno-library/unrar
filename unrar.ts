import EventEmitter from "https://raw.githubusercontent.com/fuxingZhang/deno-EventEmitter/master/EventEmitter.ts";
import Writer from "./writer.ts";

const reg_password = /^\r\nEnter password \(will not be echoed\)/;
const decoder = new TextDecoder();

interface FileInfo {
  [key: string]: any
}

interface uncompressOptions {
  newName?: string
}

export class Unrar extends EventEmitter {
  private bin = "./bin/UnRAR.exe";
  private args: string[];
  private decoder = new TextDecoder();

  filepath: string;
  password?: string;

  constructor(filepath: string, password?: string) {
    super();
    this.filepath = filepath;
    this.password = password;
    const switches = ['-idc', '-v'];
    if (password !== undefined) switches.push(`-p${password}`);
    this.args = ['vt', ...switches, this.filepath];
  }

  async list() {
    const data = await this.getList();
    const list = this.parse(data);
    return list
  }

  private async getList() {
    const unrar = Deno.run({
      cmd: [this.bin, ...this.args],
      stdout: "piped",
      stderr: "piped",
      stdin: "null",
    });

    const stderr = await unrar.stderrOutput();
    if (stderr.length !== 0) {
      throw new Error(decoder.decode(stderr));
    }
    const stdout = await unrar.output();
    const result = decoder.decode(stdout);
    if (reg_password.test(result)) {
      throw new Error('Password protected file');
    }
    return result;
  }

  async uncompress(fileInfo: FileInfo, destDir: string, options: uncompressOptions = {}): Promise<void> {
    const command = 'p';
    const { size, name, type } = fileInfo;
    if (type !== 'File') {
      throw new Error('Currently only supports a single file');
    }
    if (!size) throw new Error("can't get size");
    const fileSize = +size;
    if (Number.isNaN(fileSize)) throw new Error("unexpected size");

    const { password, filepath } = this;
    const filename = options.newName || name;
    const destpath = `${destDir}/${filename}`;
    const writer = new Writer(destpath);
    await writer.setup();

    const switches = [
      '-n' + name,
      '-idq',
    ];
    if (password) {
      switches.push(`-p${password}`);
    }
    const unrar = Deno.run({
      cmd: [this.bin, command, ...switches, filepath],
      stdout: "piped",
      stderr: "piped",
      stdin: "null",
    });
    try {
      if (!unrar.stdout) throw new Error('unexpected error');
      let readed: number | null;
      let writed = 0;
      const readsize = this.getReadSize(fileSize);
      do {
        const p = new Uint8Array(readsize);
        readed = await unrar.stdout.read(p);
        // console.log({ readed }, p)
        if (readed) await writer.write(p);

        if (readed) {
          writed += readed;
          this.emit('progress', this.getPercent(writed / fileSize));
        }
      } while (readed !== null);
    } finally {
      writer.close();
      unrar.stdout?.close();
      unrar.stderr?.close();
      unrar.close();
    }
  }

  private getPercent(n: number): string {
    return (100 * n).toFixed(2) + '%';
  }

  private getReadSize(fileSize: number) {
    if (fileSize < 10 * 1024 * 1024) {
      return 100 * 1024; // 10 kb
    } else if (fileSize < 100 * 1024 * 1024) {
      return 100 * 1024; // 100 kb
    } else {
      return 1024 * 1024;
    }
  }

  private async readMsg(reader: Deno.Reader): Promise<Uint8Array | null> {
    const arr: Uint8Array[] = [];
    const n = 50;
    let readed: number | null;
    do {
      const p: Uint8Array = new Uint8Array(n);
      readed = await reader.read(p);
      arr.push(p);
    } while (readed !== null && readed === n)
    if (readed === null) return readed;
    const result = this.concatUint8Array(arr);
    return result;
  }

  private concatUint8Array(arr: Uint8Array[]): Uint8Array {
    const length = arr.reduce((pre, next) => pre + next.length, 0);
    const result = new Uint8Array(length);
    let offset = 0;
    for (const v of arr) {
      result.set(v, offset);
      offset += v.length;
    }
    return result;
  }

  private parse(stdout: string): FileInfo[] {
    const list = stdout
      .split(/\r?\n\r?\n/)
      .filter(item => item)
      .map(item => {
        const obj: FileInfo = {};

        item
          .split(/\r?\n/)
          .filter(item => item)
          .forEach(item => {
            const arr = item.split(': ');
            const key = this.normalizeKey(arr[0]);
            const val = arr[1].trim();
            if (key) obj[key] = val;
          });

        return obj;
      })
      .filter(item => item.name);

    return list
  }

  private normalizeKey(key: string): string | undefined {
    const normKey = key.toLowerCase().replace(/^\s+/, '');
    const keyMap = new Map([
      ['name', 'name'],
      ['type', 'type'],
      ['size', 'size'],
      ['packed size', 'packedSize'],
      ['ratio', 'ratio'],
      ['mtime', 'mtime'],
      ['attributes', 'attributes'],
      ['crc32', 'crc32'],
      ['crc32 mac', 'crc32Mac'],
      ['host os', 'hostOS'],
      ['compression', 'compression'],
      ['flags', 'flags']
    ]);
    return keyMap.has(normKey) ? keyMap.get(normKey) : normKey;
  }
}