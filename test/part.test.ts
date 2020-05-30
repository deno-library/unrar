import { Unrar } from '../mod.ts'
const { test } = Deno;
import {
  assert,
  assertEquals,
  assertThrowsAsync
} from "https://deno.land/std/testing/asserts.ts";
const decoder = new TextDecoder();

test('unrar part: no password should ok', async () => {
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
});

test('unrar part: with passowrd should ok', async () => {
  const src = './test/password.rar';
  const dest = './test';
  const password = '123456';
  const uncompressedFile = './test/password.txt';

  try {
    const unrar = new Unrar(src, password);
    const list = await unrar.list();
    assert(Array.isArray(list));
    unrar.on('progress', (percent: string) => {
      assert(percent.includes('%'));
    });
    await unrar.uncompress(list[0], dest);

    const data = Deno.readFileSync(uncompressedFile);
    const txt = decoder.decode(data);
    assert(txt === 'password');
    Deno.removeSync(uncompressedFile);
  } catch (error) {
    console.log(error)
    assert(false);
  }
});

test('unrar part: should throw error when opening password protected file without providing password', async function () {
  await assertThrowsAsync(
    async () => {
      const src = './test/password.rar';
      const dest = './test';

      const unrar = new Unrar(src);
      const list = await unrar.list();
    },
    Error,
    'Password protected file'
  );
});
