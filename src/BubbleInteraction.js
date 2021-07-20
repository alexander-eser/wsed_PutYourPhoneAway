;(function () {

    "use strict";

    let lava0;
    let lava1;
    let lava2;
    let lava3;

    let canvasTag;

    var ge1doot = {
        screen: {
            elem: null,
            callback: null,
            ctx: null,
            width: 0,
            height: 0,
            left: 0,
            top: 0,
            init: function (id, callback, initRes) {
                this.elem = document.getElementById(id);
                this.callback = callback || null;
                if (this.elem.tagName === "CANVAS") this.ctx = this.elem.getContext("2d");

                window.addEventListener('resize', function () {
                    this.resize();
                }.bind(this), false);


                this.elem.onselectstart = function () {
                    return false;
                }

                this.elem.ondrag = function () {
                    return false;
                }

                initRes && this.resize();
                return this;
            },
            resize: function () {
                var o = this.elem;
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
    }

    // Point constructor
    var Point = function (x, y) {
        this.x = x;
        this.y = y;
        this.magnitude = x * x + y * y;
        this.computed = 0;
        this.force = 0;
    };
    Point.prototype.add = function (p) {
        return new Point(this.x + p.x, this.y + p.y);
    };

    // Ball constructor
    var Ball = function (parent) {
        var min = .1;
        var max = 1.5;
        this.vel = new Point(
            (Math.random() > 0.5 ? 1 : -1) * (0.2 + Math.random() * 0.25), (Math.random() > 0.5 ? 1 : -1) * (0.2 + Math.random())
        );
        this.pos = new Point(
            parent.width * 0.2 + Math.random() * parent.width * 0.6,
            parent.height * 0.2 + Math.random() * parent.height * 0.6
        );
        this.size = (parent.wh / 25) + (Math.random() * (max - min) + min) * (parent.wh / 25);
        this.width = parent.width;
        this.height = parent.height;

        /*    canvasTag = document.getElementById("bubble").getContext("2d");
            canvasTag.fillStyle = "#000";
            canvasTag.translate(50,50);
            canvasTag.arc(0,0,20,0,Math.PI*2);
            canvasTag.fill();

            // ctx.beginPath();
            canvasTag.strokeStyle = "#F00";
            canvasTag.arc(0,0,15,0,Math.PI*2);
            canvasTag.stroke();*/

    };

    // move balls
    Ball.prototype.move = function () {

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

        // velocity
        this.pos = this.pos.add(this.vel);

    };

    // lavalamp constructor
    const LavaLamp = function (width, height, color) {
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
        for (var i = 0; i < (this.sx + 2) * (this.sy + 2); i++) {
            this.grid[i] = new Point(
                (i % (this.sx + 2)) * this.step, (Math.floor(i / (this.sx + 2))) * this.step
            )
        }

   /*     // create bubbles
        for (var k = 0; k < numBalls; k++) {
            this.balls[k] = new Ball(this);
        }*/

    };
    // compute cell force
    LavaLamp.prototype.computeForce = function (x, y, idx) {

        var force;
        var id = idx || x + y * (this.sx + 2);

        if (x === 0 || y === 0 || x === this.sx || y === this.sy) {
            force = 0.6 * this.sign;
        } else {
            force = 0;
            var cell = this.grid[id];
            var i = 0;
            var ball;
            while (ball = this.balls[i++]) {
                force += ball.size * ball.size / (-2 * cell.x * ball.pos.x - 2 * cell.y * ball.pos.y + ball.pos.magnitude + cell.magnitude);
            }
            force *= this.sign
        }
        this.grid[id].force = force;
        return force;
    };

    // compute cell
    LavaLamp.prototype.marchingSquares = function (next) {
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

    LavaLamp.prototype.renderBubbles = function () {
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

    /*    // gradients
        var createRadialGradient = function (w, h, r, c0, c1) {
            var gradient = ctx.createRadialGradient(
                w / 1, h / 1, 0,
                w / 1, h / 1, r
            );
            gradient.addColorStop(0, c0);
            gradient.addColorStop(1, c1);
            return gradient;
        };*/

    // canvas
    var screen = ge1doot.screen.init("bubble", null, true),
        ctx = screen.ctx;
    screen.resize();
    // create LavaLamps
    const clients = {};

    // main loop
    var run = function () {
        requestAnimationFrame(run);
        ctx.clearRect(0, 0, screen.width, screen.height);


        Object.values(clients).forEach(client => client.renderBubbles())
    };



  /*  lava0 = new LavaLamp(screen.width, screen.height, 3, "#FFD850");
    lava1 = new LavaLamp(screen.width, screen.height, 3, "#FFA370");
    lava2 = new LavaLamp(screen.width, screen.height, 3, "#FF7D7D");
    lava3 = new LavaLamp(screen.width, screen.height, 3, "#05AFBA");*/

    //////////////
// Create a client instance
    const client = new Paho.MQTT.Client("broker.hivemq.com", 8000, "bubbleClient34526246");

// set callback handlers
    client.onConnectionLost = onConnectionLost;
    client.onMessageArrived = onMessageArrived;

// connect the client
    client.connect({onSuccess: onConnect});


// called when the client connects
    function onConnect() {
        // Once a connection has been made, make a subscription and send a message.
        console.log("onConnect");
        client.subscribe("8b4dac03-9840-46fb-8eaf-30bb4f4a8384");
    }

// called when the client loses its connection
    function onConnectionLost(responseObject) {
        if (responseObject.errorCode !== 0) {
            console.log("onConnectionLost:" + responseObject.errorMessage);
        }
    }

// called when a message arrives
    function onMessageArrived(message) {
        console.log(JSON.parse(message.payloadString));
        const eventMessage = JSON.parse(message.payloadString);

        switch (eventMessage.event) {
            case 'esp32_client_connected':
            case 'ble_client_connected':
                clients[eventMessage.device_address] = new LavaLamp(screen.width, screen.height, "#FFD850");

                break;
            case 'notification_arrived':

                break;

        }
    }
/////////////////////

    run();

})();