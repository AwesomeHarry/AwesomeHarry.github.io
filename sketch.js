let samples = []
let active = []
let bg = []
let r = 5;
let cellSize = r / Math.sqrt(2);

let k = 30;

let columns, rows;

function setup() {
    createCanvas(windowWidth-1, windowHeight-1);

    columns = floor(width / cellSize);
    rows = floor(height / cellSize);

    for (let i = 0; i < columns; i++) {
        bg[i] = new Array(rows);
        for (let j = 0; j < rows; j++) {
            bg[i][j] = -1;
        }
    }

    let initialPoint = createVector(random(width), random(height));
    let gridPos = createVector(floor(initialPoint.x / cellSize), floor(initialPoint.y / cellSize));
    bg[gridPos.x][gridPos.y] = initialPoint;
    active.push(initialPoint);
    samples.push(initialPoint);
}

function draw() {
    background(17);

    stroke(255);
    strokeWeight(10);

    for (let dens = 0; dens < 128; dens++) {
        if (active.length > 0) {
            let foundValid = false;

            let randomIndex = floor(random(active.length));
            let fromPoint = active[randomIndex];

            for (let attempts = 0; attempts < k; attempts++) {

                // Calculate new point
                let angle = random(TWO_PI);
                let radius = random(r, 2 * r);
                let x = fromPoint.x + radius * cos(angle);
                let y = fromPoint.y + radius * sin(angle);

                let newPoint = createVector(x, y);
                let newGridPos = createVector(floor(newPoint.x / cellSize), floor(newPoint.y / cellSize));
                if (inbounds(newGridPos)) {
                    let validPoint = true;

                    // Check Surrounding
                    for (let i = -1; i <= 1; i++) {
                        for (let j = -1; j <= 1; j++) {
                            let gridPos = createVector(newGridPos.x + i, newGridPos.y + j);
                            if (inbounds(gridPos)) {
                                let pointAt = bg[gridPos.x][gridPos.y];
                                if (pointAt !== -1) {
                                    let d = dist(pointAt.x, pointAt.y, newPoint.x, newPoint.y);
                                    if (d < r) {
                                        validPoint = false;
                                        break;
                                    }
                                }
                            }
                        }
                    }

                    if (validPoint) {
                        samples.push(newPoint);

                        bg[newGridPos.x][newGridPos.y] = newPoint;
                        active.push(newPoint);
                        foundValid = true;

                        break;
                    }
                }
            }

            if (!foundValid) {
                active.slice(randomIndex, 1);
            }
        }
    }

    // Draw
    fill(255);
    stroke(255);
    strokeWeight(2);

    bg.forEach(i => {
        i.forEach(j => {
            if (j !== -1) {
                // let p = samples[j];
                let p = j;
                point(p.x, p.y);
            }
        });
    });
}

function inbounds(gridPos) {
    return gridPos.x > 0 && gridPos.x < columns && gridPos.y > 0 && gridPos.y < rows;
}