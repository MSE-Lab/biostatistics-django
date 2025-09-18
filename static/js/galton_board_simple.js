// 简化版高尔顿板模拟器
class SimpleGaltonBoard {
    constructor() {
        this.canvas = document.getElementById('galtonCanvas');
        if (!this.canvas) {
            console.error('Canvas element not found');
            return;
        }
        
        this.ctx = this.canvas.getContext('2d');
        this.width = 600;
        this.height = 700;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        
        // 简化的参数
        this.ballCount = 100;
        this.pegLayers = 10;
        this.isRunning = false;
        this.balls = [];
        this.pegs = [];
        this.bins = [];
        this.binCounts = new Array(11).fill(0);
        
        this.init();
    }
    
    init() {
        console.log('Initializing Simple Galton Board...');
        this.setupControls();
        this.setupPegs();
        this.setupBins();
        this.setupChart();
        this.draw();
        console.log('Simple Galton Board initialized successfully');
    }
    
    setupControls() {
        const startBtn = document.getElementById('startBtn');
        const resetBtn = document.getElementById('resetBtn');
        
        if (startBtn) {
            startBtn.addEventListener('click', () => this.start());
        }
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.reset());
        }
        
        // 更新显示值
        const ballCountSlider = document.getElementById('ballCount');
        if (ballCountSlider) {
            ballCountSlider.addEventListener('input', (e) => {
                this.ballCount = parseInt(e.target.value);
                const display = document.getElementById('ballCountValue');
                if (display) display.textContent = this.ballCount;
            });
        }
    }
    
    setupPegs() {
        this.pegs = [];
        const startX = this.width / 2;
        const startY = 100;
        const layerHeight = 50;
        
        for (let layer = 0; layer < this.pegLayers; layer++) {
            const pegsInLayer = layer + 1;
            const spacing = 40;
            const layerY = startY + layer * layerHeight;
            
            for (let peg = 0; peg < pegsInLayer; peg++) {
                const pegX = startX - (pegsInLayer - 1) * spacing / 2 + peg * spacing;
                this.pegs.push({
                    x: pegX,
                    y: layerY,
                    radius: 4
                });
            }
        }
    }
    
    setupBins() {
        this.bins = [];
        const binCount = this.pegLayers + 1;
        const binWidth = 40;
        const startX = this.width / 2 - (binCount * binWidth) / 2;
        const startY = this.height - 100;
        
        for (let i = 0; i < binCount; i++) {
            this.bins.push({
                x: startX + i * binWidth,
                y: startY,
                width: binWidth,
                height: 80,
                index: i
            });
        }
    }
    
    setupChart() {
        const chartCanvas = document.getElementById('distributionChart');
        if (!chartCanvas) return;
        
        const ctx = chartCanvas.getContext('2d');
        
        // 简单的图表实现
        this.chart = {
            canvas: chartCanvas,
            ctx: ctx,
            update: () => {
                ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height);
                const maxCount = Math.max(...this.binCounts, 1);
                const barWidth = chartCanvas.width / this.binCounts.length;
                
                this.binCounts.forEach((count, i) => {
                    const barHeight = (count / maxCount) * (chartCanvas.height - 40);
                    ctx.fillStyle = '#0d6efd';
                    ctx.fillRect(i * barWidth, chartCanvas.height - barHeight - 20, barWidth - 2, barHeight);
                    
                    // 显示数值
                    ctx.fillStyle = '#000';
                    ctx.font = '12px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText(count.toString(), i * barWidth + barWidth/2, chartCanvas.height - 5);
                });
            }
        };
    }
    
    start() {
        console.log('Starting simulation...');
        this.isRunning = true;
        this.animate();
        
        const startBtn = document.getElementById('startBtn');
        if (startBtn) startBtn.disabled = true;
    }
    
    reset() {
        console.log('Resetting simulation...');
        this.isRunning = false;
        this.balls = [];
        this.binCounts.fill(0);
        this.draw();
        this.updateChart();
        
        const startBtn = document.getElementById('startBtn');
        if (startBtn) startBtn.disabled = false;
        
        // 重置统计显示
        const elements = ['droppedCount', 'collectedCount', 'meanValue', 'stdValue'];
        elements.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = id.includes('Count') ? '0' : '--';
        });
    }
    
    animate() {
        if (!this.isRunning) return;
        
        // 简化的动画逻辑
        if (this.balls.length < this.ballCount && Math.random() < 0.1) {
            this.balls.push({
                x: this.width / 2 + (Math.random() - 0.5) * 20,
                y: 50,
                vx: (Math.random() - 0.5) * 2,
                vy: 0,
                collected: false
            });
        }
        
        // 更新球的位置
        for (let i = this.balls.length - 1; i >= 0; i--) {
            const ball = this.balls[i];
            if (ball.collected) continue;
            
            ball.vy += 0.2; // 重力
            ball.x += ball.vx;
            ball.y += ball.vy;
            
            // 简单的碰撞检测
            for (const peg of this.pegs) {
                const dx = ball.x - peg.x;
                const dy = ball.y - peg.y;
                if (Math.sqrt(dx*dx + dy*dy) < 8) {
                    ball.vx = (Math.random() - 0.5) * 4;
                    ball.vy = Math.abs(ball.vy) * 0.8;
                }
            }
            
            // 检查是否进入收集槽
            for (const bin of this.bins) {
                if (ball.x >= bin.x && ball.x <= bin.x + bin.width && ball.y >= bin.y) {
                    ball.collected = true;
                    this.binCounts[bin.index]++;
                    this.balls.splice(i, 1);
                    this.updateStatistics();
                    break;
                }
            }
        }
        
        this.draw();
        
        if (this.isRunning) {
            requestAnimationFrame(() => this.animate());
        }
    }
    
    updateStatistics() {
        const total = this.binCounts.reduce((a, b) => a + b, 0);
        const collectedEl = document.getElementById('collectedCount');
        if (collectedEl) collectedEl.textContent = total;
        
        if (total > 0) {
            // 计算均值
            let sum = 0;
            for (let i = 0; i < this.binCounts.length; i++) {
                sum += i * this.binCounts[i];
            }
            const mean = sum / total;
            
            const meanEl = document.getElementById('meanValue');
            if (meanEl) meanEl.textContent = mean.toFixed(2);
        }
        
        this.updateChart();
    }
    
    updateChart() {
        if (this.chart) {
            this.chart.update();
        }
    }
    
    draw() {
        // 清空画布
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // 绘制背景
        this.ctx.fillStyle = '#f8f9fa';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // 绘制钉子
        this.ctx.fillStyle = '#6c757d';
        for (const peg of this.pegs) {
            this.ctx.beginPath();
            this.ctx.arc(peg.x, peg.y, peg.radius, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // 绘制收集槽
        this.ctx.strokeStyle = '#495057';
        this.ctx.lineWidth = 2;
        for (const bin of this.bins) {
            this.ctx.strokeRect(bin.x, bin.y, bin.width, bin.height);
            
            // 绘制计数
            const count = this.binCounts[bin.index];
            if (count > 0) {
                const maxCount = Math.max(...this.binCounts);
                const barHeight = (count / maxCount) * (bin.height - 10);
                this.ctx.fillStyle = '#0d6efd';
                this.ctx.fillRect(bin.x + 2, bin.y + bin.height - barHeight - 2, bin.width - 4, barHeight);
            }
        }
        
        // 绘制球
        this.ctx.fillStyle = '#dc3545';
        for (const ball of this.balls) {
            if (!ball.collected) {
                this.ctx.beginPath();
                this.ctx.arc(ball.x, ball.y, 3, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
        
        // 绘制标题
        this.ctx.fillStyle = '#212529';
        this.ctx.font = 'bold 16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('高尔顿板模拟器 (简化版)', this.width / 2, 30);
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing Galton Board...');
    try {
        const galtonBoard = new SimpleGaltonBoard();
        console.log('Galton Board created successfully');
    } catch (error) {
        console.error('Error creating Galton Board:', error);
    }
});