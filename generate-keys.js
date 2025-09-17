const crypto = require('crypto');

function generateJWK() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });

  const pubKey = crypto.createPublicKey(publicKey);
  const privKey = crypto.createPrivateKey(privateKey);
  
  const pubJWK = pubKey.export({ format: 'jwk' });
  const privJWK = privKey.export({ format: 'jwk' });
  
  pubJWK.kid = 'kid-2025-01';
  pubJWK.alg = 'RS256';
  privJWK.kid = 'kid-2025-01';
  privJWK.alg = 'RS256';
  
  console.log('Add these to your .env.local file:');
  console.log('');
  console.log("JWK_PRIVATE_CURRENT='" + JSON.stringify(privJWK) + "'");
  console.log("JWK_PUBLIC_CURRENT='" + JSON.stringify(pubJWK) + "'");
}

generateJWK();
