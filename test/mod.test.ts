import unrar from '../mod.ts';
import { UnrarAll } from '../mod.ts';
const { test } = Deno;
import {
  assert,
  assertEquals,
  assertThrowsAsync
} from "https://deno.land/std/testing/asserts.ts";
const decoder = new TextDecoder();

test('no passowrd should ok', async () => {
  const src = './test/test.rar';
  const dest = './test';
  const command = 'e';
  const switches = ['-o+', '-idcd'];
  const uncompressedFile = './test/test.txt';

  try {
    unrar.on('progress', (percent: string) => {
      assert(percent.includes('%'));
    });

    await unrar.uncompress(src, dest, {
      command,
      switches
    });

    const data = Deno.readFileSync(uncompressedFile);
    const txt = decoder.decode(data);
    assert(txt === 'test');
    Deno.removeSync(uncompressedFile);
  } catch (error) {
    assert(false);
  }
});

test('with passowrd should ok', async () => {
  const src = './test/password.rar';
  const dest = './test';
  const command = 'e';
  const password = '123456';
  const switches = [`-p${password}`, '-o+', '-idcd'];
  const uncompressedFile = './test/password.txt';

  try {
    unrar.on('progress', (percent: string) => {
      assert(percent.includes('%'));
    });

    await unrar.uncompress(src, dest, {
      command,
      switches
    });

    const data = Deno.readFileSync(uncompressedFile);
    const txt = decoder.decode(data);
    assert(txt === 'password');
    Deno.removeSync(uncompressedFile);
  } catch (error) {
    assert(false);
  }
});

test('should throw error when opening password protected file without providing password', async function () {
  await assertThrowsAsync(
    async () => {
      const src = './test/password.rar';
      const dest = './test';
      const command = 'e';
      const switches = ['-o+', '-idcd'];

      unrar.on('progress', (percent: string) => {
        assert(percent.includes('%'));
      });

      await unrar.uncompress(src, dest, {
        command,
        switches
      });
    },
    Error,
    'Password protected file'
  );
});

test('pass bin parameter should ok', async () => {
  const src = './test/test.rar';
  const dest = './test';
  const command = 'e';
  const bin = "./bin/UnRAR.exe";
  const switches = ['-o+', '-idcd'];
  const uncompressedFile = './test/test.txt';
  const unrar = new UnrarAll(bin);
  try {
    unrar.on('progress', (percent: string) => {
      assert(percent.includes('%'));
    });

    await unrar.uncompress(src, dest, {
      command,
      switches
    });

    const data = Deno.readFileSync(uncompressedFile);
    const txt = decoder.decode(data);
    assert(txt === 'test');
    Deno.removeSync(uncompressedFile);
  } catch (error) {
    assert(false);
  }
});