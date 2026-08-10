const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Runtime counterpart to the locale bundle types.
 * TypeScript intentionally widens translated arrays, so this assertion also
 * enforces exact object keys and array lengths when locale content loads.
 */
export function assertContentCompleteness(
  source: unknown,
  translated: unknown,
  path = 'content'
): void {
  if (Array.isArray(source)) {
    if (!Array.isArray(translated)) {
      throw new Error(`${path}: expected an array`);
    }
    if (translated.length !== source.length) {
      throw new Error(
        `${path}: expected array length ${source.length}, received ${translated.length}`
      );
    }
    source.forEach((item, index) => {
      assertContentCompleteness(item, translated[index], `${path}[${index}]`);
    });
    return;
  }

  if (isRecord(source)) {
    if (!isRecord(translated)) {
      throw new Error(`${path}: expected an object`);
    }

    for (const key of Object.keys(source)) {
      if (!Object.hasOwn(translated, key)) {
        throw new Error(`${path}.${key}: missing key`);
      }
      assertContentCompleteness(source[key], translated[key], `${path}.${key}`);
    }

    for (const key of Object.keys(translated)) {
      if (!Object.hasOwn(source, key)) {
        throw new Error(`${path}.${key}: unexpected key`);
      }
    }
    return;
  }

  if (typeof translated !== typeof source) {
    throw new Error(
      `${path}: expected type ${typeof source}, received ${typeof translated}`
    );
  }
}
