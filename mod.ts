import EventEmitter from "https://raw.githubusercontent.com/fuxingZhang/deno-EventEmitter/master/EventEmitter.ts";
import { exists } from "./fs.ts";
export * from "./unrar.ts";

const reg_progress = /([\d]+)%/;
const reg_password = /^\r\nEnter password \(will not be echoed\)/;
const password_incorrect = "The specified password is incorrect";
const notRAR = "is not RAR archive";

interface Options {
  command?: string;
  switches?: string[];
}

interface Listener {
  (percent: string): void;
}

export interface UnrarInterface {
  uncompress(src: string, dest: string, options: Options): Promise<void>
  on(event: "progress", listener: Listener): this;
}

class Unrar extends EventEmitter implements UnrarInterface {
  private decoder = new TextDecoder();

  /**
   * uncompress .rar file
   *  - `src` source file path
   *  - `dest` destination folder path
   *  - `options` destination folder path
   *    - `command` command of unrar, default: x
   *    - `switches` switches of unrar, default: []
   */
  async uncompress(src: string, dest: string, { command = 'x', switches = [] }: Options = {}): Promise<void> {
    if (!src.endsWith('.rar')) {
      throw new Error(notRAR);
    }
    if (!(await exists(src))) {
      throw new Error('Source file Not Found');
    }
    if (!(await exists(dest))) {
      await Deno.mkdir(dest, { recursive: true });
    }

    dest = await Deno.realPath(dest);

    const hasPassword = switches.some(v => v.startsWith('-p'));
    if (!hasPassword) {
      switches.unshift('-p1');
    }

    const unrar = Deno.run({
      cmd: ["./bin/UnRAR.exe", command, ...switches, src, dest],
      stdout: "piped",
      stderr: "piped",
      stdin: "null",
    });

    try {
      if (!unrar.stdout) throw new Error('unexpected error');

      // readAll, can't get progress
      // const errBuf = await unrar.stderrOutput();
      // console.log(11, this.decoder.decode(errBuf));
      // const data = await unrar.output();
      // console.log(11, this.decoder.decode(data));

      let stdoutRead = await this.readMsg(unrar.stdout);

      while ((stdoutRead) !== null) {
        const stdout = this.decoder.decode(stdoutRead);
        if (stdout.includes(notRAR)) {
          throw new Error(notRAR);
        }
        /**
         * to deal
         * Conflict with progress bar
         */
        const stderrRead = await this.readMsg(unrar.stderr!);
        if (stderrRead !== null) {
          const stderr = this.decoder.decode(stderrRead);
          if (stderr.includes(password_incorrect)) {
            throw new Error("Password protected file");
          }
          throw new Error(stderr);
        }
        const match = stdout.match(reg_progress);
        if (match !== null) this.emit('progress', match[0]);
        stdoutRead = await this.readMsg(unrar.stdout)
      }
      this.emit('progress', '100%');
    } finally {
      unrar.stdout?.close();
      unrar.stderr?.close();
      unrar.close();
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
}

const unrar = new Unrar();

export default unrar;