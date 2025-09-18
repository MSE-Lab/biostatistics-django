class GaltonBoard {
    constructor() {
        this.canvas = document.getElementById('galtonCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.distributionChart = null;
        
        // 画布尺寸
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        
        // 模拟参数
        this.ballCount = 200;
        this.pegLayers = 12;
        this.animationSpeed = 5;
        
        // 物理参数
        this.gravity = 0.15;  // 减小重力，让小球下落更稳定
        this.ballRadius = 3;
        this.pegRadius = 4;
        this.bounceReduction = 0.8;
        
        // 状态管理
        this.isRunning = false;
        this.isPaused = false;
        this.balls = [];
        this.pegs = [];
        this.bins = [];
        this.binCounts = [];
        
        // 统计数据
        this.droppedCount = 0;
        this.collectedCount = 0;
        this.statistics = {
            mean: 0,
            std: 0,
            skewness: 0,
            kurtosis: 0
        };
        
        this.init();
    }
    
    init() {
        this.setupCanvas();
        this.setupControls();
        this.setupPegs();
        this.setupBins();
        this.setupChart();
        this.draw();
    }
    
    setupCanvas() {
        // 响应式画布
        const container = this.canvas.parentElement;
        const containerWidth = container.clientWidth;
        this.canvas.style.width = '100%';
        this.canvas.style.height = 'auto';
    }
    
    setupControls() {
        // 参数控制
        const ballCountSlider = document.getElementById('ballCount');
        const pegLayersSlider = document.getElementById('pegLayers');
        const animationSpeedSlider = document.getElementById('animationSpeed');
        
        ballCountSlider.addEventListener('input', (e) => {
            this.ballCount = parseInt(e.target.value);
            document.getElementById('ballCountValue').textContent = this.ballCount;
        });
        
        pegLayersSlider.addEventListener('input', (e) => {
            this.pegLayers = parseInt(e.target.value);
            document.getElementById('pegLayersValue').textContent = this.pegLayers;
            this.setupPegs();
            this.setupBins();
            this.draw();
        });
        
        animationSpeedSlider.addEventListener('input', (e) => {
            this.animationSpeed = parseInt(e.target.value);
            document.getElementById('animationSpeedValue').textContent = this.animationSpeed;
        });
        
        // 控制按钮
        document.getElementById('startBtn').addEventListener('click', () => this.start());
        document.getElementById('pauseBtn').addEventListener('click', () => this.pause());
        document.getElementById('resetBtn').addEventListener('click', () => this.reset());
    }
    
    setupPegs() {
        this.pegs = [];
        const startX = this.width / 2;
        const startY = 80;
        const layerHeight = (this.height - 200) / this.pegLayers;
        
        for (let layer = 0; layer < this.pegLayers; layer++) {
            const pegsInLayer = layer + 1;
            const spacing = Math.min(40, (this.width - 100) / (pegsInLayer + 1));
            const layerY = startY + layer * layerHeight;
            
            for (let peg = 0; peg < pegsInLayer; peg++) {
                const pegX = startX - (pegsInLayer - 1) * spacing / 2 + peg * spacing;
                this.pegs.push({
                    x: pegX,
                    y: layerY,
                    radius: this.pegRadius
                });
            }
        }
    }
    
    setupBins() {
        this.bins = [];
        this.binCounts = [];
        const binCount = this.pegLayers + 1;
        const binWidth = (this.width - 100) / binCount;
        const binHeight = 100;
        const startX = 50;
        const startY = this.height - binHeight - 20;
        
        for (let i = 0; i < binCount; i++) {
            this.bins.push({
                x: startX + i * binWidth,
                y: startY,
                width: binWidth,
                height: binHeight,
                index: i
            });
            this.binCounts[i] = 0;
        }
    }
    
    setupChart() {
        const ctx = document.getElementById('distributionChart').getContext('2d');
        
        this.distributionChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Array.from({length: this.pegLayers + 1}, (_, i) => i.toString()),
                datasets: [{
                    label: '小球数量',
                    data: new Array(this.pegLayers + 1).fill(0),
                    backgroundColor: 'rgba(13, 110, 253, 0.6)',
                    borderColor: 'rgba(13, 110, 253, 1)',
                    borderWidth: 1
                }, {
                    label: '理论正态分布',
                    data: this.calculateTheoreticalDistribution(),
                    type: 'line',
                    backgroundColor: 'rgba(220, 53, 69, 0.2)',
                    borderColor: 'rgba(220, 53, 69, 1)',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: '频数'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: '收集槽位置'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    }
                }
            }
        });
    }
    
    calculateTheoreticalDistribution() {
        const n = this.pegLayers;
        const p = 0.5;
        const theoretical = [];
        
        for (let k = 0; k <= n; k++) {
            // 二项分布概率质量函数
            const prob = this.binomialPMF(n, k, p);
            theoretical.push(prob * this.ballCount);
        }
        
        return theoretical;
    }
    
    binomialPMF(n, k, p) {
        return this.combination(n, k) * Math.pow(p, k) * Math.pow(1 - p, n - k);
    }
    
    combination(n, k) {
        if (k > n) return 0;
        if (k === 0 || k === n) return 1;
        
        let result = 1;
        for (let i = 0; i < k; i++) {
            result *= (n - i) / (i + 1);
        }
        return result;
    }
    
    createBall() {
        return {
            x: this.width / 2 + (Math.random() - 0.5) * 5, // 更小的初始随机偏移
            y: 20,
            vx: 0, // 初始水平速度为0
            vy: 0.5, // 很小的初始垂直速度
            radius: this.ballRadius,
            color: `hsl(${Math.random() * 360}, 70%, 60%)`,
            collected: false,
            binIndex: -1,
            justCollided: false // 添加碰撞冷却标记
        };
    }
    
    start() {
        if (this.isPaused) {
            this.isPaused = false;
        } else {
            this.reset();
            this.isRunning = true;
        }
        
        document.getElementById('startBtn').disabled = true;
        document.getElementById('pauseBtn').disabled = false;
        
        this.animate();
    }
    
    pause() {
        this.isPaused = true;
        document.getElementById('startBtn').disabled = false;
        document.getElementById('pauseBtn').disabled = true;
    }
    
    reset() {
        this.isRunning = false;
        this.isPaused = false;
        this.balls = [];
        this.binCounts.fill(0);
        this.droppedCount = 0;
        this.collectedCount = 0;
        
        document.getElementById('startBtn').disabled = false;
        document.getElementById('pauseBtn').disabled = true;
        
        this.updateStatistics();
        this.updateChart();
        this.draw();
    }
    
    animate() {
        if (!this.isRunning || this.isPaused) return;
        
        // 投放新球 - 动画速度只影响投放频率，不影响物理
        const dropProbability = Math.min(0.05 + (this.animationSpeed - 1) * 0.02, 0.25);
        if (this.droppedCount < this.ballCount && Math.random() < dropProbability) {
            this.balls.push(this.createBall());
            this.droppedCount++;
            document.getElementById('droppedCount').textContent = this.droppedCount;
        }
        
        // 更新球的物理状态
        this.updateBalls();
        
        // 绘制
        this.draw();
        
        // 继续动画
        if (this.droppedCount < this.ballCount || this.balls.length > 0) {
            requestAnimationFrame(() => this.animate());
        } else {
            this.isRunning = false;
            document.getElementById('startBtn').disabled = false;
            document.getElementById('pauseBtn').disabled = true;
        }
    }
    
    updateBalls() {
        for (let i = this.balls.length - 1; i >= 0; i--) {
            const ball = this.balls[i];
            
            if (ball.collected) continue;
            
            // 应用重力
            ball.vy += this.gravity;
            
            // 限制最大速度，避免小球过快
            const maxSpeed = 4;
            ball.vx = Math.max(-maxSpeed, Math.min(maxSpeed, ball.vx));
            ball.vy = Math.max(0, Math.min(maxSpeed, ball.vy));
            
            // 更新位置 - 限制动画速度对物理的影响
            const speedMultiplier = Math.min(this.animationSpeed * 0.3, 2.0); // 限制最大影响
            ball.x += ball.vx * speedMultiplier;
            ball.y += ball.vy * speedMultiplier;
            
            // 检查与钉子的碰撞
            this.checkPegCollisions(ball);
            
            // 检查是否进入收集槽
            this.checkBinCollection(ball, i);
            
            // 边界检查 - 简单反弹
            if (ball.x < ball.radius) {
                ball.x = ball.radius;
                ball.vx = Math.abs(ball.vx) * 0.5; // 向右反弹，减少速度
            } else if (ball.x > this.width - ball.radius) {
                ball.x = this.width - ball.radius;
                ball.vx = -Math.abs(ball.vx) * 0.5; // 向左反弹，减少速度
            }
            
            // 空气阻力 - 逐渐减少水平速度
            ball.vx *= 0.99;
        }
    }
    
    checkPegCollisions(ball) {
        for (const peg of this.pegs) {
            const dx = ball.x - peg.x;
            const dy = ball.y - peg.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // 增加碰撞检测范围，确保高速下不会穿越
            const collisionDistance = ball.radius + peg.radius + 3;
            
            if (distance < collisionDistance && !ball.justCollided) {
                // 确保小球在钉子下方才触发碰撞（避免从下往上的错误碰撞）
                if (ball.y >= peg.y - peg.radius) {
                    // 标记刚刚碰撞，避免重复碰撞
                    ball.justCollided = true;
                    
                    // 高尔顿板的核心逻辑：50%概率向左，50%概率向右
                    const goLeft = Math.random() < 0.5;
                    
                    // 设置新的水平速度方向（固定速度，不受动画速度影响）
                    const horizontalSpeed = 1.2;
                    ball.vx = goLeft ? -horizontalSpeed : horizontalSpeed;
                    
                    // 保持稳定的垂直速度
                    ball.vy = Math.max(ball.vy * 0.8, 0.8);
                    
                    // 调整位置避免卡在钉子里
                    const separation = ball.radius + peg.radius + 4;
                    if (goLeft) {
                        ball.x = peg.x - separation;
                    } else {
                        ball.x = peg.x + separation;
                    }
                    ball.y = peg.y + separation;
                    
                    // 设置碰撞冷却时间（根据动画速度调整）
                    const cooldownTime = Math.max(50, 150 - this.animationSpeed * 10);
                    setTimeout(() => {
                        ball.justCollided = false;
                    }, cooldownTime);
                    
                    break; // 每次只处理一个碰撞
                }
            }
        }
    }
    
    checkBinCollection(ball, ballIndex) {
        for (const bin of this.bins) {
            if (ball.x >= bin.x && ball.x <= bin.x + bin.width && 
                ball.y >= bin.y && !ball.collected) {
                
                ball.collected = true;
                ball.binIndex = bin.index;
                this.binCounts[bin.index]++;
                this.collectedCount++;
                
                document.getElementById('collectedCount').textContent = this.collectedCount;
                
                // 移除球
                this.balls.splice(ballIndex, 1);
                
                // 更新统计
                this.updateStatistics();
                this.updateChart();
                
                break;
            }
        }
    }
    
    updateStatistics() {
        if (this.collectedCount === 0) {
            this.statistics = { mean: 0, std: 0, skewness: 0, kurtosis: 0 };
            document.getElementById('meanValue').textContent = '--';
            document.getElementById('stdValue').textContent = '--';
            document.getElementById('detailMean').textContent = '--';
            document.getElementById('detailStd').textContent = '--';
            document.getElementById('detailSkewness').textContent = '--';
            document.getElementById('detailKurtosis').textContent = '--';
            return;
        }
        
        // 计算均值
        let sum = 0;
        for (let i = 0; i < this.binCounts.length; i++) {
            sum += i * this.binCounts[i];
        }
        this.statistics.mean = sum / this.collectedCount;
        
        // 计算标准差
        let variance = 0;
        for (let i = 0; i < this.binCounts.length; i++) {
            const diff = i - this.statistics.mean;
            variance += diff * diff * this.binCounts[i];
        }
        variance /= this.collectedCount;
        this.statistics.std = Math.sqrt(variance);
        
        // 计算偏度和峰度
        let skewness = 0;
        let kurtosis = 0;
        for (let i = 0; i < this.binCounts.length; i++) {
            const standardized = (i - this.statistics.mean) / this.statistics.std;
            skewness += Math.pow(standardized, 3) * this.binCounts[i];
            kurtosis += Math.pow(standardized, 4) * this.binCounts[i];
        }
        this.statistics.skewness = skewness / this.collectedCount;
        this.statistics.kurtosis = kurtosis / this.collectedCount - 3; // 超额峰度
        
        // 更新显示
        document.getElementById('meanValue').textContent = this.statistics.mean.toFixed(2);
        document.getElementById('stdValue').textContent = this.statistics.std.toFixed(2);
        document.getElementById('detailMean').textContent = this.statistics.mean.toFixed(3);
        document.getElementById('detailStd').textContent = this.statistics.std.toFixed(3);
        document.getElementById('detailSkewness').textContent = this.statistics.skewness.toFixed(3);
        document.getElementById('detailKurtosis').textContent = this.statistics.kurtosis.toFixed(3);
    }
    
    updateChart() {
        if (this.distributionChart) {
            this.distributionChart.data.datasets[0].data = [...this.binCounts];
            this.distributionChart.data.datasets[1].data = this.calculateTheoreticalDistribution();
            this.distributionChart.update('none');
        }
    }
    
    draw() {
        // 清空画布
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // 绘制背景
        this.drawBackground();
        
        // 绘制钉子
        this.drawPegs();
        
        // 绘制收集槽
        this.drawBins();
        
        // 绘制球
        this.drawBalls();
        
        // 绘制标题
        this.drawTitle();
    }
    
    drawBackground() {
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
        gradient.addColorStop(0, '#f8f9fa');
        gradient.addColorStop(1, '#e9ecef');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.width, this.height);
    }
    
    drawPegs() {
        this.ctx.fillStyle = '#6c757d';
        this.ctx.strokeStyle = '#495057';
        this.ctx.lineWidth = 1;
        
        for (const peg of this.pegs) {
            this.ctx.beginPath();
            this.ctx.arc(peg.x, peg.y, peg.radius, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();
        }
    }
    
    drawBins() {
        for (let i = 0; i < this.bins.length; i++) {
            const bin = this.bins[i];
            const count = this.binCounts[i];
            
            // 绘制槽边框
            this.ctx.strokeStyle = '#495057';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(bin.x, bin.y, bin.width, bin.height);
            
            // 绘制计数柱状图
            if (count > 0) {
                const maxCount = Math.max(...this.binCounts);
                const barHeight = (count / maxCount) * (bin.height - 10);
                
                const gradient = this.ctx.createLinearGradient(0, bin.y + bin.height, 0, bin.y + bin.height - barHeight);
                gradient.addColorStop(0, '#0d6efd');
                gradient.addColorStop(1, '#6610f2');
                
                this.ctx.fillStyle = gradient;
                this.ctx.fillRect(bin.x + 2, bin.y + bin.height - barHeight - 2, bin.width - 4, barHeight);
            }
            
            // 绘制计数文本
            this.ctx.fillStyle = '#212529';
            this.ctx.font = '12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(count.toString(), bin.x + bin.width / 2, bin.y + bin.height + 15);
        }
    }
    
    drawBalls() {
        for (const ball of this.balls) {
            if (ball.collected) continue;
            
            this.ctx.fillStyle = ball.color;
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 1;
            
            this.ctx.beginPath();
            this.ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();
        }
    }
    
    drawTitle() {
        this.ctx.fillStyle = '#212529';
        this.ctx.font = 'bold 16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('高尔顿板模拟器', this.width / 2, 30);
        
        this.ctx.font = '12px Arial';
        this.ctx.fillText(`钉子层数: ${this.pegLayers} | 小球总数: ${this.ballCount}`, this.width / 2, 50);
    }
}

// 初始化模拟器
document.addEventListener('DOMContentLoaded', function() {
    const galtonBoard = new GaltonBoard();
});