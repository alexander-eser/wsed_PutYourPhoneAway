const canvasWrapper = {
    screen: {
        elem: null,
        callback: null,
        ctx: null,
        width: 0,
        height: 0,
        left: 0,
        top: 0,
        init(id, callback, initRes) {
            this.elem = document.getElementById(id);
            this.callback = callback || null;
            if (this.elem.tagName === "CANVAS") this.ctx = this.elem.getContext("2d");

            window.addEventListener('resize', function () {
                this.resize();
            }.bind(this), false);


            this.elem.onselectstart = () => false;
            this.elem.ondrag = () => false;

            initRes && this.resize();
            return this;
        },
        resize() {
            let o = this.elem;
            this.width = o.offsetWidth;
            this.height = o.offsetHeight;
            for (this.left = 0, this.top = 0; o != null; o = o.offsetParent) {
                this.left += o.offsetLeft;
                this.top += o.offsetTop;
            }
            if (this.ctx) {
                this.elem.width = this.width;
                this.elem.height = this.height;
            }
            this.callback && this.callback();
        }
    }
};

class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.magnitude = x * x + y * y;
        this.computed = 0;
        this.force = 0;
    }

    delta(p) {
        return new Point(p.x - this.x, p.y - this.y);
    }

    add(p) {
        return new Point(this.x + p.x, this.y + p.y);
    }

    multiply(p) {
        return new Point(this.x * p.x, this.y * p.y);
    }

    norm() {
        const m = Math.sqrt(this.magnitude);
        if (m > 0) return this.multiply(new Point(1/m,1/m));
        return new Point(0,0);
    }
}

class Bubble {
    constructor(parent, isDeviceBubble, data) {
        this.data = data;
        const min = .1;
        const max = 1.5;
        this.parent = parent;
        this.isDeviceBubble = isDeviceBubble;

        this.vel = new Point(
            (Math.random() > 0.5 ? 1 : -1) * (0.2 + Math.random() * 0.25),
            (Math.random() > 0.5 ? 1 : -1) * (0.2 + Math.random())
        );

        this.pos = isDeviceBubble ? new Point(
            parent.width * 0.2 + Math.random() * parent.width * 0.6,
            parent.height * 0.2 + Math.random() * parent.height * 0.6
        ) : parent.getDeviceBubblePosition();

        if (isDeviceBubble) {
            this.size = 120;
        } else {
            this.size = 50;
        }

        this.width = parent.width;
        this.height = parent.height;
    }

    move() {
        // bounce borders
        if (this.pos.x >= this.width - this.size) {
            if (this.vel.x > 0) this.vel.x = -this.vel.x;
            this.pos.x = this.width - this.size;
        } else if (this.pos.x <= this.size) {
            if (this.vel.x < 0) this.vel.x = -this.vel.x;
            this.pos.x = this.size;
        }

        if (this.pos.y >= this.height - this.size) {
            if (this.vel.y > 0) this.vel.y = -this.vel.y;
            this.pos.y = this.height - this.size;
        } else if (this.pos.y <= this.size) {
            if (this.vel.y < 0) this.vel.y = -this.vel.y;
            this.pos.y = this.size;
        }

        if (!this.isDeviceBubble && !this.parent.alive) {
            const parentPos = this.parent.getDeviceBubblePosition();
            const delta = new Point(
                parentPos.x - this.pos.x,
                parentPos.y - this.pos.y,
            );
            this.vel = delta.norm().multiply(new Point(2,2))
        }

        // velocity
        this.pos = this.pos.add(this.vel);
    }
}

class DeviceCanvas {
    constructor(width, height, color) {
        console.log(`[DeviceCanvas]: ${width}, ${height}, ${color}`)
        this.alive = true;
        this.visible = true;
        this.step = 5;
        this.width = width;
        this.height = height;
        this.wh = Math.min(width, height);
        this.sx = Math.floor(this.width / this.step);
        this.sy = Math.floor(this.height / this.step);
        this.paint = false;
        /* this.metaFill = createRadialGradient(width, height, width, c0, c1); */
        this.metaFill = color;
        this.plx = [0, 0, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 0, 0];
        this.ply = [0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 0, 1, 0, 1];
        this.mscases = [0, 3, 0, 3, 1, 3, 0, 3, 2, 2, 0, 2, 1, 1, 0];
        this.ix = [1, 0, -1, 0, 0, 1, 0, -1, -1, 0, 1, 0, 0, 1, 1, 0, 0, 0, 1, 1];
        this.grid = [];
        this.balls = [];
        this.iter = 0;
        this.sign = 1;

        // init grid
        this.grid = new Array((this.sx + 2) * (this.sy + 2)).fill(0)
            .map((_, i) => new Point(
                (i % (this.sx + 2)) * this.step,
                (Math.floor(i / (this.sx + 2))) * this.step
            ));

        this.balls.push(new Bubble(this, true));
    }

    getDeviceBubblePosition() {
        return this.balls[0].pos;
    }

    addBubble(data) {
        this.balls.push(new Bubble(this, false, data));
    }

    setAlive(isAlive) {
        console.log(`Alive: ${isAlive}`)
        if (isAlive) this.visible = true;
        this.alive = isAlive;
    }

    // Compute cell force
    computeForce(x, y, idx) {
        let force;
        const id = idx || x + y * (this.sx + 2);

        if (x === 0 || y === 0 || x === this.sx || y === this.sy) {
            force = 0.1 * this.sign;
        } else {
            force = 0;
            const cell = this.grid[id];
            let i = 0;
            let ball;
            while (ball = this.balls[i++]) {
                force += ball.size * ball.size / (-2 * cell.x * ball.pos.x - 2 * cell.y * ball.pos.y + ball.pos.magnitude + cell.magnitude);
            }
            force *= this.sign;
        }
        this.grid[id].force = force;
        return force;
    };

    marchingSquares(next) {
        var x = next[0];
        var y = next[1];
        var pdir = next[2];
        var id = x + y * (this.sx + 2);
        if (this.grid[id].computed === this.iter) {
            return false;
        }
        var dir, mscase = 0;

        // neighbors force
        for (var i = 0; i < 4; i++) {
            var idn = (x + this.ix[i + 12]) + (y + this.ix[i + 16]) * (this.sx + 2);
            var force = this.grid[idn].force;
            if ((force > 0 && this.sign < 0) || (force < 0 && this.sign > 0) || !force) {
                // compute force if not in buffer
                force = this.computeForce(
                    x + this.ix[i + 12],
                    y + this.ix[i + 16],
                    idn
                );
            }
            if (Math.abs(force) > 1) mscase += Math.pow(2, i);
        }
        if (mscase === 15) {
            // inside
            return [x, y - 1, false];
        } else {
            // ambiguous cases
            if (mscase === 5) dir = (pdir === 2) ? 3 : 1;
            else if (mscase === 10) dir = (pdir === 3) ? 0 : 2;
            else {
                // lookup
                dir = this.mscases[mscase];
                this.grid[id].computed = this.iter;
            }
            // draw line
            var ix = this.step / (
                Math.abs(Math.abs(this.grid[(x + this.plx[4 * dir + 2]) + (y + this.ply[4 * dir + 2]) * (this.sx + 2)].force) - 1) /
                Math.abs(Math.abs(this.grid[(x + this.plx[4 * dir + 3]) + (y + this.ply[4 * dir + 3]) * (this.sx + 2)].force) - 1) + 1
            );
            ctx.lineTo(
                this.grid[(x + this.plx[4 * dir]) + (y + this.ply[4 * dir]) * (this.sx + 2)].x + this.ix[dir] * ix,
                this.grid[(x + this.plx[4 * dir + 1]) + (y + this.ply[4 * dir + 1]) * (this.sx + 2)].y + this.ix[dir + 4] * ix
            );
            this.paint = true;
            // next
            return [
                x + this.ix[dir + 4],
                y + this.ix[dir + 8],
                dir
            ];
        }
    };

    renderBubbles() {
        if (!this.visible) return;

        const deviceBubblePos = this.getDeviceBubblePosition();
        if (!this.alive && this.balls.every(b => b.pos.delta(deviceBubblePos).magnitude < 10)){
            this.balls.splice(-1, Infinity);
            this.visible = false;
            return;
        }

        var i = 0, ball;
        while (ball = this.balls[i++]) ball.move();

        // reset grid
        this.iter++;
        this.sign = -this.sign;
        this.paint = false;
        ctx.fillStyle = this.metaFill;
        ctx.beginPath();
        // compute bubbles
        i = 0;
        //ctx.shadowBlur = 50;
        //ctx.shadowColor = "green";
        while (ball = this.balls[i++]) {
            // first cell
            var next = [
                Math.round(ball.pos.x / this.step),
                Math.round(ball.pos.y / this.step), false
            ];
            // marching squares
            do {
                next = this.marchingSquares(next);
            } while (next);
            // fill and close path
            if (this.paint) {
                ctx.fill();
                ctx.closePath();
                ctx.beginPath();
                this.paint = false;
            }
        }
    };
}

const screen = canvasWrapper.screen.init("bubble", null, true);
const ctx = screen.ctx;
screen.resize();

const colors = ["#324e4b","#456c68","#549c9a", "#86aba1", "#b0b9a9"];
const devices = {};
const getOrCreateDevice = (address) => {
    let device = devices[address]
    if (!device) {
        const color = colors[Object.keys(devices).length % colors.length];
        device = new DeviceCanvas(screen.width, screen.height, color);
        devices[address] = device;
    }
    return device;
}

// main loop
const run = () => {
    requestAnimationFrame(run);
    ctx.clearRect(0, 0, screen.width, screen.height);

    // Render Bubbles for each DeviceCanvas
    Object.values(devices).forEach(lavaLamp => lavaLamp.renderBubbles())
};
run();

// Create a client instance
const client = new Paho.MQTT.Client("broker.hivemq.com", 8000, `bubbleClient${new Date().getTime()}`);

// set callback handlers
client.onConnectionLost = (responseObject) => {
    if (responseObject.errorCode !== 0) {
        console.log("onConnectionLost:" + responseObject.errorMessage);
    }
};

client.onMessageArrived = (message) => {
    console.log(JSON.parse(message.payloadString));
    const eventMessage = JSON.parse(message.payloadString);

    switch (eventMessage.event) {
        case 'esp32_client_connected':
        case 'ble_client_connected':
            if (eventMessage.device_address) {
                const device = getOrCreateDevice(eventMessage.device_address);
                device.setAlive(true);
                const audioPutIn = new Audio('../resources/Put_In_Smartphone.Wav');
                audioPutIn.play();
            }
            break;
        case 'notification_arrived':
            const device = getOrCreateDevice(eventMessage.device_address);
            device.setAlive(true);
            device.addBubble(eventMessage);
            break;
        case 'ble_client_disconnected':
            if (eventMessage.device_address) {
                const device = getOrCreateDevice(eventMessage.device_address);
                device.setAlive(false);
                const audioPutOut = new Audio('../resources/Put_Out_Smartphone.Wav');
                audioPutOut.play();
            }
            break;
    }
};

// connect the client
client.connect({
    onSuccess() {
        // Once a connection has been made, make a subscription and send a message.
        console.log("Connected to MQTT Broker");
        client.subscribe("8b4dac03-9840-46fb-8eaf-30bb4f4a8384");
    }
});
