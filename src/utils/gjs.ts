/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { GObject } from '@gi.ext';

// Taken from https://github.com/material-shell/material-shell/blob/main/src/utils/gjs.ts
// Decorator function to call `GObject.registerClass` with the given class.
// Use like
// ```
// @registerGObjectClass
// export class MyThing extends GObject.Object { ... }
// ```
export function registerGObjectClass<
    K,
    // eslint-disable-next-line space-before-function-paren
    T extends { metaInfo?: any; new (...params: any[]): K },
>(target: T) {
    // Note that we use 'hasOwnProperty' because otherwise we would get inherited meta infos.
    // This would be bad because we would inherit the GObjectName too, which is supposed to be unique.
    if (Object.prototype.hasOwnProperty.call(target, 'metaInfo')) {
        // @ts-ignore
        return GObject.registerClass<K, T>(
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            target.metaInfo!,
            target,
        ) as typeof target;
    } else {
        // @ts-ignore
        return GObject.registerClass<K, T>(target) as typeof target;
    }
}
