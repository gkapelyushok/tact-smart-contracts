import { CompilerConfig } from '@ton/blueprint';

export const compile: CompilerConfig = {
    lang: 'tact',
    target: 'contracts/weight_staking.tact',
    options: {
        debug: true,
    },
};
