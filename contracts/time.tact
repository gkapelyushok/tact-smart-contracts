import "@stdlib/deploy";

contract Time with Deployable {
    init() {}

    get fun timeUnix(): Int {
        return now();
    }

    get fun timeString(): String {
        let sb: StringBuilder = beginString();
        sb.append(now().toString());
        sb.append(" seconds elapsed since 1 January 1970");
        return sb.toString();
    }
}