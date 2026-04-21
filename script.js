const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const player = {
    x: 100,
    y: 150,
    width: 40,
    height: 40,
    speed: 200,
};

let woodCount = 0;
let lastTime = 0;
let enemySpawnTimer = 0;
let playerHealth = 100;
let damageCooldown = 0;
const damageCooldownDuration = 1;
let isGameOver = false;
let facingX = 1;
let facingY = 0;

const keys = {};

window.addEventListener("keydown", (e) => {
    keys[e.key] = true;
    if (isGameOver && e.key.toLowerCase() === "r") {
        restartGame();
    }
    if (!isGameOver && e.key === " ") {
        shootProjectile();
    }
});

window.addEventListener("keyup", (e) => {
    keys[e.key] = false;
});

function update(deltaTime) {
    if (isGameOver) return;
    updatePlayer(deltaTime);
    updateTrees();
    updatePlayerDamageCooldown(deltaTime);
    updateEnemies(deltaTime);
    updateProjectiles(deltaTime);
    handleProjectileEnemyCollisions();
    updateEnemySpawning(deltaTime);
}

function restartGame() {
    player.x = 100;
    player.y = 150;
    woodCount = 0;
    playerHealth = 100;
    damageCooldown = 0;
    enemySpawnTimer = 0;
    isGameOver = false;
    trees.length = 0;
    for (let i = 0; i < 5; i++) {
        trees.push(createTree());
    }
    enemies.length = 0;
    for (let i = 0; i < 3; i++) {
        enemies.push(createEnemy());
    }
    for (let key in keys) {
        keys[key] = false;
    }
    projectiles.length = 0;
}

function updatePlayer(deltaTime) {
    if (keys["ArrowRight"]) {
        player.x += player.speed * deltaTime;
        facingX = 1;
        facingY = 0;
    }

    if (keys["ArrowLeft"]) {
        player.x -= player.speed * deltaTime;
        facingX = -1;
        facingY = 0;
    }
    if (keys["ArrowUp"]) {
        player.y -= player.speed * deltaTime;
        facingX = 0;
        facingY = -1;
    }
    if (keys["ArrowDown"]) {
        player.y += player.speed * deltaTime;
        facingX = 0;
        facingY = 1;
    }

    keepPlayerInBounds();
}

function updateTrees() {
    for (let i = 0; i < trees.length; i++) {
        if (isColliding(player, trees[i])) {
            woodCount += 1;
            trees[i] = createTree();
        }
    }
}

function updateEnemies(deltaTime) {
    for (let enemy of enemies) {
        const playerCenterX = player.x + player.width / 2;
        const playerCenterY = player.y + player.height / 2;
        const enemyCenterX = enemy.x + enemy.width / 2;
        const enemyCenterY = enemy.y + enemy.height / 2;
        let dx = playerCenterX - enemyCenterX;
        let dy = playerCenterY - enemyCenterY;
        let distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > 0) {
            dx /= distance;
            dy /= distance;
        }
        enemy.x += dx * enemy.speed * deltaTime;
        enemy.y += dy * enemy.speed * deltaTime;
        if (isColliding(player, enemy)) {
            damagePlayer(25);
        }
    }
}

function updateEnemySpawning(deltaTime) {
    enemySpawnTimer += deltaTime;
    if (enemySpawnTimer >= 2 && enemies.length < 20) {
        enemies.push(createEnemy());
        enemySpawnTimer = 0;
    }
}

function updatePlayerDamageCooldown(deltaTime) {
    if (damageCooldown > 0) {
        damageCooldown -= deltaTime;
        if (damageCooldown < 0) {
            damageCooldown = 0;
        }
    }
}

function damagePlayer(amount) {
    if (damageCooldown > 0 || isGameOver) return;
    playerHealth -= amount;
    if (playerHealth <= 0) {
        playerHealth = 0;
        isGameOver = true;
    }
    damageCooldown = damageCooldownDuration;
}

function shootProjectile() {
    const projectileSize = 10;
    const playerCenterX = player.x + player.width / 2;
    const playerCenterY = player.y + player.height / 2;
    projectiles.push({
        x: playerCenterX - projectileSize / 2,
        y: playerCenterY - projectileSize / 2,
        width: projectileSize,
        height: projectileSize,
        speed: 400,
        dx: facingX,
        dy: facingY,
    });
}

function updateProjectiles(deltaTime) {
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const projectile = projectiles[i];
        projectile.x += projectile.dx * projectile.speed * deltaTime;
        projectile.y += projectile.dy * projectile.speed * deltaTime;
        const isOffScreen =
            projectile.x + projectile.width < 0 ||
            projectile.x > canvas.width ||
            projectile.y + projectile.height < 0 ||
            projectile.y > canvas.height;
        if (isOffScreen) {
            projectiles.splice(i, 1);
        }
    }
}

function handleProjectileEnemyCollisions() {
    for (let i = projectiles.length - 1; i >= 0; i--) {
        for (let j = enemies.length - 1; j >= 0; j--) {
            if (isColliding(projectiles[i], enemies[j])) {
                projectiles.splice(i, 1);
                enemies.splice(j, 1);
                break;
            }
        }
    }
}

function draw() {
    clearScreen();
    drawBorder();
    drawPlayer();
    drawTrees();
    drawEnemies();
    drawUI();
    drawProjectiles();
    if (isGameOver) {
        drawGameOverScreen();
    }
}

function clearScreen() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function drawPlayer() {
    if (damageCooldown > 0) {
        ctx.fillStyle = "yellow";
    } else {
        ctx.fillStyle = "lime";
    }
    ctx.fillRect(player.x, player.y, player.width, player.height);
}

function drawTrees() {
    ctx.fillStyle = "brown";

    for (let tree of trees) {
        ctx.fillRect(tree.x, tree.y, tree.width, tree.height);
    }
}

function drawEnemies() {
    ctx.fillStyle = "red";
    for (let enemy of enemies) {
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
    }
}

function drawBorder() {
    ctx.strokeStyle = "blue";
    ctx.lineWidth = 4;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
}

function drawUI() {
    ctx.fillStyle = "grey";
    ctx.font = "20px Arial";
    ctx.fillText("Wood: " + woodCount, 20, 30);
    ctx.fillText("Health: " + playerHealth, 20, 60);
}

function drawGameOverScreen() {
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    ctx.font = "48px Arial";
    ctx.textAlign = "center";
    ctx.fillText(
        "Final Wood: " + woodCount,
        canvas.width / 2,
        canvas.height / 2 + 20,
    );
    ctx.fillText(
        "Press R to Restart",
        canvas.width / 2,
        canvas.height / 2 + 65,
    );
    ctx.textAlign = "left";
}

function drawProjectiles() {
    ctx.fillStyle = "cyan";
    for (let projectile of projectiles) {
        ctx.fillRect(
            projectile.x,
            projectile.y,
            projectile.width,
            projectile.height,
        );
    }
}

function keepPlayerInBounds() {
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvas.width) {
        player.x = canvas.width - player.width;
    }

    if (player.y < 0) player.y = 0;
    if (player.y + player.height > canvas.height) {
        player.y = canvas.height - player.height;
    }
}

function isColliding(a, b) {
    return (
        a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y
    );
}

function createTree() {
    const tree = {
        width: 25,
        height: 25,
        x: 0,
        y: 0,
    };

    do {
        tree.x = Math.random() * (canvas.width - tree.width);
        tree.y = Math.random() * (canvas.height - tree.height);
    } while (isColliding(player, tree));

    return tree;
}

const trees = [];
for (let i = 0; i < 5; i++) {
    trees.push(createTree());
}

const enemies = [];
for (let i = 0; i < 3; i++) {
    enemies.push(createEnemy());
}
const projectiles = [];
function createEnemy() {
    const enemy = {
        x: 0,
        y: 0,
        width: 30,
        height: 30,
        speed: 50,
    };
    do {
        enemy.x = Math.random() * (canvas.width - enemy.width);
        enemy.y = Math.random() * (canvas.height - enemy.height);
    } while (isColliding(player, enemy));
    return enemy;
}

function gameLoop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const deltaTime = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    update(deltaTime);
    draw();

    requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
