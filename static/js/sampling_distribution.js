class SamplingDistributionSimulator {
    constructor() {
        this.populationCanvas = document.getElementById('populationCanvas');
        this.sampleCanvas = document.getElementById('sampleCanvas');
        this.samplingChart = null;
        
        this.populationCtx = this.populationCanvas.getContext('2d');
        this.sampleCtx = this.sampleCanvas.getContext('2d');
        
        // 模拟参数
        this.populationDistribution = 'normal';
        this.param1 = 5.0; // 均值或其他参数
        this.param2 = 1.5; // 标准差或其他参数
        this.sampleSize = 30;
        this.numSamples = 100;
        this.animationSpeed = 5;
        
        // 模拟状态
        this.isRunning = false;
        this.isPaused = false;
        this.completedSamples = 0;
        this.sampleMeans = [];
        this.currentSample = [];
        this.animationFrame = null;
        
        // 总体数据
        this.populationData = [];
        this.generatePopulationData();
        
        this.initializeEventListeners();
        this.initializeChart();
        this.updateDisplay();
    }
    
    initializeEventListeners() {
        // 分布类型选择
        document.getElementById('populationDistribution').addEventListener('change', (e) => {
            this.populationDistribution = e.target.value;
            this.updateDistributionParams();
            this.generatePopulationData();
            this.updateDisplay();
        });
        
        // 参数滑块
        document.getElementById('param1').addEventListener('input', (e) => {
            this.param1 = parseFloat(e.target.value);
            document.getElementById('param1Value').textContent = this.param1.toFixed(1);
            this.generatePopulationData();
            this.updateDisplay();
        });
        
        document.getElementById('param2').addEventListener('input', (e) => {
            this.param2 = parseFloat(e.target.value);
            document.getElementById('param2Value').textContent = this.param2.toFixed(1);
            this.generatePopulationData();
            this.updateDisplay();
        });
        
        // 抽样参数
        document.getElementById('sampleSize').addEventListener('input', (e) => {
            this.sampleSize = parseInt(e.target.value);
            document.getElementById('sampleSizeValue').textContent = this.sampleSize;
            document.getElementById('currentSampleInfo').textContent = `(n=${this.sampleSize})`;
            this.updateTheoreticalValues();
        });
        
        document.getElementById('numSamples').addEventListener('input', (e) => {
            this.numSamples = parseInt(e.target.value);
            document.getElementById('numSamplesValue').textContent = this.numSamples;
        });
        
        document.getElementById('animationSpeed').addEventListener('input', (e) => {
            this.animationSpeed = parseInt(e.target.value);
            document.getElementById('animationSpeedValue').textContent = this.animationSpeed;
        });
        
        // 控制按钮
        document.getElementById('startBtn').addEventListener('click', () => this.startSimulation());
        document.getElementById('pauseBtn').addEventListener('click', () => this.pauseSimulation());
        document.getElementById('resetBtn').addEventListener('click', () => this.resetSimulation());
    }
    
    updateDistributionParams() {
        const param1Label = document.getElementById('param1Label');
        const param2Label = document.getElementById('param2Label');
        const param1Slider = document.getElementById('param1');
        const param2Slider = document.getElementById('param2');
        
        switch(this.populationDistribution) {
            case 'normal':
                param1Label.textContent = '均值 (μ)';
                param2Label.textContent = '标准差 (σ)';
                param1Slider.min = 0; param1Slider.max = 10; param1Slider.value = 5;
                param2Slider.min = 0.5; param2Slider.max = 5; param2Slider.value = 1.5;
                this.param1 = 5; this.param2 = 1.5;
                break;
            case 'uniform':
                param1Label.textContent = '最小值 (a)';
                param2Label.textContent = '最大值 (b)';
                param1Slider.min = 0; param1Slider.max = 5; param1Slider.value = 0;
                param2Slider.min = 5; param2Slider.max = 15; param2Slider.value = 10;
                this.param1 = 0; this.param2 = 10;
                break;
            case 'exponential':
                param1Label.textContent = '率参数 (λ)';
                param2Label.textContent = '偏移量';
                param1Slider.min = 0.1; param1Slider.max = 3; param1Slider.value = 1;
                param2Slider.min = 0; param2Slider.max = 5; param2Slider.value = 0;
                this.param1 = 1; this.param2 = 0;
                break;
            case 'bimodal':
                param1Label.textContent = '峰间距离';
                param2Label.textContent = '标准差';
                param1Slider.min = 1; param1Slider.max = 8; param1Slider.value = 4;
                param2Slider.min = 0.5; param2Slider.max = 3; param2Slider.value = 1;
                this.param1 = 4; this.param2 = 1;
                break;
        }
        
        document.getElementById('param1Value').textContent = this.param1.toFixed(1);
        document.getElementById('param2Value').textContent = this.param2.toFixed(1);
    }
    
    generatePopulationData() {
        this.populationData = [];
        const size = 10000;
        
        for (let i = 0; i < size; i++) {
            let value;
            switch(this.populationDistribution) {
                case 'normal':
                    value = this.normalRandom(this.param1, this.param2);
                    break;
                case 'uniform':
                    value = this.uniformRandom(this.param1, this.param2);
                    break;
                case 'exponential':
                    value = this.exponentialRandom(this.param1) + this.param2;
                    break;
                case 'bimodal':
                    value = Math.random() < 0.5 ? 
                        this.normalRandom(5 - this.param1/2, this.param2) : 
                        this.normalRandom(5 + this.param1/2, this.param2);
                    break;
            }
            this.populationData.push(value);
        }
    }
    
    normalRandom(mean, std) {
        // Box-Muller变换
        let u = 0, v = 0;
        while(u === 0) u = Math.random();
        while(v === 0) v = Math.random();
        return mean + std * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    }
    
    uniformRandom(min, max) {
        return min + Math.random() * (max - min);
    }
    
    exponentialRandom(lambda) {
        return -Math.log(1 - Math.random()) / lambda;
    }
    
    drawDistribution(ctx, data, title, color = '#007bff', showMean = false, meanValue = null) {
        const canvas = ctx.canvas;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 计算直方图
        const min = Math.min(...data);
        const max = Math.max(...data);
        const binCount = 30;
        const binWidth = (max - min) / binCount;
        const bins = new Array(binCount).fill(0);
        
        data.forEach(value => {
            const binIndex = Math.min(Math.floor((value - min) / binWidth), binCount - 1);
            bins[binIndex]++;
        });
        
        const maxBinCount = Math.max(...bins);
        
        // 绘制坐标轴
        const margin = 40;
        const chartWidth = canvas.width - 2 * margin;
        const chartHeight = canvas.height - 2 * margin;
        
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(margin, margin);
        ctx.lineTo(margin, margin + chartHeight);
        ctx.lineTo(margin + chartWidth, margin + chartHeight);
        ctx.stroke();
        
        // 绘制直方图
        ctx.fillStyle = color;
        for (let i = 0; i < binCount; i++) {
            const x = margin + (i / binCount) * chartWidth;
            const height = (bins[i] / maxBinCount) * chartHeight;
            const y = margin + chartHeight - height;
            const width = chartWidth / binCount * 0.8;
            
            ctx.fillRect(x, y, width, height);
        }
        
        // 绘制均值线
        if (showMean && meanValue !== null) {
            const meanX = margin + ((meanValue - min) / (max - min)) * chartWidth;
            ctx.strokeStyle = '#ff4444';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(meanX, margin);
            ctx.lineTo(meanX, margin + chartHeight);
            ctx.stroke();
            ctx.setLineDash([]);
        }
        
        // 绘制标题和统计信息
        ctx.fillStyle = '#333';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(title, canvas.width / 2, 20);
        
        if (data.length > 0) {
            const mean = data.reduce((a, b) => a + b, 0) / data.length;
            const variance = data.reduce((a, b) => a + (b - mean) ** 2, 0) / data.length;
            const std = Math.sqrt(variance);
            
            ctx.font = '10px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(`均值: ${mean.toFixed(2)}`, margin, canvas.height - 5);
            ctx.fillText(`标准差: ${std.toFixed(2)}`, margin + 100, canvas.height - 5);
        }
    }
    
    initializeChart() {
        const ctx = document.getElementById('samplingDistributionChart').getContext('2d');
        
        this.samplingChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: '样本均值频数',
                    data: [],
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }, {
                    label: '理论正态分布',
                    data: [],
                    type: 'line',
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 2,
                    fill: false,
                    pointRadius: 0
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
                            text: '样本均值'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true
                    },
                    title: {
                        display: true,
                        text: '样本均值的抽样分布'
                    }
                }
            }
        });
    }
    
    updateChart() {
        if (this.sampleMeans.length === 0) return;
        
        // 计算直方图数据
        const min = Math.min(...this.sampleMeans);
        const max = Math.max(...this.sampleMeans);
        const binCount = 20;
        const binWidth = (max - min) / binCount;
        const bins = new Array(binCount).fill(0);
        const labels = [];
        
        for (let i = 0; i < binCount; i++) {
            labels.push((min + i * binWidth + binWidth/2).toFixed(2));
        }
        
        this.sampleMeans.forEach(mean => {
            const binIndex = Math.min(Math.floor((mean - min) / binWidth), binCount - 1);
            bins[binIndex]++;
        });
        
        // 计算理论正态分布
        const theoreticalData = [];
        const populationMean = this.getPopulationMean();
        const populationStd = this.getPopulationStd();
        const theoreticalStd = populationStd / Math.sqrt(this.sampleSize);
        
        for (let i = 0; i < binCount; i++) {
            const x = min + i * binWidth + binWidth/2;
            const y = this.normalPDF(x, populationMean, theoreticalStd) * this.sampleMeans.length * binWidth;
            theoreticalData.push(y);
        }
        
        this.samplingChart.data.labels = labels;
        this.samplingChart.data.datasets[0].data = bins;
        this.samplingChart.data.datasets[1].data = theoreticalData;
        this.samplingChart.update('none');
    }
    
    normalPDF(x, mean, std) {
        return (1 / (std * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((x - mean) / std, 2));
    }
    
    getPopulationMean() {
        switch(this.populationDistribution) {
            case 'normal': return this.param1;
            case 'uniform': return (this.param1 + this.param2) / 2;
            case 'exponential': return 1/this.param1 + this.param2;
            case 'bimodal': return 5;
            default: return 5;
        }
    }
    
    getPopulationStd() {
        switch(this.populationDistribution) {
            case 'normal': return this.param2;
            case 'uniform': return Math.sqrt((this.param2 - this.param1) ** 2 / 12);
            case 'exponential': return 1/this.param1;
            case 'bimodal': return Math.sqrt(this.param2 ** 2 + (this.param1/2) ** 2);
            default: return 1.5;
        }
    }
    
    takeSample() {
        const sample = [];
        for (let i = 0; i < this.sampleSize; i++) {
            const randomIndex = Math.floor(Math.random() * this.populationData.length);
            sample.push(this.populationData[randomIndex]);
        }
        return sample;
    }
    
    startSimulation() {
        if (this.completedSamples >= this.numSamples) {
            this.resetSimulation();
        }
        
        this.isRunning = true;
        this.isPaused = false;
        
        document.getElementById('startBtn').disabled = true;
        document.getElementById('pauseBtn').disabled = false;
        
        this.runAnimation();
    }
    
    pauseSimulation() {
        this.isPaused = true;
        this.isRunning = false;
        
        document.getElementById('startBtn').disabled = false;
        document.getElementById('pauseBtn').disabled = true;
        
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
    }
    
    resetSimulation() {
        this.isRunning = false;
        this.isPaused = false;
        this.completedSamples = 0;
        this.sampleMeans = [];
        this.currentSample = [];
        
        document.getElementById('startBtn').disabled = false;
        document.getElementById('pauseBtn').disabled = true;
        
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        
        this.updateDisplay();
        this.updateChart();
    }
    
    runAnimation() {
        if (!this.isRunning || this.completedSamples >= this.numSamples) {
            this.isRunning = false;
            document.getElementById('startBtn').disabled = false;
            document.getElementById('pauseBtn').disabled = true;
            return;
        }
        
        // 抽取新样本
        this.currentSample = this.takeSample();
        const sampleMean = this.currentSample.reduce((a, b) => a + b, 0) / this.currentSample.length;
        this.sampleMeans.push(sampleMean);
        this.completedSamples++;
        
        // 更新显示
        this.updateDisplay();
        this.updateChart();
        
        // 继续动画
        const delay = Math.max(50, 500 - this.animationSpeed * 45);
        setTimeout(() => {
            this.animationFrame = requestAnimationFrame(() => this.runAnimation());
        }, delay);
    }
    
    updateDisplay() {
        // 绘制总体分布
        this.drawDistribution(this.populationCtx, this.populationData, '总体分布', '#007bff');
        
        // 绘制当前样本
        if (this.currentSample.length > 0) {
            const currentMean = this.currentSample.reduce((a, b) => a + b, 0) / this.currentSample.length;
            this.drawDistribution(this.sampleCtx, this.currentSample, `当前样本 (n=${this.sampleSize})`, '#28a745', true, currentMean);
            document.getElementById('currentMean').textContent = currentMean.toFixed(3);
        } else {
            this.sampleCtx.clearRect(0, 0, this.sampleCanvas.width, this.sampleCanvas.height);
            document.getElementById('currentMean').textContent = '--';
        }
        
        // 更新统计信息
        document.getElementById('completedSamples').textContent = this.completedSamples;
        
        if (this.sampleMeans.length > 0) {
            const samplingMean = this.sampleMeans.reduce((a, b) => a + b, 0) / this.sampleMeans.length;
            const samplingVariance = this.sampleMeans.reduce((a, b) => a + (b - samplingMean) ** 2, 0) / this.sampleMeans.length;
            const samplingStd = Math.sqrt(samplingVariance);
            
            document.getElementById('samplingMean').textContent = samplingMean.toFixed(3);
            document.getElementById('samplingStd').textContent = samplingStd.toFixed(3);
        } else {
            document.getElementById('samplingMean').textContent = '--';
            document.getElementById('samplingStd').textContent = '--';
        }
        
        this.updateTheoreticalValues();
    }
    
    updateTheoreticalValues() {
        const theoreticalMean = this.getPopulationMean();
        const theoreticalSE = this.getPopulationStd() / Math.sqrt(this.sampleSize);
        
        document.getElementById('theoreticalMean').textContent = theoreticalMean.toFixed(3);
        document.getElementById('theoreticalSE').textContent = theoreticalSE.toFixed(3);
        
        if (this.sampleMeans.length > 0) {
            const actualMean = this.sampleMeans.reduce((a, b) => a + b, 0) / this.sampleMeans.length;
            const actualVariance = this.sampleMeans.reduce((a, b) => a + (b - actualMean) ** 2, 0) / this.sampleMeans.length;
            const actualSE = Math.sqrt(actualVariance);
            
            document.getElementById('actualMean').textContent = actualMean.toFixed(3);
            document.getElementById('actualSE').textContent = actualSE.toFixed(3);
        } else {
            document.getElementById('actualMean').textContent = '--';
            document.getElementById('actualSE').textContent = '--';
        }
    }
}

// 初始化模拟器
document.addEventListener('DOMContentLoaded', function() {
    new SamplingDistributionSimulator();
});