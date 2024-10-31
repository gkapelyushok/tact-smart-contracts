import { CompilerConfig } from '@ton/blueprint';

export const compile: CompilerConfig = {
    lang: 'tact',
    target: 'contracts/calculator.tact',
    options: {
        debug: true,
    },
};
