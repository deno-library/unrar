# unrar
uncompress rar file for deno

## Useage  
* upcompress all
```js
import EventEmitter from "https://raw.githubusercontent.com/fuxingZhang/deno-unrar/master/mod.ts";
const src = './test/password.rar';
const dest = './test';
const command = 'e';
const switches = ['-o+', '-idcd'];

(async () => {
  unrar.on('progress', percent => {
    console.log(percent);
  });

  await unrar.uncompress({
    src,
    dest,
    command,
    switches,
  });
})().catch(console.error);
```  

* uncompress part 
more exmaple in test folder
```ts
const src = './test/test.rar';
const dest = './test';
const uncompressedFile = './test/test2.txt';

try {
  const unrar = new Unrar(src);
  const list = await unrar.list();
  assert(Array.isArray(list));
  unrar.on('progress', (percent: string) => {
    assert(percent.includes('%'));
  });
  await unrar.uncompress(list[0], dest, {
    newName: 'test2.txt'
  });
  // or 
  // await unrar.uncompress(list[0], dest);

  const data = Deno.readFileSync(uncompressedFile);
  const txt = decoder.decode(data);
  console.log(txt)
  assert(txt === 'test');
  Deno.removeSync(uncompressedFile);
} catch (error) {
  console.log(error)
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

/**
 * uncompress .rar file
 *  - `src` source file path
 *  - `dest` destination folder path
 *  - `options` destination folder path
 *    - `command` command of unrar, default: x
 *    - `switches` switches of unrar, default: []
 */
export function uncompress(src: string, dest: string, options: Options): Promise<void>;

export function on(event: "progress", listener: (percent: string) => void): this;
```  
* uncompress part
```ts  
interface uncompressOptions {
  newName?: string
}
interface UnrarPart {
  constructor(filepath: string, password?: string);
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