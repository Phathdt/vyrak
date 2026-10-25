/**
 * Simple logger for bootstrap phase (before DI container is ready)
 * Framework-agnostic - no dependencies on NestJS or other logging libraries
 */
export class BootstrapLogger {
  private static readonly prefix = '[CustomConfig]'

  static log(message: string): void {
    console.log(`${this.prefix} ${message}`)
  }

  static error(message: string): void {
    console.error(`${this.prefix} ${message}`)
  }
}
