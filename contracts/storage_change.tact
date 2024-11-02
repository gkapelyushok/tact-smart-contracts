import "@stdlib/deploy";

message Change {
    s: String;
}

contract StorageChange with Deployable {
    s: String;

    init() {
        self.s = "";
    }

    receive(msg: Change) {
        self.s = msg.s;
    }

    get fun s(): String {
        return self.s;
    }
}