/// <reference path="../libraries/p5/global.d.ts" />

const GRAVITY = { x: 0, y: 9.81 };
const TIME_SCALE = 1.0;
const SUB_STEPS = 2;
const WALL_RESTITUTION = 0.9;

const BALL_SIZE_MIN = 10;
const BALL_SIZE_MAX = 20;
const BALL_COUNT = 200;
const PART_SIZE = 55;

const DEBUG = {
    showGrid: true,
    showCellCounts: true,
    showVelocityLines: false,
    showBallCells: true,
    showBallIds: true
}

class Ball {
    constructor(position, velocity, radius, mass, color) {
        this.position = position || createVector(0, 0);
        this.velocity = velocity || createVector(0, 0);
        this.radius = radius || 50;
        this.mass = mass || 1;
        this.color = color || createVector(255, 255, 255);
        this.id = null;
    }

    move(ts) {
        // Apply Gravity
        let acceleration = createVector(GRAVITY.x, GRAVITY.y);
        this.velocity.add(p5.Vector.mult(acceleration, ts));
        this.position.add(p5.Vector.mult(this.velocity, ts));
    }

    handleEdgeCollisions(width, height) {
        // Check collisions with canvas edges and adjust velocity
        if (this.position.y + this.radius > height) {
            this.position.y = height - this.radius;
            this.velocity.y *= -WALL_RESTITUTION;
        }
        if (this.position.x + this.radius > width) {
            this.position.x = width - this.radius;
            this.velocity.x *= -WALL_RESTITUTION;
        }
        if (this.position.x - this.radius < 0) {
            this.position.x = this.radius;
            this.velocity.x *= -WALL_RESTITUTION;
        }
        if (this.position.y - this.radius < 0) {
            this.position.y = this.radius;
            this.velocity.y *= -WALL_RESTITUTION;
        }
    }

    draw() {
        fill(this.color.x, this.color.y, this.color.z);
        strokeWeight(0);
        stroke(color(255));
        circle(this.position.x, this.position.y, 2 * this.radius);

        if (DEBUG.showVelocityVectors) {
            stroke(0, 255, 0);
            strokeWeight(2);
            let velEnd = p5.Vector.add(this.position, p5.Vector.mult(this.velocity, 2));
            line(this.position.x, this.position.y, velEnd.x, velEnd.y);
        }

        if (DEBUG.showBallIds) {
            fill(255);
            stroke(0);
            strokeWeight(2);
            textAlign(CENTER, CENTER);
            textSize(8);
            text(this.id, this.position.x, this.position.y);
        }
    }
}

let partitions = {};
let balls = [];

function getCellIndices(position, radius) {
    // Get all cells that the ball might overlap with
    const minX = Math.floor((position.x - radius) / PART_SIZE);
    const maxX = Math.floor((position.x + radius) / PART_SIZE);
    const minY = Math.floor((position.y - radius) / PART_SIZE);
    const maxY = Math.floor((position.y + radius) / PART_SIZE);

    const indices = [];
    for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
            indices.push(`${x},${y}`);
        }
    }
    return indices;
}

function assignToGrid(balls) {
    partitions = {};
    balls.forEach(ball => {
        // Assign ball to all cells it might overlap
        const indices = getCellIndices(ball.position, ball.radius);
        indices.forEach(index => {
            if (!partitions[index]) {
                partitions[index] = [];
            }
            partitions[index].push(ball);
        });
    });
}

function resolveCollision(ball1, ball2) {
    // Find distance between balls
    let dir = p5.Vector.sub(ball2.position, ball1.position);
    let dist = dir.mag();
    let minDist = ball1.radius + ball2.radius;

    if (dist <= minDist && dist > 0) {
        let nor = dir.copy().normalize();

        // Correction
        let overlap = (minDist - dist) / 2;
        let correction = p5.Vector.mult(nor, overlap);
        ball1.position.sub(correction);
        ball2.position.add(correction);

        // Relative Velocity
        let relVel = p5.Vector.sub(ball2.velocity, ball1.velocity);
        let velAlongNormal = p5.Vector.dot(relVel, nor);

        if (velAlongNormal > 0) {
            return;
        }

        // Apply Impulse
        let e = 0.8;
        let j = -(1 + e) * velAlongNormal;
        j /= 1 / ball1.mass + 1 / ball2.mass;

        let impulse = p5.Vector.mult(nor, j);
        ball1.velocity.sub(p5.Vector.div(impulse, ball1.mass));
        ball2.velocity.add(p5.Vector.div(impulse, ball2.mass));
    }
}

function checkCollisions(partitions) {
    let checkedPairs = new Set();

    for (let cellKey in partitions) {
        let cell = partitions[cellKey];

        // Check collisions within the same cell
        for (let i = 0; i < cell.length; i++) {
            for (let j = i + 1; j < cell.length; j++) {
                let pair = [cell[i], cell[j]].sort((a, b) => a.id - b.id);
                let pairKey = `${pair[0].id}-${pair[1].id}`;

                if (!checkedPairs.has(pairKey)) {
                    checkedPairs.add(pairKey);
                    resolveCollision(cell[i], cell[j]);
                }
            }
        }
    }
}

function drawDebugGrid() {
    if (!DEBUG.showGrid) return;

    stroke(255, 255 / 10);
    strokeWeight(1);
    for (let x = 0; x < width; x += PART_SIZE) {
        line(x, 0, x, height);
    }
    for (let y = 0; y < height; y += PART_SIZE) {
        line(0, y, width, y);
    }

    for (let cellKey in partitions) {
        let [cellX, cellY] = cellKey.split(',').map(Number);
        let cell = partitions[cellKey];
        let centerX = cellX * PART_SIZE + PART_SIZE / 2;
        let centerY = cellY * PART_SIZE + PART_SIZE / 2;

        // Draw cell count
        if (DEBUG.showCellCounts) {
            let ballCount = cell.length;
            fill(255);
            stroke(0);
            strokeWeight(2);
            textAlign(CENTER, CENTER);
            textSize(14);
            text(ballCount, centerX, centerY);
        }

        // Color code cells based on ball count
        if (DEBUG.showBallCells) {
            noFill();
            let ballCount = cell.length;
            let sqrCol = lerp(0, 255, ballCount / BALL_COUNT);
            stroke(sqrCol, 255 - sqrCol, 0, 100);
            strokeWeight(2);
            rect(cellX * PART_SIZE, cellY * PART_SIZE, PART_SIZE, PART_SIZE);
        }
    }
}

function setup() {
    createCanvas(windowWidth, windowHeight);

    for (let i = 0; i < BALL_COUNT; i++) {
        makeNewRandomBall();
    }

    const resetBtn = select('#resetBtn');
    resetBtn.mousePressed(() => {
        balls = [];
        partitions = {};
        setup();
    });

    select('#debugShowGrid').changed(() => DEBUG.showGrid = select('#debugShowGrid').checked());
    select('#debugShowCellCounts').changed(() => DEBUG.showCellCounts = select('#debugShowCellCounts').checked());
    select('#debugShowVelocityVectors').changed(() => DEBUG.showVelocityVectors = select('#debugShowVelocityVectors').checked());
    select('#debugShowBallCells').changed(() => DEBUG.showBallCells = select('#debugShowBallCells').checked());
    select('#debugShowBallIds').changed(() => DEBUG.showBallIds = select('#debugShowBallIds').checked());
}

function draw() {
    const ts = (deltaTime / 100) * TIME_SCALE / SUB_STEPS;

    background(12);

    if (mouseIsPressed && !isMouseOverUI()) {
        let mousePos = createVector(mouseX, mouseY);
        balls.forEach(ball => {
            let direction = p5.Vector.sub(mousePos, ball.position);
            direction.normalize();
            direction.mult(5.0);
            ball.velocity.add(direction);
        });
    }

    assignToGrid(balls);
    drawDebugGrid();

    // Draw Balls
    balls.forEach(ball => {
        ball.move(ts);
        ball.handleEdgeCollisions(width, height);
        ball.draw();
    });

    // Check Collisions
    checkCollisions(partitions);
}

function makeNewRandomBall() {
    let ball = new Ball(
        createVector(random(width), random(height)),
        createVector(random(-15, 15), random(-15, 15)),
        random(BALL_SIZE_MIN, BALL_SIZE_MAX),
        1,
        createVector(random(255), random(255), random(255))
    );
    ball.id = balls.length;
    balls.push(ball);
}

function lerp(start, end, t) {
    return start * (1 - t) + end * t;
}

function isMouseOverUI() {
    const hoveredElement = document.elementFromPoint(mouseX, mouseY);
    return hoveredElement.closest('#ui') !== null;
}