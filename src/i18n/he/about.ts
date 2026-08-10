import { about as sourceAbout } from '../../data/about';

type LocalizedShape<T> =
  T extends string ? string
    : T extends number | boolean | null | undefined ? T
      : T extends (...args: infer Args) => infer Result ? (...args: Args) => Result
        : T extends readonly (infer Item)[] ? readonly LocalizedShape<Item>[]
          : T extends object ? { [Key in keyof T]: LocalizedShape<T[Key]> }
            : T;

export type AboutContent = LocalizedShape<typeof sourceAbout>;

/** Existing Hebrew copy remains the editorial source of truth. */
export const about = sourceAbout satisfies AboutContent;
