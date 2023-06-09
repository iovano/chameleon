import process from "process";
import * as rdl from "readline";

export default class Consoler {
    messages = [];
    messagesAmount;
    rows = 0;

    static Reset = "\x1b[0m"
    static Bright = "\x1b[1m"
    static Dim = "\x1b[2m"
    static Underscore = "\x1b[4m"
    static Blink = "\x1b[5m"
    static Reverse = "\x1b[7m"
    static Hidden = "\x1B[?25l"
    static Show = "\x1B[?25h"

    static FgBlack = "\x1b[30m"
    static FgRed = "\x1b[31m"
    static FgGreen = "\x1b[32m"
    static FgYellow = "\x1b[33m"
    static FgBlue = "\x1b[34m"
    static FgMagenta = "\x1b[35m"
    static FgCyan = "\x1b[36m"
    static FgWhite = "\x1b[37m"
    static FgGray = "\x1b[90m"

    static BgBlack = "\x1b[40m"
    static BgRed = "\x1b[41m"
    static BgGreen = "\x1b[42m"
    static BgYellow = "\x1b[43m"
    static BgBlue = "\x1b[44m"
    static BgMagenta = "\x1b[45m"
    static BgCyan = "\x1b[46m"
    static BgWhite = "\x1b[47m"
    static BgGray = "\x1b[100m"

    constructor(messagesAmount = 5) {
        this.messagesAmount = messagesAmount;
        console.log();
    }
    expand(toRow) {
        if (toRow > this.rows) {
            /* make room for log area */
            for (let i = this.rows ; i < toRow ; i ++) {
                console.log();
            }
            this.rows = toRow;
        }
    }
    progressBar(done, total, size = 50, summary = true, style = {
        empty: Consoler.Dim + Consoler.FgRed, 
        emptyChar: '·' , 
        full: Consoler.Bright + Consoler.FgCyan, 
        fullChar: '░', 
        first: Consoler.Dim + '[', 
        last: Consoler.Dim + ']'}) 
        {
        let ratio = done / total * size;
        let text = style.first;
        text += style.full;
        let i = 1;
        for (; i <= ratio; i++) {
            text += style.fullChar;
        }
        text += style.empty;
        for (;i <= size; i++) {
            text += style.emptyChar;
        }
        text += Consoler.Reset + style.last + Consoler.Reset;
        if (summary) {
            text += Consoler.Dim+' ['+Consoler.Bright+done+Consoler.Dim+'/'+Consoler.Bright+total+Consoler.Dim+']'+Consoler.Reset;
        }
        return text;
    }
    write(message) {
        process.stdout.write(message);
    }
    cl() {
        process.stdout.clearLine();
    }
    nl() {
        this.write("\n");
    }
    error(message, line = undefined, payload = undefined) {
        this.log(Consoler.BgYellow+Consoler.FgRed+message+Consoler.Reset,line,payload);
    }
    success(message, line = undefined, payload = undefined) {
        this.log(Consoler.BgGreen+Consoler.FgBlack+message+Consoler.Reset, line, payload);
    }
    log(message, line = undefined, payload = undefined) {
        if (line === undefined) {
            this.nl();
            console.log(message);
            return;
        }
        //rdl.moveCursor(process.stdout, x, y);
        this.messages[line] = [message, payload];
        this.write(Consoler.Hidden);
        this.offsetY = process.stdout.rows;
        for (let i=0;i < this.messagesAmount; i++) {
            rdl.cursorTo(process.stdout,0,this.offsetY+i-this.messagesAmount);
            this.cl();
            this.write(this.messages[i]?.[0] || "");
        }
        this.write(Consoler.Show);
    }
}