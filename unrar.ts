import EventEmitter from "https://raw.githubusercontent.com/fuxingZhang/deno-EventEmitter/master/EventEmitter.ts";
import Writer from "./writer.ts";

const reg_password = /^\r\nEnter password \(will not be echoed\)/;
const password_incorrect = "The specified password is incorrect";
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
  password: string;

  constructor(filepath: string, password?: string) {
    super();
    this.filepath = filepath;
    this.password = password || '123';
    const switches = ['-idc', '-v'];
    switches.push(`-p${this.password}`);
    this.args = ['vt', ...switches, this.filepath];
  }

  async list(): Promise<FileInfo[]> {
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
    try {
      const stderr = await unrar.stderrOutput();
      if (stderr.length !== 0) {
        const msg = decoder.decode(stderr);
        unrar.stdout?.close();
        if (msg.includes(password_incorrect)) {
          throw new Error("Password protected file");
        }
        throw new Error(msg);
      }
      const stdout = await unrar.output();

      const result = decoder.decode(stdout);
      // should get: reg_password, but get "Program aborted"
      // if (reg_password.test(result)) {
      //   throw new Error('Password protected file');
      // }
      return result;
    } finally {
      unrar.close();
    }
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
        if (readed === null) break;
        await writer.write(readed === readsize ? p : p.subarray(0, readed));
        writed += readed;
        this.emit('progress', this.getPercent(writed / fileSize));
      } while (true);
      const stderr = await unrar.stderrOutput();
      if (stderr.length !== 0) {
        const errMsg = this.decoder.decode(stderr);
        throw new Error(errMsg);
      }
    } finally {
      writer.close();
      unrar.stdout?.close();
      // unrar.stderr?.close();
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