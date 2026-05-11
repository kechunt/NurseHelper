// Declaración de tipos para Angular Localize
declare global {
  function $localize(
    strings: readonly string[],
    ...expressions: readonly any[]
  ): string;

  namespace $localize {
    interface LocalizeFn {
      (strings: readonly string[], ...expressions: readonly any[]): string;
    }
  }
}

export {};
