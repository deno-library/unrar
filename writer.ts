import { writeAll } from "./deps.ts";

/**
 * Opens a file and returns the file object and file status information.
 */
const { open, stat } = Deno;

/**
 * The Writer class is used to write data to a specified file path.
 */
export default class Writer {
  /**
   * File object used for file operations.
   * @protected
   * @type {Deno.FsFile}
   */
  protected file!: Deno.FsFile;

  /**
   * The path of the file to write to.
   * @private
   * @type {string}
   */
  private path: string;

  /**
   * The current number of bytes written to the file.
   * @type {number}
   */
  currentSize = 0;

  /**
   * Constructs a new Writer instance.
   * @param {string} path - The path of the file.
   */
  constructor(path: string) {
    this.path = path;
  }

  /**
   * Sets up the Writer instance by opening the file and getting its size.
   * @returns {Promise<void>}
   */
  async setup(): Promise<void> {
    this.file = await open(this.path, {
      create: true, // Create the file if it does not exist
      append: true, // Append data to the end of the file
      write: true, // Allow writing
    });
    this.currentSize = (await stat(this.path)).size; // Get the current size of the file
  }

  /**
   * Writes data to the file.
   * @param {Uint8Array} msg - The data to write.
   * @returns {Promise<void>}
   */
  async write(msg: Uint8Array): Promise<void> {
    await writeAll(this.file, msg); // Write the data to the file
    this.currentSize += msg.byteLength; // Update the number of bytes written
  }

  /**
   * Closes the file and releases resources.
   */
  close(): void {
    this.file.close(); // Close the file
  }
}
