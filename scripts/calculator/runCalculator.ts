import { Calculator } from '../../wrappers/Calculator';
import { NetworkProvider } from '@ton/blueprint';
import { Address} from '@ton/core';

export async function run(provider: NetworkProvider) {
    const contractAddress = Address.parse('EQBAGhZgtQjb53KxamuN_cXTl4Wr-XdW8aVuSBEdnjBu7FwR');
    const calculator = provider.open(Calculator.fromAddress(contractAddress));

    const sumResult = await calculator.getSum(BigInt(5), BigInt(2));
    console.log('Sum(5, 2) = ', sumResult);

    const subResult = await calculator.getSub(BigInt(5), BigInt(2));
    console.log('Sub(5, 2) = ', subResult);

    const mulResult = await calculator.getMul(BigInt(5), BigInt(2));
    console.log('Mul(5, 2) = ', mulResult);

    const divResult = await calculator.getDiv(BigInt(5), BigInt(2));
    console.log('Div(5, 2) = ', divResult);

    const absResult = await calculator.getAbs(BigInt(-5));
    console.log('Abs(-5) = ', absResult);

    const modResult = await calculator.getMod(BigInt(5), BigInt(2));
    console.log('Mod(5, 2) = ', modResult);

    const andResult = await calculator.getAnd(BigInt(5), BigInt(2));
    console.log('And(5, 2) = ', andResult);

    const orResult = await calculator.getOr(BigInt(5), BigInt(2));
    console.log('Or(5, 2) = ', orResult);
}
