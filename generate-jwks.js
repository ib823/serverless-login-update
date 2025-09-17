const { generateKeyPair, exportJWK } = require('jose');

async function generateKeys() {
  const { privateKey, publicKey } = await generateKeyPair('RS256');
  const privateJWK = await exportJWK(privateKey);
  const publicJWK = await exportJWK(publicKey);
  
  privateJWK.kid = 'kid-2025-01';
  privateJWK.alg = 'RS256';
  publicJWK.kid = 'kid-2025-01';
  publicJWK.alg = 'RS256';
  
  console.log('JWK_PRIVATE_CURRENT=' + "'" + JSON.stringify(privateJWK) + "'");
  console.log('JWK_PUBLIC_CURRENT=' + "'" + JSON.stringify(publicJWK) + "'");
}

generateKeys();
