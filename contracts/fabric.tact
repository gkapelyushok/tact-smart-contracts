import "@stdlib/deploy";

contract Child {
    seqno: Int;
    i: Int;

    init(seqno: Int) {
        self.seqno = seqno;
        self.i = 0;
    }

    receive("increment") {
        self.i = self.i + 1;
    }

    get fun i(): Int {
        return self.i;
    }
}

message IncrementChild {
    seqno: Int;
}

contract Parent with Deployable {
    numChildren: Int as uint64;

    init() {
        self.numChildren = 0;
    }

    receive("deploy child") {
        self.numChildren = self.numChildren + 1;
        let init: StateInit = initOf Child(self.numChildren);
        send(SendParameters{
            to: contractAddress(init),
            value: ton("0.1"),
            mode: SendIgnoreErrors,
            code: init.code,
            data: init.data,
        });
    }

    receive(msg: IncrementChild) {
        let init: StateInit = initOf Child(msg.seqno);
        send(SendParameters{
            to: contractAddress(init),
            value: ton("0.1"),
            mode: SendIgnoreErrors,
            code: init.code,
            data: init.data,
            body: "increment".asComment()    
        });
    }
}