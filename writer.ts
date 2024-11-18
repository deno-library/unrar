import { writeAll } from "./deps.ts";

const { open, stat } = Deno;

export default class Writer {
  protected file!: Deno.FsFile;
  private path: string;
  currentSize = 0;

  constructor(path: string) {
    this.path = path;
  }

  async setup(): Promise<void> {
    this.file = await open(this.path, {
      create: true,
      append: true,
      write: true,
    });
    this.currentSize = (await stat(this.path)).size;
  }

  async write(msg: Uint8Array): Promise<void> {
    await writeAll(this.file, msg);
    this.currentSize += msg.byteLength;
  }

  close(): void {
    this.file.close();
  }
}
