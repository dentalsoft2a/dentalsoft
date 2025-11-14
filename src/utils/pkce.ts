export class PKCEGenerator {
  static generateCodeVerifier(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return this.base64URLEncode(array);
  }

  static async generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return this.base64URLEncode(new Uint8Array(hash));
  }

  private static base64URLEncode(buffer: Uint8Array): string {
    const base64 = btoa(String.fromCharCode(...buffer));
    return base64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  static storeVerifier(verifier: string): void {
    sessionStorage.setItem('dscore_code_verifier', verifier);
  }

  static getVerifier(): string | null {
    return sessionStorage.getItem('dscore_code_verifier');
  }

  static clearVerifier(): void {
    sessionStorage.removeItem('dscore_code_verifier');
  }
}
