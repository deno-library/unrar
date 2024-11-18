import { EventEmitter } from "./deps.ts";
import { exists } from "./deps.ts";
export * from "./unrar.ts";

const reg_progress = /([\d]+)%/;
// const reg_password = /^\r\nEnter password $will not be echoed$/;
const password_incorrect = "The specified password is incorrect";
const notRAR = "is not RAR archive";

/**
 * Interface for additional options when uncompressing a RAR file.
 */
interface Options {
  /** The command to use with the unrar tool, defaults to 'x' for extraction. */
  command?: string;
  /** An array of additional switches to pass to the unrar command, defaults to an empty array. */
  switches?: string[];
}

/**
 * A type representing a progress event listener function.
 * @param percent - The current progress percentage as a string.
 */
interface Listener {
  (percent: string): void;
}

/**
 * Defines the methods and events that an object must implement to be considered an UnrarInterface.
 */
export interface UnrarInterface {
  /**
   * Uncompresses a RAR file to a destination directory.
   * @param src - The source RAR file path.
   * @param dest - The destination directory path where files will be extracted.
   * @param options - Optional settings for the uncompression process.
   * @returns A promise that resolves when the operation is complete.
   */
  uncompress(src: string, dest: string, options: Options): Promise<void>;

  /**
   * Adds a listener for the 'progress' event.
   * @param event - The name of the event, which should always be 'progress'.
   * @param listener - The function to call when the 'progress' event is emitted.
   * @returns The instance itself for chaining calls.
   */
  on(event: "progress", listener: Listener): this;
}

/**
 * A class implementing the UnrarInterface to handle RAR file decompression.
 */
export class UnrarAll extends EventEmitter implements UnrarInterface {
  private decoder = new TextDecoder();
  private bin: string;

  /**
   * Creates an instance of the UnrarAll class.
   * @param bin - Path to the UnRAR executable, defaults to './bin/UnRAR.exe'.
   */
  constructor(bin: string = "./bin/UnRAR.exe") {
    super();
    this.bin = bin;
  }

  /**
   * Uncompresses a RAR file to the specified destination.
   * @param src - The path to the RAR file to uncompress.
   * @param dest - The path to the destination directory.
   * @param options - Additional options for the uncompression process.
   * @returns A promise that resolves once the file has been uncompressed.
   */
  async uncompress(
    src: string,
    dest: string,
    { command = "x", switches = [] }: Options = {},
  ): Promise<void> {
    if (!src.endsWith(".rar")) {
      throw new Error(notRAR);
    }
    if (!(await exists(src))) {
      throw new Error("Source file Not Found");
    }
    if (!(await exists(dest))) {
      await Deno.mkdir(dest, { recursive: true });
    }

    dest = await Deno.realPath(dest);

    const hasPassword = switches.some((v) => v.startsWith("-p"));
    if (!hasPassword) {
      switches.unshift("-p1");
    }

    const cmd = new Deno.Command(this.bin, {
      args: [command, ...switches, src, dest],
      stdin: "null",
      stdout: "piped",
      stderr: "piped",
    });
    const unrar = cmd.spawn();

    const reader = unrar.stdout.getReader();
    const errorReader = unrar.stderr.getReader();

    try {
      // Process output
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const msg = this.decoder.decode(value);
        if (msg.includes(notRAR)) {
          throw new Error(notRAR);
        }
        const match = msg.match(reg_progress);
        if (match) this.emit("progress", match[0]);
      }

      // Process errors
      let errMsg = "";
      while (true) {
        const { value, done } = await errorReader.read();
        if (done) break;
        errMsg += this.decoder.decode(value, { stream: true });
      }

      if (errMsg) {
        if (errMsg.includes(password_incorrect)) {
          throw new Error("Password protected file");
        }
        throw new Error(errMsg);
      }

      const status = await unrar.status;
      if (!status.success) {
        throw new Error(`Exit code: ${status.code}`);
      }

      this.emit("progress", "100%");
    } finally {
      reader.releaseLock();
      errorReader.releaseLock();
    }
  }
}

// Export an instance of UnrarAll as the default export
const unrarAll: UnrarAll = new UnrarAll();

export default unrarAll;