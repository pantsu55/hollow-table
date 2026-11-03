const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const name = process.argv[2], W = +process.argv[3], H = +process.argv[4];
  const b = await chromium.launch();
  const p = await b.newPage();
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.setContent('<canvas id="c" width="' + W + '" height="' + H + '"></canvas>');
  await p.addScriptTag({ content: fs.readFileSync(__dirname + '/lib.js', 'utf8') });
  await p.addScriptTag({ content: fs.readFileSync(__dirname + '/' + name + '.js', 'utf8') });
  const data = await p.evaluate(() => document.getElementById('c').toDataURL('image/jpeg', 0.88));
  fs.writeFileSync(__dirname + '/' + name + '.jpg', Buffer.from(data.split(',')[1], 'base64'));
  // prévia com grade, menor
  const prev = await p.evaluate(([W, H]) => { const c = document.getElementById('c'), o = document.createElement('canvas'); o.width = W / 2; o.height = H / 2; const x = o.getContext('2d'); x.drawImage(c, 0, 0, W / 2, H / 2); x.strokeStyle = 'rgba(255,255,255,.25)'; for (let i = 0; i <= W; i += 70) { x.beginPath(); x.moveTo(i / 2, 0); x.lineTo(i / 2, H / 2); x.stroke(); } for (let j = 0; j <= H; j += 70) { x.beginPath(); x.moveTo(0, j / 2); x.lineTo(W / 2, j / 2); x.stroke(); } return o.toDataURL('image/jpeg', 0.8); }, [W, H]);
  fs.writeFileSync(__dirname + '/' + name + '-prev.jpg', Buffer.from(prev.split(',')[1], 'base64'));
  console.log('ok', fs.statSync(__dirname + '/' + name + '.jpg').size);
  await b.close();
})();
