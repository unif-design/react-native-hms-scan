import type { ScanFailure } from './types';

export class ScanError extends Error implements ScanFailure {
  readonly reason: ScanFailure['reason'];
  readonly sourceCode?: string;
  constructor(error: Readonly<ScanFailure>) {
    super(error.message);
    this.name = 'ScanError';
    this.reason = error.reason;
    this.sourceCode = error.sourceCode;
    Object.setPrototypeOf(this, ScanError.prototype);
  }
}
