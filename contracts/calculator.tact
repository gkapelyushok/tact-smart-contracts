import "@stdlib/deploy";

contract Calculator with Deployable {
    i: Int as int256;

    init() {
        self.i = 0;
    }

    get fun sum(a: Int, b: Int): Int {
        return a + b;
    }

    get fun sub(a: Int, b: Int): Int {
        return a - b;
    }

    get fun mul(a: Int, b: Int): Int {
        return a * b;
    }

    get fun div(a: Int, b: Int): Int {
        return a / b;
    }

    get fun abs(a: Int): Int {
        return abs(a);
    }

    get fun mod(a: Int, b: Int): Int {
        return a % b;
    }

    get fun and(a: Int, b: Int): Int {
        return a & b;
    }

    get fun or(a: Int, b: Int): Int {
        return a | b;
    }
}
