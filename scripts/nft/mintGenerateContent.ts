import { toNano, beginCell, Address } from '@ton/core';
import { NftCollection } from '../../build/NftGenerateContent/tact_NftCollection';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    
    let init = provider.open(
        await NftCollection.fromAddress(
            Address.parse('EQAvycKhqPYHHkzxDmQr99EXz_tJycfMz3qPBPZefeU9V_aB') 
    ));

    await init.send(provider.sender(), { value: toNano("1") }, "Mint");
}
