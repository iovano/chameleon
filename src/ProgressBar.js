const process = require("process")
const rdl = require("readline")

class ProgressBar {
    constructor(size) {
        this.size = size
        this.cursor = 0
        this.timer = null
    }
    start() {
        process.stdout.write("\x1B[?25l")
        process.stdout.write("[")
        for (let i = 0; i < this.size; i++) {
            process.stdout.write("-")
        }
        process.stdout.write("]")
        this.cursor = 1
        rdl.cursorTo(process.stdout, this.cursor, 0);
        this.timer = setInterval(() => {
            process.stdout.write("=")
            this.cursor++;
            if (this.cursor >= this.size) {
                clearTimeout(this.timer)
                process.stdout.write("\x1B[?25h")
            }
        }, 100)
    }
}

module.exports = ProgressBar;