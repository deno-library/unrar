# unrar
uncompress rar file for deno

## Useage  
* upcompress all
```js
// Simply get an instance of UnrarAll
import unrar from "https://deno.land/x/unrar@v1.0.1/mod.ts";
// Equal to: 
import { UnrarAll } from "https://deno.land/x/unrar@v1.0.1/mod.ts";
const unrar = new UnrarAll();
// If you do not want to use the default bin (the default bin only supports Windows)
import { UnrarAll } from "https://deno.land/x/unrar@v1.0.1/mod.ts";
const unrar = new UnrarAll(bin: "/x/.../UnRAR.exe");

const src = './test/password.rar';
const dest = './test';
const command = 'e';
const switches = ['-o+', '-idcd'];

(async () => {
  unrar.on('progress', percent => {
    console.log(percent);
  });

  // command default: x, switches default: []
  await unrar.uncompress(src, dest);
  // If you want to pass the command or switches parameter
  await unrar.uncompress(src, dest, {
    command,
    switches,
  });
})().catch(console.error);
```  

* uncompress part 
more exmaple in test folder
```ts
import { Unrar } from "https://deno.land/x/unrar@v1.0.1/mod.ts";
const src = './test/test.rar';
const dest = './test';
const uncompressedFile = './test/test2.txt';
// create a instance
const unrar = new Unrar(src);
// If you do not want to use the default bin (the default bin only supports Windows)
const unrar = new Unrar(src, { bin: "./bin/UnRAR.exe" });
// If the file is encrypted
const unrar = new Unrar(src, { password: "esri@hello" });

try {
  const list = await unrar.list();
  assert(Array.isArray(list));
  unrar.on('progress', (percent: string) => {
    assert(percent.includes('%'));
  });

  await unrar.uncompress(list[0], dest);
  // If you want to use a new file name
  await unrar.uncompress(list[0], dest, {
    newName: 'test2.txt'
  });

  const data = Deno.readFileSync(uncompressedFile);
  const txt = decoder.decode(data);
  assert(txt === 'test');
  Deno.removeSync(uncompressedFile);
} catch (error) {
  assert(false);
}
```

## Definitions  
* upcompress all
```ts
interface Options {
  command?: string;
  switches?: string[];
}

interface UnrarAll {
  constructor(bin?: string);

  /**
   * uncompress .rar file
   *  - `src` source file path
   *  - `dest` destination folder path
   *  - `options` destination folder path
   *    - `command` command of unrar, default: x
   *    - `switches` switches of unrar, default: []
   */
  async uncompress(src: string, dest: string, options?: Options): Promise<void>;

  on(event: "progress", listener: (percent: string) => void): this;
}
export class UnrarAll extends EventEmitter implements UnrarAll {};
export default new UnrarAll();
```  

* uncompress part
```ts  
interface constuctorOptions {
  bin?: string;
  password?: string;
}

interface uncompressOptions {
  newName?: string
}

interface Unrar {
  constructor(filepath: string, options?: constuctorOptions);
  async list(): Promise<FileInfo[]>;
  async uncompress(fileInfo: FileInfo, destDir: string, options?: uncompressOptions): Promise<void>;
  on(event: "progress", listener: (percent: string) => void): this;
}
```

### Commands
```
  e             Extract files without archived paths
  l[t[a],b]     List archive contents [technical[all], bare]
  p             Print file to stdout
  t             Test archive files
  v[t[a],b]     Verbosely list archive contents [technical[all],bare]
  x             Extract files with full path
```

### Switches
```
  -             Stop switches scanning
  @[+]          Disable [enable] file lists
  ac            Clear Archive attribute after compression or extraction
  ad            Append archive name to destination path
  ag[format]    Generate archive name using the current date
  ai            Ignore file attributes
  ap<path>      Set path inside archive
  c-            Disable comments show
  cfg-          Disable read configuration
  cl            Convert names to lower case
  cu            Convert names to upper case
  dh            Open shared files
  ep            Exclude paths from names
  ep3           Expand paths to full including the drive letter
  f             Freshen files
  id[c,d,p,q]   Disable messages
  ierr          Send all messages to stderr
  inul          Disable all messages
  ioff[n]       Turn PC off after completing an operation
  kb            Keep broken extracted files
  n<file>       Additionally filter included files
  n@            Read additional filter masks from stdin
  n@<list>      Read additional filter masks from list file
  o[+|-]        Set the overwrite mode
  oc            Set NTFS Compressed attribute
  ol[a]         Process symbolic links as the link [absolute paths]
  or            Rename files automatically
  ow            Save or restore file owner and group
  p[password]   Set password
  p-            Do not query password
  r             Recurse subdirectories
  ri<P>[:<S>]   Set priority (0-default,1-min..15-max) and sleep time in ms
  sc<chr>[obj]  Specify the character set
  sl<size>      Process files with size less than specified
  sm<size>      Process files with size more than specified
  ta[mcao]<d>   Process files modified after <d> YYYYMMDDHHMMSS date
  tb[mcao]<d>   Process files modified before <d> YYYYMMDDHHMMSS date
  tn[mcao]<t>   Process files newer than <t> time
  to[mcao]<t>   Process files older than <t> time
  ts[m,c,a]     Save or restore file time (modification, creation, access)
  u             Update files
  v             List all volumes
  ver[n]        File version control
  vp            Pause before each volume
  x<file>       Exclude specified file
  x@            Read file names to exclude from stdin
  x@<list>      Exclude files listed in specified list file
  y             Assume Yes on all queries
```

### unrar grammar
```
Usage:     unrar <command> -<switch 1> -<switch N> <archive> <files...>
               <@listfiles...> <path_to_extract\>
```

## Test
```sh
deno test --allow-run --allow-read --allow-write
```  