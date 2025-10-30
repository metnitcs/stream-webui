const crypto = require('crypto');
const key = Buffer.from(process.env.STREAM_SECRET);
function encrypt(text){
  const iv = crypto.randomBytes(16);
  const c = crypto.createCipheriv('aes-256-cbc', key, iv);
  let enc = c.update(text, 'utf8'); enc = Buffer.concat([enc, c.final()]);
  return iv.toString('hex') + ':' + enc.toString('hex');
}
function decrypt(encText){
  const [ivHex,dataHex] = encText.split(':');
  const iv = Buffer.from(ivHex,'hex'); const data = Buffer.from(dataHex,'hex');
  const d = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let out = d.update(data); out = Buffer.concat([out, d.final()]);
  return out.toString('utf8');
}
module.exports = { encrypt, decrypt };
