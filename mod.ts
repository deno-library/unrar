import EventEmitter from "https://raw.githubusercontent.com/fuxingZhang/deno-EventEmitter/master/EventEmitter.ts";
import { exists } from "./fs.ts";
const reg_progress = /([\d]+)%/;
const reg_password = /^\r\nEnter password \(will not be echoed\)/;
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
  /**
   * uncompress .rar file
   *  - `src` source file path
   *  - `dest` destination folder path
   *  - `options` destination folder path
   *    - `command` command of unrar, default: x
   *    - `switches` switches of unrar, default: []
   */
  async uncompress(src: string, dest: string, { command = 'x', switches = [] }: Options = {}): Promise<void> {
    if (!(await exists(dest))) {
      await Deno.mkdir(dest, { recursive: true });
    }

    dest = await Deno.realPath(dest);

    const unrar = Deno.run({
      cmd: ["./bin/UnRAR.exe", command, ...switches, src, dest],
      stdout: "piped",
      stderr: "piped",
      stdin: "null",
    });

    try {
      if (!unrar.stdout) throw new Error('unexpected error');

      let numberOfBytesRead;
      do {
        const buf = new Uint8Array(1000);
        numberOfBytesRead = await unrar.stdout.read(buf);
        const data = new TextDecoder().decode(buf);
        if (data.includes(notRAR)) {
          throw new Error(data);
        }
        if (reg_password.test(data)) {
          unrar.close();
          const error = new Error('Password protected file');
          throw error;
        }
        const match = data.match(reg_progress);
        if (match !== null) this.emit('progress', match[0]);
      } while (numberOfBytesRead !== null)
      this.emit('progress', '100%');
    } finally {
      unrar.stdout?.close();
      unrar.stderr?.close();
      unrar.close();
    }
  }
}

const unrar = new Unrar();

export default unrar;