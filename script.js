const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 40;
        this.speed = 200;
        this.health = 100;
        this.maxHealth = 100;
        this.damageCooldown = 0;
        this.damageCooldownDuration = 0.25;
    }
    update(deltaTime, keys, canvas) {
        if (keys["ArrowRight"]) this.x += this.speed * deltaTime;
        if (keys["ArrowLeft"]) this.x -= this.speed * deltaTime;
        if (keys["ArrowDown"]) this.y += this.speed * deltaTime;
        if (keys["ArrowUp"]) this.y -= this.speed * deltaTime;
        this.keepInBounds(canvas);
        this.updateDamageCooldown(deltaTime);
    }
    keepInBounds(canvas) {
        if (this.x < 0) this.x = 0;
        if (this.x + this.width > canvas.width) {
            this.x = canvas.width - this.width;
        }
        if (this.y < 0) this.y = 0;
        if (this.y + this.height > canvas.height) {
            this.y = canvas.height - this.height;
        }
    }
    updateDamageCooldown(deltaTime) {
        if (this.damageCooldown > 0) {
            this.damageCooldown -= deltaTime;
            if (this.damageCooldown < 0) {
                this.damageCooldown = 0;
            }
        }
    }
    takeDamage(amount) {
        if (this.damageCooldown > 0 || isGameOver) return;
        this.health -= amount;
        if (this.health <= 0) {
            this.health = 0;
            isGameOver = true;
        }
        this.damageCooldown = this.damageCooldownDuration;
    }
    draw(ctx) {
        if (this.damageCooldown > 0) {
            ctx.fillStyle = "yellow";
        } else {
            ctx.fillStyle = "lime";
        }
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}

class Projectile {
    constructor(x, y, dx, dy) {
        this.x = x;
        this.y = y;
        this.width = 10;
        this.height = 10;
        this.speed = 400;
        this.dx = dx;
        this.dy = dy;
    }
    update(deltaTime) {
        this.x += this.dx * this.speed * deltaTime;
        this.y += this.dy * this.speed * deltaTime;
    }
    draw(ctx) {
        ctx.fillStyle = "cyan";
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
    isOffScreen(canvas) {
        return (
            this.x + this.width < 0 ||
            this.x > canvas.width ||
            this.y + this.height < 0 ||
            this.y > canvas.height
        );
    }
}

const player = new Player(100, 150);

const upgrades = [
    {
        id: "attack_speed",
        name: "Faster Attacks",
        apply: function () {
            console.log(`Old attack speed: ${attackInterval}/second`);
            attackInterval *= 0.9;
            if (attackInterval < 0.1) attackInterval = 0.1;
            console.log(`New attack speed: ${attackInterval}/second`);
        },
    },
    {
        id: "move_speed",
        name: "Swiftboots",
        apply: function () {
            player.speed += 25;
        },
    },
    {
        id: "max_health",
        name: "More Health",
        apply: function () {
            player.health += 20;
            player.maxHealth += 20;
        },
    },
];

let woodCount = 0;
let lastTime = 0;
let enemySpawnTimer = 0;
let isGameOver = false;
let attackTimer = 0;
let attackInterval = 1.5;
let playerXp = 0;
let playerLevel = 1;
let xpToNextLevel = 10;
let isChoosingUpgrade = false;
let currentUpgradeChoices = [];

const keys = {};

window.addEventListener("keydown", (e) => {
    keys[e.key] = true;
    if (isGameOver && e.key.toLowerCase() === "r") {
        restartGame();
    }
    if (isChoosingUpgrade) {
        if (e.key === "1") chooseUpgrade(0);
        if (e.key === "2") chooseUpgrade(1);
        if (e.key === "3") chooseUpgrade(2);
        return;
    }
});

window.addEventListener("keyup", (e) => {
    keys[e.key] = false;
});

function update(deltaTime) {
    if (isGameOver) return;
    if (isChoosingUpgrade) return;
    player.update(deltaTime, keys, canvas);
    updateTrees();
    updateEnemies(deltaTime);
    updateProjectiles(deltaTime);
    handleProjectileEnemyCollisions();
    updateXpPickups();
    updateEnemySpawning(deltaTime);
    updateAutoAttack(deltaTime);
}

function restartGame() {
    player.x = 100;
    player.y = 150;
    woodCount = 0;
    player.maxHealth = 100;
    player.health = player.maxHealth;
    player.damageCooldown = 0;
    enemySpawnTimer = 0;
    isGameOver = false;
    trees.length = 0;
    playerXp = 0;
    xpPickups.length = 0;
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
    playerLevel = 1;
    xpToNextLevel = 10;
    isChoosingUpgrade = false;
    currentUpgradeChoices = [];
    attackInterval = 1.5;
    player.speed = 200;
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
            player.takeDamage(25);
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

function shootProjectile(target) {
    const playerCenterX = player.x + player.width / 2;
    const playerCenterY = player.y + player.height / 2;
    const targetCenterX = target.x + target.width / 2;
    const targetCenterY = target.y + target.height / 2;
    let dx = targetCenterX - playerCenterX;
    let dy = targetCenterY - playerCenterY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance === 0) return;
    dx /= distance;
    dy /= distance;
    projectiles.push(
        new Projectile(playerCenterX - 5, playerCenterY - 5, dx, dy),
    );
}

function updateProjectiles(deltaTime) {
    for (let i = projectiles.length - 1; i >= 0; i--) {
        projectiles[i].update(deltaTime);
        if (projectiles[i].isOffScreen(canvas)) {
            projectiles.splice(i, 1);
        }
    }
}

function handleProjectileEnemyCollisions() {
    for (let i = projectiles.length - 1; i >= 0; i--) {
        for (let j = enemies.length - 1; j >= 0; j--) {
            if (isColliding(projectiles[i], enemies[j])) {
                xpPickups.push(createXpPickup(enemies[j].x, enemies[j].y));
                projectiles.splice(i, 1);
                enemies.splice(j, 1);
                break;
            }
        }
    }
}

function updateAutoAttack(deltaTime) {
    attackTimer += deltaTime;
    if (attackTimer >= attackInterval) {
        const target = findNearestEnemy();
        if (!target) return;
        attackTimer = 0;
        shootProjectile(target);
    }
}

function findNearestEnemy() {
    if (enemies.length === 0) return null;
    let nearestEnemy = enemies[0];
    let nearestDistance = Infinity;
    const playerCenterX = player.x + player.width / 2;
    const playerCenterY = player.y + player.height / 2;
    for (let enemy of enemies) {
        const enemyCenterX = enemy.x + enemy.width / 2;
        const enemyCenterY = enemy.y + enemy.height / 2;
        const dx = enemyCenterX - playerCenterX;
        const dy = enemyCenterY - playerCenterY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestEnemy = enemy;
        }
    }
    return nearestEnemy;
}

function createXpPickup(x, y) {
    return {
        x: x,
        y: y,
        width: 12,
        height: 12,
        value: 1,
    };
}

function updateXpPickups() {
    for (let i = xpPickups.length - 1; i >= 0; i--) {
        if (isColliding(player, xpPickups[i])) {
            playerXp += xpPickups[i].value;
            xpPickups.splice(i, 1);
            checkLevelUp();
        }
    }
}

function checkLevelUp() {
    while (playerXp >= xpToNextLevel) {
        playerXp -= xpToNextLevel;
        playerLevel += 1;
        xpToNextLevel += 10;
        currentUpgradeChoices = getRandomUpgrades(3);
        isChoosingUpgrade = true;
    }
}

function getRandomUpgrades(count) {
    const shuffled = [...upgrades].sort(() => Math.random() - 0.5);
    return shuffled.splice(0, count);
}

function chooseUpgrade(index) {
    const chosenUpgrade = currentUpgradeChoices[index];
    if (!chosenUpgrade) return;
    chosenUpgrade.apply();
    currentUpgradeChoices = [];
    isChoosingUpgrade = false;
}

function draw() {
    clearScreen();
    drawBorder();
    player.draw(ctx);
    drawTrees();
    drawXpPickups();
    drawEnemies();
    drawUI();
    drawProjectiles();
    if (isGameOver) {
        drawGameOverScreen();
    }
    if (isChoosingUpgrade) {
        drawUpgradeMenu();
    }
}

function clearScreen() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
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
    ctx.fillText("Health: " + player.health, 20, 60);
    ctx.fillText("Player Level: " + playerLevel, 440, 30);
    ctx.fillText("XP: " + playerXp + " / " + xpToNextLevel, 480, 60);
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
    for (let projectile of projectiles) {
        projectile.draw(ctx);
    }
}

function drawXpPickups() {
    ctx.fillStyle = "gold";
    for (let pickup of xpPickups) {
        ctx.fillRect(pickup.x, pickup.y, pickup.width, pickup.height);
    }
}

function drawUpgradeMenu() {
    ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    ctx.font = "32px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Choose an Upgrade", canvas.width / 2, 120);
    ctx.font = "24px Arial";
    for (let i = 0; i < currentUpgradeChoices.length; i++) {
        const choice = currentUpgradeChoices[i];
        ctx.fillText(
            `${i + 1}. ${choice.name}`,
            canvas.width / 2,
            200 + i * 50,
        );
    }
    ctx.textAlign = "left";
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
const xpPickups = [];
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
