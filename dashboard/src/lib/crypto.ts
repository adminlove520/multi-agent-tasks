import _sodium from "libsodium-wrappers";

/**
 * Encrypt a secret value for GitHub Actions using libsodium.
 */
export async function encryptSecret(publicKey: string, secretValue: string) {
  await _sodium.ready;
  const sodium = _sodium;

  // Convert the public key and secret to Uint8Array
  const binkey = sodium.from_base64(publicKey, sodium.base64_variants.ORIGINAL);
  const binsec = sodium.from_string(secretValue);

  // Encrypt the secret using the public key
  const encBytes = sodium.crypto_box_seal(binsec, binkey);

  // Convert the encrypted bytes to a base64 string
  return sodium.to_base64(encBytes, sodium.base64_variants.ORIGINAL);
}
