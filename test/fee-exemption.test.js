const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function loadFunction(name, dependencies = {}) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} mesti wujud dalam index.html`);
  const braceStart = source.indexOf('{', start);
  let depth = 0;
  let end = braceStart;
  for (; end < source.length; end += 1) {
    if (source[end] === '{') depth += 1;
    if (source[end] === '}' && --depth === 0) break;
  }
  const fnSource = source.slice(start, end + 1);
  return Function(...Object.keys(dependencies), `return (${fnSource});`)(...Object.values(dependencies));
}

test('keluarga dengan pengecualian disahkan berstatus dikecualikan dan tiada baki', () => {
  const famStatus = loadFunction('famStatus', { FAM_TARGET: 70 });

  assert.deepEqual(famStatus({ terkumpul: 0, pengecualian: { status: 'diluluskan' } }), {
    cls: 'dikecualikan', terkumpul: 0, baki: 0
  });
});

test('keluarga yang menunggu pengesahan masih tidak boleh dikira sebagai belum bayar biasa', () => {
  const famStatus = loadFunction('famStatus', { FAM_TARGET: 70 });

  assert.deepEqual(famStatus({ terkumpul: 0, pengecualian: { status: 'menunggu' } }), {
    cls: 'menunggu-pengecualian', terkumpul: 0, baki: 70
  });
});

test('ringkasan kelas mengeluarkan keluarga dikecualikan daripada sasaran, tetapi memaparkannya berasingan', () => {
  const start = source.indexOf('function ringkasanStatusKeluargaKelas(');
  assert.notEqual(start, -1, 'ringkasanStatusKeluargaKelas mesti wujud dalam index.html');
  const ringkasanStatusKeluargaKelas = loadFunction('ringkasanStatusKeluargaKelas', {
    famStatus: loadFunction('famStatus', { FAM_TARGET: 70 }),
    FAM_TARGET: 70
  });

  assert.deepEqual(ringkasanStatusKeluargaKelas([
    { terkumpul: 70 },
    { terkumpul: 0, pengecualian: { status: 'diluluskan' } },
    { terkumpul: 0 }
  ]), { lunas: 1, dikecualikan: 1, belumPenuh: 1, sasaran: 140 });
});
