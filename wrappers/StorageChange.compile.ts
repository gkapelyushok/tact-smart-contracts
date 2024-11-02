import { CompilerConfig } from '@ton/blueprint';

export const compile: CompilerConfig = {
    lang: 'tact',
    target: 'contracts/storage_change.tact',
    options: {
        debug: true,
    },
};
