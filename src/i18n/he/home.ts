import { home as sourceHome } from '../../data/site';

type LocalizedShape<T> =
  T extends string ? string
    : T extends number | boolean | null | undefined ? T
      : T extends (...args: infer Args) => infer Result ? (...args: Args) => Result
        : T extends readonly (infer Item)[] ? readonly LocalizedShape<Item>[]
          : T extends object ? { [Key in keyof T]: LocalizedShape<T[Key]> }
            : T;

export type HomeContent = LocalizedShape<typeof sourceHome>;

/** Existing Hebrew copy remains the editorial source of truth. */
export const home = sourceHome satisfies HomeContent;
