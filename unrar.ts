import { EventEmitter } from "./deps.ts";
import Writer from "./writer.ts";

// const reg_password = /^\r\nEnter password \(will not be echoed\)/;
const password_incorrect = "The specified password is incorrect";
const decoder = new TextDecoder();

/**
 * Represents information about a file in a RAR archive.
 */
interface FileInfo {
  [key: string]: string;
}

/**
 * Options for the Unrar constructor.
 */
interface ConstructorOptions {
  /**
   * Path to the UnRAR executable.
   */
  bin?: string;
  /**
   * Password for the RAR archive.
   */
  password?: string;
}

/**
 * Options for the uncompress method.
 */
interface UncompressOptions {
  /**
   * New name for the extracted file.
   */
  newName?: string;
}

/**
 * Class for handling RAR file operations such as listing contents and uncompressing files.
 */
export class Unrar extends EventEmitter {
  private bin: string;
  private args: string[];
  private decoder = new TextDecoder();

  /**
   * The path to the RAR file.
   */
  filepath: string;

  /**
   * The password for the RAR file.
   */
  password: string;

  /**
   * Constructs an Unrar instance.
   * @param filepath - The path to the RAR file.
   * @param options - Optional settings for the Unrar instance.
   */
  constructor(filepath: string, options: ConstructorOptions = {}) {
    super();
    this.filepath = filepath;
    this.password = options.password || "123";
    this.bin = options.bin || "./bin/UnRAR.exe";
    const switches = ["-idc", "-v"];
    switches.push(`-p${this.password}`);
    this.args = ["vt", ...switches, this.filepath];
  }

  /**
   * Lists the contents of the RAR file.
   * @returns A promise that resolves to an array of FileInfo objects.
   */
  async list(): Promise<FileInfo[]> {
    const data = await this.getList();
    const list = this.parse(data);
    return list;
  }

  /**
   * Retrieves the raw list of files from the RAR file.
   * @returns A promise that resolves to the raw list data.
   */
  private async getList(): Promise<string> {
    const unrar = new Deno.Command(this.bin, {
      args: this.args,
      stdout: "piped",
      stderr: "piped",
      stdin: "null",
    });

    const { stdout, stderr } = await unrar.output();
    if (stderr.length !== 0) {
      const msg = decoder.decode(stderr);
      if (msg.includes(password_incorrect)) {
        throw new Error("Password protected file");
      }
      throw new Error(msg);
    }

    const result = decoder.decode(stdout);
    // should get: reg_password, but get "Program aborted"
    // if (reg_password.test(result)) {
    //   throw new Error('Password protected file');
    // }
    return result;
  }

  /**
   * Uncompresses a file from the RAR archive to a destination directory.
   * @param fileInfo - Information about the file to uncompress.
   * @param destDir - The destination directory for the extracted file.
   * @param options - Optional settings for the uncompression process.
   * @returns A promise that resolves when the file is successfully uncompressed.
   */
  async uncompress(
    fileInfo: FileInfo,
    destDir: string,
    options: UncompressOptions = {},
  ): Promise<void> {
    const command = "p";
    const { size, name, type } = fileInfo;
    if (type !== "File") {
      throw new Error("Currently only supports a single file");
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
      "-n" + name,
      "-idq",
    ];
    if (password) {
      switches.push(`-p${password}`);
    }
    const cmd = new Deno.Command(this.bin, {
      args: [command, ...switches, filepath],
      stdout: "piped",
      stderr: "piped",
      stdin: "null",
    });
    const unrar = cmd.spawn();

    const reader = unrar.stdout.getReader();
    const errorReader = unrar.stderr.getReader();
    try {
      let writed = 0;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        await writer.write(value);
        writed += value.length;
        this.emit("progress", this.getPercent(writed / fileSize));
      }

      // Read from stderr
      let errMsg = "";
      while (true) {
        const { value, done } = await errorReader.read();
        if (done) break;
        errMsg += this.decoder.decode(value, { stream: true });
      }

      if (errMsg.length > 0) {
        throw new Error(errMsg);
      }

      const status = await unrar.status;
      if (!status.success) {
        throw new Error(`code: ${status.code}`);
      }
    } finally {
      reader.releaseLock();
      writer.close();
    }
  }

  /**
   * Calculates the percentage of completion.
   * @param ratio - The ratio of completed bytes to total bytes.
   * @returns The percentage of completion as a string.
   */
  private getPercent(ratio: number): string {
    return (100 * ratio).toFixed(2) + "%";
  }

  /**
   * Parses the raw list data into an array of FileInfo objects.
   * @param stdout - The raw list data.
   * @returns An array of FileInfo objects.
   */
  private parse(stdout: string): FileInfo[] {
    const list = stdout
      .split(/\r?\n\r?\n/)
      .filter((item) => item)
      .map((item) => {
        const obj: FileInfo = {};

        item
          .split(/\r?\n/)
          .filter((item) => item)
          .forEach((item) => {
            const arr = item.split(": ");
            const key = this.normalizeKey(arr[0]);
            const val = arr[1].trim();
            if (key) obj[key] = val;
          });

        return obj;
      })
      .filter((item) => item.name);

    return list;
  }

  /**
   * Normalizes a key to a consistent format.
   * @param key - The key to normalize.
   * @returns The normalized key.
   */
  private normalizeKey(key: string): string | undefined {
    const normKey = key.toLowerCase().replace(/^\s+/, "");
    const keyMap = new Map<string, string>([
      ["name", "name"],
      ["type", "type"],
      ["size", "size"],
      ["packed size", "packedSize"],
      ["ratio", "ratio"],
      ["mtime", "mtime"],
      ["attributes", "attributes"],
      ["crc32", "crc32"],
      ["crc32 mac", "crc32Mac"],
      ["host os", "hostOS"],
      ["compression", "compression"],
      ["flags", "flags"],
    ]);
    return keyMap.has(normKey) ? keyMap.get(normKey) : normKey;
  }
}